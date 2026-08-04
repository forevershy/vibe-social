import { useEffect, useRef, useState } from 'react'
import {
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  Music2,
  Bookmark,
  Play,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
  formatCount,
  displayCommentCount,
  displaySaveCount,
  displayLikeCount,
  displayShareCount,
} from '../lib/utils'
import type { Post } from '../types'
import { VerifiedMark } from './Badge'
import { CommentSheet } from './CommentSheet'
import { ShareSheet } from './ShareSheet'
import { RepostBanner } from './RepostBanner'
import './FeedCard.css'

interface Props {
  post: Post
  active: boolean
  muted: boolean
  onToggleMute: () => void
  /** Called when browser blocks unmuted autoplay */
  onAutoplayBlocked?: () => void
}

async function tryPlay(
  el: HTMLVideoElement,
  preferMuted: boolean,
): Promise<{ ok: boolean; muted: boolean }> {
  el.playsInline = true
  el.setAttribute('playsinline', '')
  el.setAttribute('webkit-playsinline', '')
  // Prefer muted first so autoplay policies always allow playback
  const attempt = async (withMute: boolean) => {
    el.muted = withMute
    el.defaultMuted = withMute
    if (withMute) el.setAttribute('muted', '')
    else el.removeAttribute('muted')
    await el.play()
    return withMute
  }

  try {
    if (preferMuted) {
      await attempt(true)
      return { ok: true, muted: true }
    }
    try {
      await attempt(false)
      return { ok: true, muted: false }
    } catch {
      await attempt(true)
      return { ok: true, muted: true }
    }
  } catch {
    try {
      el.load()
      await attempt(true)
      return { ok: true, muted: true }
    } catch {
      return { ok: false, muted: true }
    }
  }
}

function SideActions({
  post,
  muted,
  onToggleMute,
  onOpenComments,
}: {
  post: Post
  muted: boolean
  onToggleMute: () => void
  onOpenComments: () => void
}) {
  const {
    getUser,
    currentUser,
    users,
    toggleLike,
    toggleSave,
    isSaved,
    follow,
    isFollowing,
  } = useApp()
  const nav = useNavigate()
  const author = getUser(post.userId)
  const [shareOpen, setShareOpen] = useState(false)

  if (!author) return null

  const liked = !!(currentUser && post.likes.includes(currentUser.id))
  const following = isFollowing(author.id)
  const saved = isSaved(post.id)
  const saveCount = displaySaveCount(post, users)
  const commentCount = displayCommentCount(post)
  const likeCount = displayLikeCount(post)
  const shareCount = displayShareCount(post)

  const needAuth = (path = '/') => {
    nav(`/auth?next=${encodeURIComponent(path)}`)
  }

  return (
    <div className="side-actions">
      <Link to={`/u/${author.username}`} className="avatar-btn" onClick={(e) => e.stopPropagation()}>
        <img src={author.avatar} alt="" />
        {currentUser && author.id !== currentUser.id && !following && (
          <button
            className="follow-plus"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              follow(author.id)
            }}
            aria-label="Follow"
          >
            +
          </button>
        )}
      </Link>

      <button
        className={`action ${liked ? 'liked' : ''}`}
        onClick={() => {
          const res = toggleLike(post.id)
          if (res.needAuth) needAuth(`/post/${post.id}`)
        }}
        aria-label="Like"
      >
        <span className="action-circle">
          <Heart size={26} fill={liked ? '#fe2c55' : 'none'} />
        </span>
        <span>{formatCount(likeCount)}</span>
      </button>

      <button className="action" onClick={onOpenComments} aria-label="Comments">
        <span className="action-circle">
          <MessageCircle size={26} />
        </span>
        <span>{formatCount(commentCount)}</span>
      </button>

      <button
        className={`action ${saved ? 'saved' : ''}`}
        onClick={() => {
          const res = toggleSave(post.id)
          if (res.needAuth) needAuth(`/post/${post.id}`)
        }}
        aria-label="Save"
      >
        <span className="action-circle">
          <Bookmark size={24} fill={saved ? '#fff' : 'none'} />
        </span>
        <span>{formatCount(saveCount)}</span>
      </button>

      <button className="action" onClick={() => setShareOpen(true)} aria-label="Share">
        <span className="action-circle">
          <Share2 size={24} />
        </span>
        <span>{formatCount(shareCount)}</span>
      </button>

      {shareOpen && <ShareSheet post={post} onClose={() => setShareOpen(false)} />}

      <button className="action mute" onClick={onToggleMute} aria-label="Mute">
        <span className="action-circle small">
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </span>
      </button>

      <div className="audio-disc" title={post.soundName}>
        <img src={author.avatar} alt="" />
      </div>
    </div>
  )
}

export function FeedCard({ post, active, muted, onToggleMute, onAutoplayBlocked }: Props) {
  const { getUser, currentUser, toggleLike, bumpView } = useApp()
  const author = getUser(post.userId)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [heartBurst, setHeartBurst] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showPlayBtn, setShowPlayBtn] = useState(false)
  const lastTap = useRef(0)
  const viewed = useRef(false)
  const tapTimer = useRef<number | null>(null)

  const liked = !!(currentUser && post.likes.includes(currentUser.id))

  useEffect(() => {
    if (!active || viewed.current) return
    viewed.current = true
    bumpView(post.id)
  }, [active, bumpView, post.id])

  useEffect(() => {
    const el = videoRef.current
    if (!el || post.type !== 'video') return
    let cancelled = false
    let retryTimer: number | null = null

    const playActive = async () => {
      if (cancelled || !active) return
      const result = await tryPlay(el, muted)
      if (cancelled) return
      if (result.ok) {
        if (result.muted && !muted) onAutoplayBlocked?.()
        else {
          el.muted = muted
          el.defaultMuted = muted
        }
        setShowPlayBtn(false)
      } else {
        setShowPlayBtn(true)
      }
    }

    const onError = () => {
      if (cancelled || !active) return
      setShowPlayBtn(true)
      // One delayed retry in case of transient network failure
      if (retryTimer == null) {
        retryTimer = window.setTimeout(() => {
          retryTimer = null
          try {
            el.load()
          } catch {
            /* ignore */
          }
          void playActive()
        }, 600)
      }
    }

    if (!active) {
      el.pause()
      try {
        el.currentTime = 0
      } catch {
        /* ignore seek errors */
      }
      setProgress(0)
      setShowPlayBtn(false)
      return () => {
        cancelled = true
        if (retryTimer != null) window.clearTimeout(retryTimer)
      }
    }

    el.muted = muted
    el.defaultMuted = muted
    if (muted) el.setAttribute('muted', '')
    else el.removeAttribute('muted')

    el.addEventListener('error', onError)

    if (el.readyState >= 2) {
      void playActive()
    } else {
      const onReady = () => {
        void playActive()
      }
      el.addEventListener('canplay', onReady)
      el.addEventListener('loadeddata', onReady)
      try {
        el.load()
      } catch {
        /* ignore */
      }
      return () => {
        cancelled = true
        if (retryTimer != null) window.clearTimeout(retryTimer)
        el.removeEventListener('canplay', onReady)
        el.removeEventListener('loadeddata', onReady)
        el.removeEventListener('error', onError)
      }
    }

    return () => {
      cancelled = true
      if (retryTimer != null) window.clearTimeout(retryTimer)
      el.removeEventListener('error', onError)
    }
  }, [active, muted, post.type, post.mediaUrl, onAutoplayBlocked])

  useEffect(() => {
    const el = videoRef.current
    if (!el || post.type !== 'video') return
    const onTime = () => {
      if (!el.duration || !Number.isFinite(el.duration)) return
      setProgress((el.currentTime / el.duration) * 100)
    }
    const onPause = () => {
      if (active) setShowPlayBtn(true)
    }
    const onPlay = () => setShowPlayBtn(false)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('pause', onPause)
    el.addEventListener('play', onPlay)
    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('play', onPlay)
    }
  }, [post.type, post.mediaUrl, active])

  const resumePlayback = () => {
    const el = videoRef.current
    if (!el) return
    void tryPlay(el, muted).then((result) => {
      if (result.ok) {
        if (result.muted && !muted) onAutoplayBlocked?.()
        else el.muted = muted
        setShowPlayBtn(false)
      } else {
        setShowPlayBtn(true)
      }
    })
  }

  const onMediaTap = () => {
    const now = Date.now()
    const el = videoRef.current

    if (now - lastTap.current < 280) {
      if (tapTimer.current) {
        window.clearTimeout(tapTimer.current)
        tapTimer.current = null
      }
      if (currentUser && !liked) toggleLike(post.id)
      setHeartBurst(true)
      window.setTimeout(() => setHeartBurst(false), 700)
      lastTap.current = 0
      return
    }
    lastTap.current = now

    if (post.type === 'video' && el) {
      tapTimer.current = window.setTimeout(() => {
        tapTimer.current = null
        if (el.paused) resumePlayback()
        else {
          el.pause()
          setShowPlayBtn(true)
        }
      }, 260)
    }
  }

  if (!author) return null

  const isFriend =
    !!currentUser &&
    currentUser.following.includes(author.id) &&
    currentUser.followers.includes(author.id)

  return (
    <article className="feed-card" data-post-id={post.id}>
      <div className="feed-card-inner">
        <div className="media-frame">
          <div className="media-wrap" onClick={onMediaTap}>
            {post.type === 'video' ? (
              <video
                ref={videoRef}
                className="media"
                src={post.mediaUrl}
                poster={post.posterUrl}
                loop
                playsInline
                muted={muted}
                autoPlay={active}
                preload={active ? 'auto' : 'metadata'}
              />
            ) : (
              <img className="media" src={post.mediaUrl} alt="" />
            )}
            <div className="media-gradient" />
            {heartBurst && <Heart className="heart-burst" fill="#fe2c55" color="#fe2c55" />}
            {post.type === 'video' && showPlayBtn && active && (
              <button
                type="button"
                className="play-overlay"
                aria-label="Play"
                onClick={(e) => {
                  e.stopPropagation()
                  resumePlayback()
                }}
              >
                <Play size={40} fill="#fff" />
              </button>
            )}
          </div>

          <div className="meta">
            <RepostBanner postId={post.id} variant="feed" />
            <Link to={`/u/${author.username}`} className="author">
              @{author.username}
              <VerifiedMark badges={author.badges} />
              {isFriend && <em className="friend-tag">Friends</em>}
            </Link>
            <p className="caption">{post.caption}</p>
            <div className="sound">
              <Music2 size={14} />
              <span className="sound-marquee">{post.soundName}</span>
            </div>
          </div>

          {post.type === 'video' && (
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          )}

          <div className="mobile-actions">
            <SideActions
              post={post}
              muted={muted}
              onToggleMute={onToggleMute}
              onOpenComments={() => setCommentsOpen(true)}
            />
          </div>
        </div>

        <div className="desktop-actions">
          <SideActions
            post={post}
            muted={muted}
            onToggleMute={onToggleMute}
            onOpenComments={() => setCommentsOpen(true)}
          />
        </div>
      </div>

      {commentsOpen && (
        <CommentSheet post={post} onClose={() => setCommentsOpen(false)} />
      )}
    </article>
  )
}
