import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { FeedCard } from '../components/FeedCard'
import { useApp } from '../context/AppContext'
import type { Post } from '../types'
import './Feed.css'

function PostBackBar({ backTo, label }: { backTo?: string; label?: string }) {
  const nav = useNavigate()
  return (
    <header className="feed-tabs post-viewer-bar">
      <button
        type="button"
        className="back-link"
        onClick={() => (backTo ? nav(backTo) : nav(-1))}
      >
        ← Back
      </button>
      <span className="on">{label || 'Video'}</span>
    </header>
  )
}

function FeedStage({
  posts,
  empty,
  title,
  startId,
  backTo,
  headerLabel,
  profileOnly,
  onActiveChange,
}: {
  posts: Post[]
  empty?: ReactNode
  title: 'foryou' | 'following' | 'friends' | 'post'
  startId?: string | null
  backTo?: string
  headerLabel?: string
  /** Keep list order and scroll to startId (TikTok profile behavior) */
  profileOnly?: boolean
  onActiveChange?: (postId: string) => void
}) {
  const initialIndex = useMemo(() => {
    if (!startId) return 0
    const idx = posts.findIndex((p) => p.id === startId)
    return idx >= 0 ? idx : 0
  }, [posts, startId])

  const [active, setActive] = useState(initialIndex)
  // Start muted so browsers allow autoplay; user can unmute
  const [muted, setMuted] = useState(true)
  const scroller = useRef<HTMLDivElement>(null)

  const feed = useMemo(() => {
    if (profileOnly || !startId) return posts
    const idx = posts.findIndex((p) => p.id === startId)
    if (idx <= 0) return posts
    return [posts[idx], ...posts.slice(0, idx), ...posts.slice(idx + 1)]
  }, [posts, startId, profileOnly])

  useEffect(() => {
    const idx = profileOnly ? initialIndex : 0
    setActive(idx)
    const el = scroller.current
    if (!el) return
    const jump = () => {
      el.scrollTop = idx * el.clientHeight
    }
    jump()
    requestAnimationFrame(jump)
    window.setTimeout(jump, 40)
  }, [startId, title, initialIndex, profileOnly, feed.length])

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const onScroll = () => {
      const h = el.clientHeight || 1
      const i = Math.round(el.scrollTop / h)
      setActive(Math.max(0, Math.min(i, feed.length - 1)))
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [feed.length])

  useEffect(() => {
    const id = feed[active]?.id
    if (id) onActiveChange?.(id)
  }, [active, feed, onActiveChange])

  const go = (dir: -1 | 1) => {
    const next = Math.max(0, Math.min(active + dir, feed.length - 1))
    const el = scroller.current
    if (!el) return
    el.scrollTo({ top: next * el.clientHeight, behavior: 'smooth' })
    setActive(next)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const dir = e.key === 'ArrowDown' ? 1 : -1
        const el = scroller.current
        if (!el) return
        setActive((prev) => {
          const next = Math.max(0, Math.min(prev + dir, feed.length - 1))
          el.scrollTo({ top: next * el.clientHeight, behavior: 'smooth' })
          return next
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [feed.length])

  const tabs =
    title === 'foryou' ? (
      <>
        <Link to="/following" className="dim">
          Following
        </Link>
        <span className="on">For You</span>
        <Link to="/friends" className="dim">
          Friends
        </Link>
      </>
    ) : title === 'following' ? (
      <>
        <span className="on">Following</span>
        <Link to="/" className="dim">
          For You
        </Link>
        <Link to="/friends" className="dim">
          Friends
        </Link>
      </>
    ) : title === 'friends' ? (
      <>
        <Link to="/following" className="dim">
          Following
        </Link>
        <Link to="/" className="dim">
          For You
        </Link>
        <span className="on">Friends</span>
      </>
    ) : null

  return (
    <div className={`feed-page ${title}${profileOnly ? ' profile-mode' : ''}`}>
      {title !== 'post' && (
        <header className="feed-tabs">{tabs}</header>
      )}

      {title === 'post' && <PostBackBar backTo={backTo} label={headerLabel} />}

      {empty ? (
        <div className="feed-empty">{empty}</div>
      ) : feed.length === 0 ? (
        <div className="feed-empty">No videos here</div>
      ) : (
        <div className="feed-stage">
          <div className="feed-scroller" ref={scroller}>
            {feed.map((post, i) => (
              <FeedCard
                key={post.id}
                post={post}
                active={i === active}
                muted={muted}
                onToggleMute={() => setMuted((m) => !m)}
                onAutoplayBlocked={() => setMuted(true)}
              />
            ))}
          </div>

          <div className="feed-arrows desk-only">
            <button
              type="button"
              aria-label="Previous"
              disabled={active <= 0}
              onClick={() => go(-1)}
            >
              <ChevronUp size={22} />
            </button>
            <button
              type="button"
              aria-label="Next"
              disabled={active >= feed.length - 1}
              onClick={() => go(1)}
            >
              <ChevronDown size={22} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function ForYouPage() {
  const { forYouFeed, posts } = useApp()
  const [params] = useSearchParams()
  const focusId = params.get('p')
  // Prefer full posts list so deep links always find the video
  const list = focusId
    ? (() => {
        const hit = posts.find((p) => p.id === focusId)
        if (!hit) return forYouFeed
        return [hit, ...forYouFeed.filter((p) => p.id !== focusId)]
      })()
    : forYouFeed
  return <FeedStage posts={list} title="foryou" startId={focusId} />
}

export function FollowingPage() {
  const { followingFeed, currentUser } = useApp()

  if (!currentUser) {
    return (
      <FeedStage
        posts={[]}
        title="following"
        empty={
          <div className="feed-empty-cta">
            <p>Log in to see posts from people you follow.</p>
            <Link to="/auth?next=/following" className="cta">
              Log in
            </Link>
          </div>
        }
      />
    )
  }

  if (followingFeed.length === 0) {
    return (
      <FeedStage
        posts={[]}
        title="following"
        empty={
          <div className="feed-empty-cta">
            <p>Follow creators to fill this feed.</p>
            <Link to="/search" className="cta">
              Find people
            </Link>
          </div>
        }
      />
    )
  }

  return <FeedStage posts={followingFeed} title="following" />
}

export function FriendsFeedPage() {
  const { friendsFeed, friends, currentUser } = useApp()

  if (!currentUser) {
    return (
      <FeedStage
        posts={[]}
        title="friends"
        empty={
          <div className="feed-empty-cta">
            <p>Log in to see videos from friends.</p>
            <Link to="/auth?next=/friends" className="cta">
              Log in
            </Link>
          </div>
        }
      />
    )
  }

  if (friends.length === 0 || friendsFeed.length === 0) {
    return (
      <FeedStage
        posts={[]}
        title="friends"
        empty={
          <div className="feed-empty-cta">
            <p>
              {friends.length === 0
                ? 'Follow people and get followed back to unlock Friends videos.'
                : 'Your friends haven’t posted yet.'}
            </p>
            <Link to="/search" className="cta">
              Find people
            </Link>
          </div>
        }
      />
    )
  }

  return <FeedStage posts={friendsFeed} title="friends" />
}

type ProfileTab = 'videos' | 'reposts' | 'favorites' | 'liked'
type SortMode = 'latest' | 'popular' | 'oldest'

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

/** Full-screen viewer — from profile swipes only that profile tab's videos in grid order */
export function PostViewerPage() {
  const { postId, username } = useParams()
  const [params] = useSearchParams()
  const { posts, getUser, users, currentUser } = useApp()
  const nav = useNavigate()

  const tab = (params.get('tab') as ProfileTab) || 'videos'
  const sort = (params.get('sort') as SortMode) || 'latest'

  const post = posts.find((p) => p.id === postId)
  const profileUser = username
    ? users.find((u) => u.username === username)
    : undefined

  const fromProfile = Boolean(username && profileUser)

  const feed = useMemo(() => {
    if (!post) return []
    if (fromProfile && profileUser) {
      let source: Post[] = []
      if (tab === 'liked') {
        source = posts.filter((p) => p.likes.includes(profileUser.id))
      } else if (tab === 'favorites') {
        source = posts.filter((p) => profileUser.saved.includes(p.id))
      } else if (tab === 'reposts') {
        source = posts.filter((p) => profileUser.reposts.some((r) => r.postId === p.id))
      } else {
        source = posts.filter((p) => p.userId === profileUser.id)
      }
      return sortPosts(source, sort)
    }
    // Generic /post/:id — creator first, then For You mix
    const fromAuthor = posts
      .filter((p) => p.userId === post.userId)
      .sort((a, b) => b.createdAt - a.createdAt)
    const rest = posts.filter((p) => p.userId !== post.userId)
    return [...fromAuthor, ...rest]
  }, [posts, post, fromProfile, profileUser, tab, sort])

  if (!postId || !post) {
    return (
      <div className="feed-page">
        <div className="feed-empty">
          <div className="feed-empty-cta">
            <p>Video not found</p>
            <button type="button" className="cta" onClick={() => nav('/')}>
              Go home
            </button>
          </div>
        </div>
      </div>
    )
  }

  const author = getUser(post.userId)
  const backTo = profileUser
    ? currentUser?.id === profileUser.id
      ? '/profile'
      : `/u/${profileUser.username}`
    : author
      ? `/u/${author.username}`
      : '/'

  return (
    <div className="post-viewer">
      <FeedStage
        posts={feed}
        title="post"
        startId={post.id}
        profileOnly={fromProfile}
        backTo={backTo}
        headerLabel={profileUser ? `@${profileUser.username}` : 'Video'}
        onActiveChange={
          fromProfile && username
            ? (id) => {
                if (id === postId) return
                nav(`/u/${username}/video/${id}?tab=${tab}&sort=${sort}`, {
                  replace: true,
                })
              }
            : undefined
        }
      />
    </div>
  )
}
