import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Settings,
  Share2,
  Shield,
  LayoutGrid,
  Repeat2,
  Bookmark,
  Heart,
  Play,
  Camera,
  Pencil,
  X,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { fileToDataUrl, formatCount, BADGES, SELF_EDITABLE_BADGES } from '../lib/utils'
import { VerifiedMark, BadgeEmoji } from '../components/Badge'
import type { Post } from '../types'
import { FollowListSheet } from '../components/FollowListSheet'
import './Profile.css'

type ProfileTab = 'videos' | 'reposts' | 'favorites' | 'liked'
type SortMode = 'latest' | 'popular' | 'oldest'

const BIO_MAX = 80
const NAME_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000
const PROFILE_HOST = typeof window !== 'undefined' ? window.location.host : 'www.vibe.app'

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

export function ProfilePage({ self = false }: { self?: boolean }) {
  const { username } = useParams()
  const {
    currentUser,
    users,
    posts,
    follow,
    unfollow,
    isFollowing,
    logout,
    updateProfile,
    isOwner,
    awardBadge,
    revokeBadge,
  } = useApp()
  const nav = useNavigate()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ displayName: '', bio: '', username: '', avatar: '' })
  const [tab, setTab] = useState<ProfileTab>('videos')
  const [sort, setSort] = useState<SortMode>('latest')
  const [msg, setMsg] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [listMode, setListMode] = useState<'following' | 'followers' | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const user = useMemo(() => {
    if (self) return currentUser
    return users.find((u) => u.username === username) || null
  }, [self, currentUser, users, username])

  const userPosts = useMemo(
    () => (user ? posts.filter((p) => p.userId === user.id) : []),
    [posts, user],
  )

  const likedPosts = useMemo(
    () => (user ? posts.filter((p) => p.likes.includes(user.id)) : []),
    [posts, user],
  )

  const favoritePosts = useMemo(
    () => (user ? posts.filter((p) => user.saved.includes(p.id)) : []),
    [posts, user],
  )

  const repostPosts = useMemo(
    () => (user ? posts.filter((p) => user.reposts.some((r) => r.postId === p.id)) : []),
    [posts, user],
  )

  if (self && !currentUser) {
    return (
      <div className="profile-page locked">
        <h2>Profile</h2>
        <p>Create an account to get your own profile, badges, and followers.</p>
        <button onClick={() => nav('/auth')}>Log in / Sign up</button>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="profile-page locked">
        <h2>User not found</h2>
        <button onClick={() => nav('/search')}>Back to search</button>
      </div>
    )
  }

  const isMe = currentUser?.id === user.id
  const following = isFollowing(user.id)
  const realLikes = userPosts.reduce((a, p) => a + p.likes.length, 0)
  const likes = user.statsOverride?.likes ?? realLikes
  const followerCount = user.statsOverride?.followers ?? user.followers.length
  const visibleTab =
    !isMe && (tab === 'favorites' || tab === 'liked') ? 'videos' : tab

  const startEdit = () => {
    setDraft({
      displayName: user.displayName,
      bio: user.bio,
      username: user.username,
      avatar: user.avatar,
    })
    setEditing(true)
    setMenuOpen(false)
    setMsg('')
  }

  const saveEdit = () => {
    const bio = draft.bio.slice(0, BIO_MAX)
    const res = updateProfile({
      displayName: draft.displayName,
      bio,
      username: draft.username,
      avatar: draft.avatar.trim() || user.avatar,
    })
    if (!res.ok) {
      setMsg(res.error || 'Could not save')
      return
    }
    setEditing(false)
    if (draft.username !== user.username) nav(`/u/${draft.username}`)
  }

  const nameLockedUntil = user.nameChangedAt
    ? user.nameChangedAt + NAME_COOLDOWN_MS
    : 0
  const nameDaysLeft = Math.max(
    0,
    Math.ceil((nameLockedUntil - Date.now()) / (24 * 60 * 60 * 1000)),
  )

  const applyAvatar = async (file: File | null, mode: 'save' | 'draft' = 'draft') => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setMsg('Choose an image file (JPG, PNG, WEBP…)')
      if (!editing) startEdit()
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setMsg('Photo must be under 2MB')
      if (!editing) startEdit()
      return
    }
    setAvatarBusy(true)
    setMsg('')
    try {
      const url = await fileToDataUrl(file)
      if (mode === 'save') {
        const res = updateProfile({ avatar: url })
        if (!res.ok) {
          setMsg(res.error || 'Could not update photo')
          if (!editing) startEdit()
        }
      } else if (editing) {
        setDraft((d) => ({ ...d, avatar: url }))
      } else {
        setDraft({
          displayName: user.displayName,
          bio: user.bio,
          username: user.username,
          avatar: url,
        })
        setEditing(true)
        setMenuOpen(false)
      }
    } catch {
      setMsg('Could not read that photo')
      if (!editing) startEdit()
    } finally {
      setAvatarBusy(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const openAvatarPicker = () => {
    if (!isMe) return
    avatarInputRef.current?.click()
  }

  const shareProfile = () => {
    const url = `${window.location.origin}/u/${user.username}`
    if (navigator.share) {
      navigator.share({ title: user.displayName, url }).catch(() => undefined)
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => undefined)
    }
  }

  const source =
    visibleTab === 'liked'
      ? likedPosts
      : visibleTab === 'favorites'
        ? favoritePosts
        : visibleTab === 'reposts'
          ? repostPosts
          : userPosts

  const grid = sortPosts(source, sort)

  return (
    <div className="profile-page">
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(e) =>
          applyAvatar(e.target.files?.[0] || null, editing ? 'draft' : 'save')
        }
      />

      <div className="profile-hero">
        {isMe ? (
          <button
            type="button"
            className="avatar-wrap"
            onClick={openAvatarPicker}
            disabled={avatarBusy}
            aria-label="Change profile photo"
          >
            <img className="avatar" src={editing ? draft.avatar || user.avatar : user.avatar} alt="" />
            <span className="avatar-camera">
              <Camera size={18} />
            </span>
          </button>
        ) : (
          <img className="avatar" src={user.avatar} alt="" />
        )}

        <div className="profile-meta">
          <div className="name-row">
            <h1>{user.username}</h1>
            <VerifiedMark badges={user.badges} />
            <span className="name-sep">|</span>
            <span className="handle">{user.displayName}</span>
          </div>

          <div className="stats-row">
            <button type="button" className="stat-btn" onClick={() => setListMode('following')}>
              <strong>{formatCount(user.following.length)}</strong>
              <span>Following</span>
            </button>
            <button type="button" className="stat-btn" onClick={() => setListMode('followers')}>
              <strong>{formatCount(followerCount)}</strong>
              <span>Followers</span>
            </button>
            <div className="stat-static">
              <strong>{formatCount(likes)}</strong>
              <span>Likes</span>
            </div>
          </div>

          <div className="action-row">
            {isMe ? (
              <>
                <button type="button" className="edit-profile-btn" onClick={startEdit}>
                  Edit profile
                </button>
                <div className="icon-menu-wrap">
                  <button
                    type="button"
                    className="icon-round"
                    aria-label="Settings"
                    onClick={() => setMenuOpen((o) => !o)}
                  >
                    <Settings size={18} />
                  </button>
                  {menuOpen && (
                    <div className="settings-menu">
                      <Link to="/settings" onClick={() => setMenuOpen(false)}>
                        Settings
                      </Link>
                      {isOwner && (
                        <Link to="/owner" onClick={() => setMenuOpen(false)}>
                          <Shield size={15} /> Owner panel
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false)
                          logout()
                          nav('/auth')
                        }}
                      >
                        Log out
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="icon-round"
                  aria-label="Share profile"
                  onClick={shareProfile}
                >
                  <Share2 size={18} />
                </button>
              </>
            ) : currentUser ? (
              <>
                <button
                  type="button"
                  className={following ? 'edit-profile-btn muted' : 'follow-solid'}
                  onClick={() => (following ? unfollow(user.id) : follow(user.id))}
                >
                  {following ? 'Following' : 'Follow'}
                </button>
                <button
                  type="button"
                  className="edit-profile-btn muted"
                  onClick={() => nav(`/messages?u=${user.username}`)}
                >
                  Message
                </button>
                <button
                  type="button"
                  className="icon-round"
                  aria-label="Share profile"
                  onClick={shareProfile}
                >
                  <Share2 size={18} />
                </button>
              </>
            ) : (
              <>
                <Link
                  to={`/auth?next=${encodeURIComponent(`/u/${user.username}`)}`}
                  className="follow-solid"
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >
                  Log in to follow
                </Link>
                <button
                  type="button"
                  className="icon-round"
                  aria-label="Share profile"
                  onClick={shareProfile}
                >
                  <Share2 size={18} />
                </button>
              </>
            )}
          </div>

          {user.bio && <p className="bio">{user.bio}</p>}
        </div>
      </div>

      {editing && (
        <div
          className="edit-modal-overlay"
          role="presentation"
          onClick={() => setEditing(false)}
        >
          <div
            className="edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="edit-modal-head">
              <h2 id="edit-profile-title">Edit profile</h2>
              <button
                type="button"
                className="edit-modal-close"
                aria-label="Close"
                onClick={() => setEditing(false)}
              >
                <X size={22} />
              </button>
            </header>

            <div className="edit-modal-body">
              <div className="edit-row">
                <div className="edit-label">Profile photo</div>
                <div className="edit-field photo-field">
                  <button
                    type="button"
                    className="edit-photo-btn"
                    onClick={openAvatarPicker}
                    disabled={avatarBusy}
                    aria-label="Change profile photo"
                  >
                    <img src={draft.avatar || user.avatar} alt="" />
                    <span className="edit-photo-badge">
                      <Pencil size={14} />
                    </span>
                  </button>
                </div>
              </div>

              <div className="edit-row">
                <div className="edit-label">Username</div>
                <div className="edit-field">
                  <input
                    className="edit-input"
                    value={draft.username}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        username: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9._]/g, ''),
                      })
                    }
                    maxLength={24}
                    autoComplete="username"
                  />
                  <p className="edit-link">
                    {PROFILE_HOST}/@{draft.username || user.username}
                  </p>
                  <p className="edit-hint">
                    Usernames can only contain letters, numbers, underscores, and
                    periods. Changing your username will also change your profile
                    link.
                  </p>
                </div>
              </div>

              <div className="edit-row">
                <div className="edit-label">Name</div>
                <div className="edit-field">
                  <input
                    className="edit-input"
                    value={draft.displayName}
                    onChange={(e) =>
                      setDraft({ ...draft, displayName: e.target.value.slice(0, 30) })
                    }
                    maxLength={30}
                    disabled={Boolean(user.nameChangedAt && Date.now() < nameLockedUntil)}
                  />
                  <p className="edit-hint">
                    {user.nameChangedAt && Date.now() < nameLockedUntil
                      ? `Your nickname can be changed again in ${nameDaysLeft} day${nameDaysLeft === 1 ? '' : 's'}.`
                      : 'Your nickname can only be changed once every 7 days.'}
                  </p>
                </div>
              </div>

              <div className="edit-row">
                <div className="edit-label">Bio</div>
                <div className="edit-field">
                  <textarea
                    className="edit-textarea"
                    value={draft.bio}
                    onChange={(e) =>
                      setDraft({ ...draft, bio: e.target.value.slice(0, BIO_MAX) })
                    }
                    rows={4}
                    maxLength={BIO_MAX}
                  />
                  <div className="edit-bio-meta">
                    <span className="edit-count">
                      {draft.bio.length}/{BIO_MAX}
                    </span>
                  </div>
                </div>
              </div>

              {isOwner && isMe && (
                <div className="edit-row">
                  <div className="edit-label">Badges</div>
                  <div className="edit-field">
                    <div className="edit-badge-list">
                      {SELF_EDITABLE_BADGES.map((id) => {
                        const has = user.badges.includes(id)
                        const badge = BADGES[id]
                        return (
                          <div key={id} className={`edit-badge-row ${has ? 'on' : ''}`}>
                            <span className="edit-badge-meta">
                              <BadgeEmoji id={id} size="md" />
                              <span>
                                <strong>{badge.label}</strong>
                                <em>{badge.description}</em>
                              </span>
                            </span>
                            <button
                              type="button"
                              className={has ? 'off' : 'on'}
                              onClick={() => {
                                const res = has
                                  ? revokeBadge(user.id, id)
                                  : awardBadge(user.id, id)
                                if (!res.ok) setMsg(res.error || 'Could not update badge')
                              }}
                            >
                              {has ? 'Remove' : 'Add'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                    <p className="edit-hint">
                      Turn the crown 👑 on or off anytime. Owner access stays even if it’s hidden.
                      Removed badges won’t come back automatically.
                    </p>
                  </div>
                </div>
              )}

              {msg && <p className="err edit-modal-err">{msg}</p>}
            </div>

            <footer className="edit-modal-foot">
              <button type="button" className="edit-cancel" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="edit-save"
                onClick={saveEdit}
                disabled={avatarBusy}
              >
                Save
              </button>
            </footer>
          </div>
        </div>
      )}

      {!editing && msg && isMe && <p className="err profile-msg">{msg}</p>}

      {listMode && (
        <FollowListSheet
          user={user}
          mode={listMode}
          onClose={() => setListMode(null)}
        />
      )}

      <div className="tab-toolbar">
        <div className="profile-tabs">
          <button
            type="button"
            className={visibleTab === 'videos' ? 'on' : ''}
            onClick={() => setTab('videos')}
          >
            <LayoutGrid size={16} /> Videos
          </button>
          <button
            type="button"
            className={visibleTab === 'reposts' ? 'on' : ''}
            onClick={() => setTab('reposts')}
          >
            <Repeat2 size={16} /> Reposts
          </button>
          {isMe && (
            <>
              <button
                type="button"
                className={visibleTab === 'favorites' ? 'on' : ''}
                onClick={() => setTab('favorites')}
              >
                <Bookmark size={16} /> Favorites
              </button>
              <button
                type="button"
                className={visibleTab === 'liked' ? 'on' : ''}
                onClick={() => setTab('liked')}
              >
                <Heart size={16} /> Liked
              </button>
            </>
          )}
        </div>

        <div className="sort-toggle" role="group" aria-label="Sort">
          {([
            ['latest', 'Latest'],
            ['popular', 'Popular'],
            ['oldest', 'Oldest'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={sort === id ? 'on' : ''}
              onClick={() => setSort(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="profile-grid">
        {grid.length === 0 && (
          <p className="none">
            {visibleTab === 'reposts'
              ? 'No reposts yet'
              : visibleTab === 'favorites'
                ? 'No favorites yet — tap the bookmark on a video'
                : visibleTab === 'liked'
                  ? 'No liked videos yet'
                  : 'No videos yet'}
          </p>
        )}
        {grid.map((p) => (
          <Link
            key={p.id}
            to={`/u/${user.username}/video/${p.id}?tab=${visibleTab}&sort=${sort}`}
            className="cell"
          >
            {p.type === 'video' ? (
              <video src={p.mediaUrl} muted playsInline poster={p.posterUrl} preload="metadata" />
            ) : (
              <img src={p.mediaUrl} alt="" />
            )}
            <span className="cell-views">
              <Play size={12} fill="currentColor" />
              {formatCount(p.views || p.likes.length * 120)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
