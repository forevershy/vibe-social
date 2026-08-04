import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Shield, Search as SearchIcon, Check, Minus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  BADGES,
  OWNER_GRANTABLE,
  SELF_EDITABLE_BADGES,
  formatCount,
  displayCommentCount,
  displaySaveCount,
  displayLikeCount,
  displayShareCount,
} from '../lib/utils'
import type { BadgeId } from '../types'
import { BadgeEmoji } from '../components/Badge'
import './Owner.css'

function parseCount(raw: string): number | null {
  const cleaned = raw.trim().replace(/,/g, '').toLowerCase()
  if (!cleaned) return null
  const m = cleaned.match(/^(\d+(?:\.\d+)?)([kmb])?$/)
  if (!m) {
    const n = Number(cleaned)
    return Number.isFinite(n) ? Math.floor(n) : null
  }
  const base = Number(m[1])
  const mult = m[2] === 'k' ? 1_000 : m[2] === 'm' ? 1_000_000 : m[2] === 'b' ? 1_000_000_000 : 1
  return Math.floor(base * mult)
}

export function OwnerPage() {
  const {
    currentUser,
    isOwner,
    users,
    posts,
    awardBadge,
    revokeBadge,
    setOwnerStats,
    setPostCounts,
    getUser,
  } = useApp()
  const [q, setQ] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [followersIn, setFollowersIn] = useState('')
  const [likesIn, setLikesIn] = useState('')
  const [viewsIn, setViewsIn] = useState('')
  const [videoId, setVideoId] = useState('')
  const [commentsIn, setCommentsIn] = useState('')
  const [savesIn, setSavesIn] = useState('')
  const [videoLikesIn, setVideoLikesIn] = useState('')
  const [repostsIn, setRepostsIn] = useState('')
  const [videoViewsIn, setVideoViewsIn] = useState('')
  const [videoScope, setVideoScope] = useState<'one' | 'mine' | 'all'>('one')

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return users
      .filter((u) => !u.isOwner && u.username !== 'shy')
      .filter(
        (u) =>
          !query ||
          u.username.includes(query) ||
          u.displayName.toLowerCase().includes(query),
      )
      .sort((a, b) => a.username.localeCompare(b.username))
  }, [users, q])

  const selected = users.find((u) => u.id === selectedId) || filtered[0] || null

  const myPosts = useMemo(
    () => (currentUser ? posts.filter((p) => p.userId === currentUser.id) : []),
    [posts, currentUser],
  )
  const myRealLikes = myPosts.reduce((a, p) => a + p.likes.length, 0)
  const myViewsSample = myPosts[0]?.views ?? 0

  const videoOptions = useMemo(
    () => [...posts].sort((a, b) => b.createdAt - a.createdAt),
    [posts],
  )
  const selectedVideo =
    videoOptions.find((p) => p.id === videoId) || videoOptions[0] || null

  if (!currentUser) return <Navigate to="/auth" replace />
  if (!isOwner) {
    return (
      <div className="owner-page locked">
        <Shield size={36} />
        <h2>Owner only</h2>
        <p>Log in as shy to manage badges and stats.</p>
        <Link to="/profile">Back to profile</Link>
      </div>
    )
  }

  const flash = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 1800)
  }

  const toggle = (userId: string, badge: BadgeId, has: boolean) => {
    const res = has ? revokeBadge(userId, badge) : awardBadge(userId, badge)
    if (!res.ok) flash(res.error || 'Failed')
    else flash(has ? `Removed ${BADGES[badge].label}` : `Gave ${BADGES[badge].label}`)
  }

  const applyMyStats = () => {
    const followers = parseCount(followersIn)
    const likes = parseCount(likesIn)
    const views = parseCount(viewsIn)
    if (followers === null && likes === null && views === null) {
      flash('Enter at least one number')
      return
    }
    const res = setOwnerStats({
      userId: currentUser.id,
      ...(followers !== null ? { followers } : {}),
      ...(likes !== null ? { likes } : {}),
      ...(views !== null ? { views } : {}),
    })
    if (!res.ok) flash(res.error || 'Failed')
    else {
      flash('Your stats updated')
      setFollowersIn('')
      setLikesIn('')
      setViewsIn('')
    }
  }

  const applySelectedStats = () => {
    if (!selected) return
    const followers = parseCount(followersIn)
    const likes = parseCount(likesIn)
    const views = parseCount(viewsIn)
    if (followers === null && likes === null && views === null) {
      flash('Enter at least one number')
      return
    }
    const res = setOwnerStats({
      userId: selected.id,
      ...(followers !== null ? { followers } : {}),
      ...(likes !== null ? { likes } : {}),
      ...(views !== null ? { views } : {}),
    })
    if (!res.ok) flash(res.error || 'Failed')
    else flash(`Updated @${selected.username}`)
  }

  const applyVideoCounts = () => {
    const comments = parseCount(commentsIn)
    const saves = parseCount(savesIn)
    const likes = parseCount(videoLikesIn)
    const shares = parseCount(repostsIn)
    const views = parseCount(videoViewsIn)
    if (
      comments === null &&
      saves === null &&
      likes === null &&
      shares === null &&
      views === null
    ) {
      flash('Enter at least one video count')
      return
    }
    const payload = {
      ...(comments !== null ? { comments } : {}),
      ...(saves !== null ? { saves } : {}),
      ...(likes !== null ? { likes } : {}),
      ...(shares !== null ? { shares } : {}),
      ...(views !== null ? { views } : {}),
    }
    let res
    if (videoScope === 'all') {
      res = setPostCounts({ all: true, ...payload })
    } else if (videoScope === 'mine') {
      res = setPostCounts({ userId: currentUser.id, ...payload })
    } else {
      const id = selectedVideo?.id
      if (!id) {
        flash('No video selected')
        return
      }
      res = setPostCounts({ postId: id, ...payload })
    }
    if (!res.ok) flash(res.error || 'Failed')
    else {
      flash('Video counts updated')
      setCommentsIn('')
      setSavesIn('')
      setVideoLikesIn('')
      setRepostsIn('')
      setVideoViewsIn('')
    }
  }

  return (
    <div className="owner-page">
      <header>
        <div>
          <p className="eyebrow">Owner panel</p>
          <h1>Control center</h1>
        </div>
        <Link to="/profile" className="back">
          Profile
        </Link>
      </header>

      <p className="owner-blurb">
        Signed in as <strong>@{currentUser.username}</strong>. Set your profile counts, or grant badges
        to others.
      </p>

      <section className="owner-stats-card">
        <div className="owner-stats-head">
          <h2>My stats</h2>
          <p>
            Current · Followers{' '}
            <strong>
              {formatCount(currentUser.statsOverride?.followers ?? currentUser.followers.length)}
            </strong>
            {' · '}
            Likes <strong>{formatCount(currentUser.statsOverride?.likes ?? myRealLikes)}</strong>
            {' · '}
            Views/video <strong>{formatCount(myViewsSample)}</strong>
          </p>
        </div>

        <div className="owner-stats-grid">
          <label>
            Followers
            <input
              inputMode="decimal"
              placeholder="e.g. 1250000 or 1.25m"
              value={followersIn}
              onChange={(e) => setFollowersIn(e.target.value)}
            />
          </label>
          <label>
            Likes
            <input
              inputMode="decimal"
              placeholder="e.g. 9800000 or 9.8m"
              value={likesIn}
              onChange={(e) => setLikesIn(e.target.value)}
            />
          </label>
          <label>
            Views (all my videos)
            <input
              inputMode="decimal"
              placeholder="e.g. 50000000 or 50m"
              value={viewsIn}
              onChange={(e) => setViewsIn(e.target.value)}
            />
          </label>
        </div>

        <div className="owner-stats-actions">
          <button type="button" className="owner-apply" onClick={applyMyStats}>
            Apply to my profile
          </button>
          {selected && (
            <button type="button" className="owner-apply ghost" onClick={applySelectedStats}>
              Apply to @{selected.username}
            </button>
          )}
        </div>
        <p className="owner-stats-hint">
          Leave a field blank to keep it. Supports plain numbers or shortcuts like 12k, 1.5m, 2b.
          Views updates every video on that account.
        </p>
      </section>

      <section className="owner-stats-card">
        <div className="owner-stats-head">
          <h2>My badges</h2>
          <p>Toggle badges on your profile — including the crown 👑. Owner access stays even if the crown is off.</p>
        </div>
        <div className="badge-controls">
          {SELF_EDITABLE_BADGES.map((id) => {
            const has = currentUser.badges.includes(id)
            const badge = BADGES[id]
            return (
              <div key={id} className={`badge-control ${has ? 'has' : ''}`}>
                <div>
                  <strong style={{ color: badge.color }}>
                    <span className="badge-control-emoji" aria-hidden>
                      <BadgeEmoji id={id} size="md" />
                    </span>{' '}
                    {badge.label}
                  </strong>
                  <p>{badge.description}</p>
                </div>
                <button
                  type="button"
                  className={has ? 'revoke' : 'grant'}
                  onClick={() => toggle(currentUser.id, id, has)}
                >
                  {has ? (
                    <>
                      <Minus size={14} /> Remove
                    </>
                  ) : (
                    <>
                      <Check size={14} /> Add
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </section>

      <section className="owner-stats-card">
        <div className="owner-stats-head">
          <h2>Video counts</h2>
          <p>
            Set comments, likes, favorites, and reposts — they show on the video side actions.
            {selectedVideo && videoScope === 'one' && (
              <>
                {' '}
                Selected · Likes{' '}
                <strong>{formatCount(displayLikeCount(selectedVideo))}</strong>
                {' · '}
                Comments <strong>{formatCount(displayCommentCount(selectedVideo))}</strong>
                {' · '}
                Favorites <strong>{formatCount(displaySaveCount(selectedVideo, users))}</strong>
                {' · '}
                Reposts <strong>{formatCount(displayShareCount(selectedVideo))}</strong>
              </>
            )}
          </p>
        </div>

        <div className="owner-scope-row" role="group" aria-label="Apply to">
          {(
            [
              ['one', 'One video'],
              ['mine', 'My videos'],
              ['all', 'All videos'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={videoScope === id ? 'on' : ''}
              onClick={() => setVideoScope(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {videoScope === 'one' && (
          <label className="owner-video-pick">
            Video
            <select
              value={selectedVideo?.id || ''}
              onChange={(e) => setVideoId(e.target.value)}
            >
              {videoOptions.map((p) => {
                const author = getUser(p.userId)
                const preview = p.caption.slice(0, 42) || 'Untitled'
                return (
                  <option key={p.id} value={p.id}>
                    @{author?.username || '?'} · {preview}
                    {p.caption.length > 42 ? '…' : ''}
                  </option>
                )
              })}
            </select>
          </label>
        )}

        <div className="owner-stats-grid owner-stats-grid-5">
          <label>
            Comments
            <input
              inputMode="decimal"
              placeholder="e.g. 12800 or 12.8k"
              value={commentsIn}
              onChange={(e) => setCommentsIn(e.target.value)}
            />
          </label>
          <label>
            Likes
            <input
              inputMode="decimal"
              placeholder="e.g. 1.2m"
              value={videoLikesIn}
              onChange={(e) => setVideoLikesIn(e.target.value)}
            />
          </label>
          <label>
            Favorites
            <input
              inputMode="decimal"
              placeholder="e.g. 5400 or 5.4k"
              value={savesIn}
              onChange={(e) => setSavesIn(e.target.value)}
            />
          </label>
          <label>
            Reposts
            <input
              inputMode="decimal"
              placeholder="e.g. 890"
              value={repostsIn}
              onChange={(e) => setRepostsIn(e.target.value)}
            />
          </label>
          <label>
            Views
            <input
              inputMode="decimal"
              placeholder="optional"
              value={videoViewsIn}
              onChange={(e) => setVideoViewsIn(e.target.value)}
            />
          </label>
        </div>

        <div className="owner-stats-actions">
          <button type="button" className="owner-apply" onClick={applyVideoCounts}>
            Apply video counts
          </button>
        </div>
        <p className="owner-stats-hint">
          These are display counts on the video (like TikTok). Real comments still show in the
          list.
        </p>
      </section>

      <div className="owner-search">
        <SearchIcon size={18} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find a user to badge…"
        />
      </div>

      <div className="owner-layout">
        <div className="owner-users">
          {filtered.length === 0 && <p className="none">No users match</p>}
          {filtered.map((u) => (
            <button
              key={u.id}
              type="button"
              className={`owner-user ${selected?.id === u.id ? 'on' : ''}`}
              onClick={() => setSelectedId(u.id)}
            >
              <img src={u.avatar} alt="" />
              <div>
                <strong>@{u.username}</strong>
                <span>{u.displayName}</span>
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="owner-detail">
            <div className="detail-head">
              <img src={selected.avatar} alt="" />
              <div>
                <h2>@{selected.username}</h2>
                <p>{selected.displayName}</p>
                <div className="current-badges">
                  {selected.badges.length === 0 && <span className="none">No badges yet</span>}
                  {selected.badges.map((id) => (
                    <span key={id} className="owner-badge-emoji" title={BADGES[id].label}>
                      <BadgeEmoji id={id} size="md" />
                      <em>{BADGES[id].label}</em>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <h3>Grant / revoke</h3>
            <div className="badge-controls">
              {OWNER_GRANTABLE.map((id) => {
                const has = selected.badges.includes(id)
                const badge = BADGES[id]
                return (
                  <div key={id} className={`badge-control ${has ? 'has' : ''}`}>
                    <div>
                      <strong style={{ color: badge.color }}>
                        <span className="badge-control-emoji" aria-hidden>
                          <BadgeEmoji id={id} size="md" />
                        </span>{' '}
                        {badge.label}
                      </strong>
                      <p>{badge.description}</p>
                    </div>
                    <button
                      type="button"
                      className={has ? 'revoke' : 'grant'}
                      onClick={() => toggle(selected.id, id, has)}
                    >
                      {has ? (
                        <>
                          <Minus size={14} /> Revoke
                        </>
                      ) : (
                        <>
                          <Check size={14} /> Grant
                        </>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {toast && <div className="owner-toast">{toast}</div>}
    </div>
  )
}
