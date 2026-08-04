import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  X,
  ChevronUp,
  ChevronDown,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Music2,
  MoreHorizontal,
  Link2,
  Code2,
  Volume2,
  VolumeX,
  Send,
  Lock,
  Globe,
  Users,
  Trash2,
  Settings2,
  AtSign,
  Smile,
} from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatCount, timeAgo, displayCommentCount, displaySaveCount, displayLikeCount, displayShareCount } from '../lib/utils'
import type { Post } from '../types'
import { VerifiedMark } from '../components/Badge'
import { ShareSheet } from '../components/ShareSheet'
import { RepostBanner } from '../components/RepostBanner'
import './ProfileVideo.css'

type ProfileTab = 'videos' | 'reposts' | 'favorites' | 'liked'
type SortMode = 'latest' | 'popular' | 'oldest'
type SideTab = 'comments' | 'creator'

function sortPosts(list: Post[], mode: SortMode) {
  const copy = [...list]
  if (mode === 'latest') return copy.sort((a, b) => b.createdAt - a.createdAt)
  if (mode === 'oldest') return copy.sort((a, b) => a.createdAt - b.createdAt)
  return copy.sort(
    (a, b) =>
      b.likes.length + b.comments.length * 2 + b.views * 0.01 -
      (a.likes.length + a.comments.length * 2 + a.views * 0.01),
  )
}

function formatDate(ts: number) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function captionParts(caption: string) {
  const parts = caption.split(/(#[\w]+)/g)
  return parts.map((part, i) =>
    part.startsWith('#') ? (
      <span key={i} className="pv-tag">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

export function ProfileVideoPage() {
  const { username, postId } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const {
    posts,
    users,
    currentUser,
    getUser,
    toggleLike,
    toggleSave,
    isSaved,
    addComment,
    bumpView,
    follow,
    unfollow,
    isFollowing,
    sharePost,
    showToast,
    deletePost,
    setPostPrivacy,
  } = useApp()

  const tab = (params.get('tab') as ProfileTab) || 'videos'
  const sort = (params.get('sort') as SortMode) || 'latest'

  const profileUser = users.find((u) => u.username === username)

  const feed = useMemo(() => {
    if (!profileUser) return []
    let source: Post[] = []
    if (tab === 'liked') source = posts.filter((p) => p.likes.includes(profileUser.id))
    else if (tab === 'favorites')
      source = posts.filter((p) => profileUser.saved.includes(p.id))
    else if (tab === 'reposts')
      source = posts.filter((p) => profileUser.reposts.some((r) => r.postId === p.id))
    else source = posts.filter((p) => p.userId === profileUser.id)
    return sortPosts(source, sort)
  }, [posts, profileUser, tab, sort])

  const index = Math.max(
    0,
    feed.findIndex((p) => p.id === postId),
  )
  const post = feed[index] || posts.find((p) => p.id === postId)
  const author = post ? getUser(post.userId) : undefined

  const [sideTab, setSideTab] = useState<SideTab>('comments')
  const [muted, setMuted] = useState(false)
  const [captionOpen, setCaptionOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [comment, setComment] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const viewed = useRef<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const backTo =
    profileUser && currentUser?.id === profileUser.id
      ? '/profile'
      : profileUser
        ? `/u/${profileUser.username}`
        : '/'

  const go = (dir: -1 | 1) => {
    const next = index + dir
    if (next < 0 || next >= feed.length || !username) return
    const p = feed[next]
    nav(`/u/${username}/video/${p.id}?tab=${tab}&sort=${sort}`, { replace: true })
  }

  const goRef = useRef(go)
  goRef.current = go
  const wheelLock = useRef(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') nav(backTo)
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        goRef.current(1)
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        goRef.current(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nav, backTo])

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      // Let the comments / creator sidebar scroll normally
      const target = e.target as HTMLElement | null
      if (target?.closest('.pv-side')) return

      const dy = e.deltaY
      if (Math.abs(dy) < 18) return
      e.preventDefault()
      if (wheelLock.current) return
      wheelLock.current = true
      goRef.current(dy > 0 ? 1 : -1)
      window.setTimeout(() => {
        wheelLock.current = false
      }, 450)
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => {
    const el = videoRef.current
    if (!el || !post) return
    let cancelled = false
    el.playsInline = true

    const play = async () => {
      el.muted = muted
      el.defaultMuted = muted
      if (muted) el.setAttribute('muted', '')
      else el.removeAttribute('muted')
      try {
        await el.play()
      } catch {
        if (!muted) {
          el.muted = true
          el.defaultMuted = true
          el.setAttribute('muted', '')
          try {
            await el.play()
            if (!cancelled) setMuted(true)
          } catch {
            /* ignore */
          }
        }
      }
    }

    void play()
    if (viewed.current !== post.id) {
      viewed.current = post.id
      bumpView(post.id)
    }
    return () => {
      cancelled = true
    }
  }, [post?.id, muted, bumpView, post])

  useEffect(() => {
    setSideTab('comments')
    setCaptionOpen(false)
    setComment('')
    setMenuOpen(false)
    setPrivacyOpen(false)
  }, [post?.id])

  useEffect(() => {
    if (!menuOpen && !privacyOpen) return
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
        setPrivacyOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen, privacyOpen])

  if (!post || !author || !profileUser) {
    return (
      <div className="pv-page">
        <div className="pv-missing">
          <p>Video not found</p>
          <button type="button" onClick={() => nav(backTo)}>
            Back
          </button>
        </div>
      </div>
    )
  }

  const liked = !!(currentUser && post.likes.includes(currentUser.id))
  const saved = isSaved(post.id)
  const saveCount = displaySaveCount(post, users)
  const commentCount = displayCommentCount(post)
  const likeCount = displayLikeCount(post)
  const shareCount = displayShareCount(post)
  const following = isFollowing(author.id)
  const isOwn = currentUser?.id === author.id
  const url = `${window.location.origin}/u/${author.username}/video/${post.id}`
  const creatorVideos = posts
    .filter((p) => p.userId === author.id)
    .sort((a, b) => b.createdAt - a.createdAt)

  const needAuth = () =>
    nav(`/auth?next=${encodeURIComponent(`/u/${username}/video/${post.id}?tab=${tab}&sort=${sort}`)}`)

  const submitComment = (e: FormEvent) => {
    e.preventDefault()
    if (!currentUser) {
      needAuth()
      return
    }
    if (!comment.trim()) return
    addComment(post.id, comment)
    setComment('')
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      sharePost(post.id)
      showToast('Link copied')
    } catch {
      showToast('Could not copy')
    }
  }

  return (
    <div className="pv-page">
      <button
        type="button"
        className="pv-close"
        aria-label="Close"
        onClick={() => nav(backTo)}
      >
        <X size={22} />
      </button>

      <div className="pv-stage">
        <div className="pv-player-col">
          <div className="pv-player">
            {post.type === 'video' ? (
              <video
                ref={videoRef}
                key={post.id}
                src={post.mediaUrl}
                poster={post.posterUrl}
                loop
                playsInline
                muted={muted}
                autoPlay
                onClick={() => {
                  const el = videoRef.current
                  if (!el) return
                  if (el.paused) el.play().catch(() => undefined)
                  else el.pause()
                }}
              />
            ) : (
              <img src={post.mediaUrl} alt="" />
            )}

            <div className="pv-player-tools">
              <button type="button" onClick={copyLink} aria-label="Copy link">
                <Link2 size={16} />
              </button>
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>
          </div>

          <div className="pv-arrows">
            <button
              type="button"
              aria-label="Previous"
              disabled={index <= 0}
              onClick={() => go(-1)}
            >
              <ChevronUp size={22} />
            </button>
            <button
              type="button"
              aria-label="Next"
              disabled={index >= feed.length - 1}
              onClick={() => go(1)}
            >
              <ChevronDown size={22} />
            </button>
          </div>
        </div>

        <aside className="pv-side">
          <header className="pv-author">
            <Link to={`/u/${author.username}`} className="pv-avatar">
              <img src={author.avatar} alt="" />
            </Link>
            <div className="pv-author-meta">
              <Link to={`/u/${author.username}`} className="pv-username">
                {author.username}
                <VerifiedMark badges={author.badges} />
              </Link>
              <p>
                {author.displayName} · {formatDate(post.createdAt)}
              </p>
            </div>
            {!isOwn && currentUser && (
              <button
                type="button"
                className={`pv-follow ${following ? 'on' : ''}`}
                onClick={() => (following ? unfollow(author.id) : follow(author.id))}
              >
                {following ? 'Following' : 'Follow'}
              </button>
            )}
            <div className="pv-more-wrap" ref={menuRef}>
              <button
                type="button"
                className="pv-more"
                aria-label="More"
                aria-expanded={menuOpen || privacyOpen}
                onClick={() => {
                  if (isOwn) {
                    setPrivacyOpen(false)
                    setMenuOpen((o) => !o)
                  } else {
                    setShareOpen(true)
                  }
                }}
              >
                <MoreHorizontal size={20} />
              </button>

              {isOwn && menuOpen && !privacyOpen && (
                <div className="pv-owner-menu" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false)
                      setPrivacyOpen(true)
                    }}
                  >
                    <Settings2 size={16} />
                    Privacy settings for the video
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="danger"
                    onClick={() => {
                      setMenuOpen(false)
                      if (!window.confirm('Delete this video? This cannot be undone.')) return
                      const res = deletePost(post.id)
                      if (!res.ok) {
                        showToast(res.error || 'Could not delete')
                        return
                      }
                      // Stay on profile feed if possible
                      const remaining = feed.filter((p) => p.id !== post.id)
                      if (remaining.length && username) {
                        nav(
                          `/u/${username}/video/${remaining[Math.min(index, remaining.length - 1)].id}?tab=${tab}&sort=${sort}`,
                          { replace: true },
                        )
                      } else {
                        nav(backTo, { replace: true })
                      }
                    }}
                  >
                    <Trash2 size={16} />
                    Delete video
                  </button>
                </div>
              )}

              {isOwn && privacyOpen && (
                <div className="pv-owner-menu" role="menu">
                  <p className="pv-menu-title">Who can watch this video</p>
                  {(
                    [
                      ['public', 'Everyone', Globe],
                      ['friends', 'Friends', Users],
                      ['private', 'Only you', Lock],
                    ] as const
                  ).map(([id, label, Icon]) => {
                    const on = (post.privacy || 'public') === id
                    return (
                      <button
                        key={id}
                        type="button"
                        role="menuitem"
                        className={on ? 'on' : ''}
                        onClick={() => {
                          setPostPrivacy(post.id, id)
                          setPrivacyOpen(false)
                        }}
                      >
                        <Icon size={16} />
                        {label}
                        {on && <span className="pv-check">✓</span>}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    className="pv-menu-back"
                    onClick={() => {
                      setPrivacyOpen(false)
                      setMenuOpen(true)
                    }}
                  >
                    ← Back
                  </button>
                </div>
              )}
            </div>
          </header>

          <RepostBanner postId={post.id} variant="panel" />

          <div className={`pv-caption ${captionOpen ? 'open' : ''}`}>
            <p>{captionParts(post.caption)}</p>
            {post.caption.length > 90 && (
              <button type="button" onClick={() => setCaptionOpen((o) => !o)}>
                {captionOpen ? 'less' : 'more'}
              </button>
            )}
          </div>

          <div className="pv-sound">
            <Music2 size={14} />
            <span>
              {post.soundName || `original sound - ${author.username}`}
              {post.views ? ` · ${formatCount(post.views)} views` : ''}
            </span>
          </div>

          <div className="pv-stats">
            <button
              type="button"
              className={liked ? 'liked' : ''}
              onClick={() => {
                const res = toggleLike(post.id)
                if (res.needAuth) needAuth()
              }}
            >
              <Heart size={18} fill={liked ? '#fe2c55' : 'none'} />
              {formatCount(likeCount)}
            </button>
            <button type="button" onClick={() => setSideTab('comments')}>
              <MessageCircle size={18} />
              {formatCount(commentCount)}
            </button>
            <button
              type="button"
              className={saved ? 'saved' : ''}
              onClick={() => {
                const res = toggleSave(post.id)
                if (res.needAuth) needAuth()
              }}
            >
              <Bookmark size={18} fill={saved ? '#fff' : 'none'} />
              {formatCount(saveCount)}
            </button>
            <button type="button" onClick={() => setShareOpen(true)}>
              <Share2 size={18} />
              {formatCount(shareCount)}
            </button>
          </div>

          <div className="pv-share-row">
            <button
              type="button"
              className="pv-share-icon teal"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `<blockquote cite="${url}">Vibe</blockquote>`,
                  )
                  showToast('Embed copied')
                } catch {
                  showToast('Could not copy')
                }
              }}
              aria-label="Embed"
            >
              <Code2 size={18} />
            </button>
            <button
              type="button"
              className="pv-share-icon pink"
              onClick={() => setShareOpen(true)}
              aria-label="Share"
            >
              <Send size={16} />
            </button>
            <button
              type="button"
              className="pv-share-icon green"
              onClick={() => {
                sharePost(post.id)
                window.open(
                  `https://wa.me/?text=${encodeURIComponent(url)}`,
                  '_blank',
                  'noopener',
                )
              }}
              aria-label="WhatsApp"
            >
              WA
            </button>
            <button
              type="button"
              className="pv-share-icon blue"
              onClick={() => {
                sharePost(post.id)
                window.open(
                  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
                  '_blank',
                  'noopener',
                )
              }}
              aria-label="Facebook"
            >
              f
            </button>
            <div className="pv-copy-bar">
              <span title={url}>{url}</span>
              <button type="button" onClick={copyLink}>
                Copy link
              </button>
            </div>
          </div>

          <div className="pv-tabs">
            <button
              type="button"
              className={sideTab === 'comments' ? 'on' : ''}
              onClick={() => setSideTab('comments')}
            >
              Comments ({formatCount(commentCount)})
            </button>
            <button
              type="button"
              className={sideTab === 'creator' ? 'on' : ''}
              onClick={() => setSideTab('creator')}
            >
              Creator videos
            </button>
          </div>

          {sideTab === 'comments' ? (
            <div className="pv-comments">
              {post.comments.length === 0 && (
                <p className="pv-empty">Be the first to comment</p>
              )}
              {post.comments.map((c) => {
                const u = getUser(c.userId)
                if (!u) return null
                const isCreator = u.id === author.id
                const isFriend =
                  !!currentUser &&
                  currentUser.following.includes(u.id) &&
                  currentUser.followers.includes(u.id)
                return (
                  <div key={c.id} className="pv-comment">
                    <Link to={`/u/${u.username}`}>
                      <img src={u.avatar} alt="" />
                    </Link>
                    <div className="pv-comment-body">
                      <div className="pv-comment-top">
                        <Link to={`/u/${u.username}`}>{u.username}</Link>
                        {isCreator && <em>Creator</em>}
                        {isFriend && !isCreator && <em className="friend">Friend</em>}
                      </div>
                      <p>{c.text}</p>
                      <div className="pv-comment-meta">
                        <span>{timeAgo(c.createdAt)}</span>
                        <button type="button">Reply</button>
                      </div>
                    </div>
                    <button type="button" className="pv-comment-like" aria-label="Like comment">
                      <Heart size={14} />
                      {c.likes.length > 0 && <span>{c.likes.length}</span>}
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="pv-creator-grid">
              {creatorVideos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`pv-creator-cell ${p.id === post.id ? 'on' : ''}`}
                  onClick={() =>
                    nav(`/u/${author.username}/video/${p.id}?tab=videos&sort=latest`, {
                      replace: true,
                    })
                  }
                >
                  {p.type === 'video' ? (
                    <video src={p.mediaUrl} muted playsInline poster={p.posterUrl} />
                  ) : (
                    <img src={p.mediaUrl} alt="" />
                  )}
                </button>
              ))}
            </div>
          )}

          <form className="pv-compose" onSubmit={submitComment}>
            {currentUser ? (
              <img src={currentUser.avatar} alt="" className="pv-compose-avatar" />
            ) : (
              <div className="pv-compose-avatar placeholder" />
            )}
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add comment..."
              maxLength={280}
            />
            <button type="button" className="pv-compose-icon" aria-label="Mention">
              <AtSign size={18} />
            </button>
            <button type="button" className="pv-compose-icon" aria-label="Emoji">
              <Smile size={18} />
            </button>
            <button
              type="submit"
              className="pv-send"
              disabled={!comment.trim()}
              aria-label="Post comment"
            >
              <Send size={16} />
            </button>
          </form>
        </aside>
      </div>

      {shareOpen && <ShareSheet post={post} onClose={() => setShareOpen(false)} />}
    </div>
  )
}
