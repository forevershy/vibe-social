import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Search, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { User } from '../types'
import { VerifiedMark } from './Badge'
import './FollowListSheet.css'

type Mode = 'following' | 'followers'

type Props = {
  user: User
  mode: Mode
  onClose: () => void
}

export function FollowListSheet({ user, mode, onClose }: Props) {
  const { users, currentUser, follow, unfollow, isFollowing } = useApp()
  const [q, setQ] = useState('')

  const list = useMemo(() => {
    const ids = mode === 'following' ? user.following : user.followers
    const rows = ids
      .map((id) => users.find((u) => u.id === id))
      .filter((u): u is User => !!u)
    const query = q.trim().toLowerCase()
    if (!query) return rows
    return rows.filter(
      (u) =>
        u.username.includes(query) ||
        u.displayName.toLowerCase().includes(query),
    )
  }, [mode, user, users, q])

  const isOwnList = currentUser?.id === user.id
  const title = mode === 'following' ? 'Following' : 'Followers'

  return createPortal(
    <div className="fl-backdrop" onClick={onClose} role="presentation">
      <div
        className="fl-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fl-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="fl-head">
          <div>
            <h2 id="fl-title">{title}</h2>
            <p>@{user.username}</p>
          </div>
          <button type="button" className="fl-close" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <div className="fl-search">
          <Search size={16} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${title.toLowerCase()}`}
          />
        </div>

        <div className="fl-list">
          {list.length === 0 && (
            <p className="fl-empty">
              {q
                ? 'No matches'
                : mode === 'following'
                  ? 'Not following anyone yet'
                  : 'No followers yet'}
            </p>
          )}

          {list.map((u) => {
            const iFollow = isFollowing(u.id)
            const theyFollowMe = !!currentUser && u.following.includes(currentUser.id)
            const isFriend = iFollow && theyFollowMe
            const isSelf = currentUser?.id === u.id

            return (
              <div key={u.id} className="fl-row">
                <Link to={`/u/${u.username}`} className="fl-user" onClick={onClose}>
                  <img src={u.avatar} alt="" />
                  <div>
                    <strong>
                      {u.username}
                      <VerifiedMark badges={u.badges} />
                      {isFriend && <em className="fl-friend">Friends</em>}
                    </strong>
                    <span>{u.displayName}</span>
                  </div>
                </Link>

                {!isSelf && currentUser && (
                  <div className="fl-actions">
                    {mode === 'following' && isOwnList && (
                      <button
                        type="button"
                        className="fl-btn ghost"
                        onClick={() => unfollow(u.id)}
                      >
                        Unfollow
                      </button>
                    )}
                    {mode === 'followers' && isOwnList && !iFollow && (
                      <button
                        type="button"
                        className="fl-btn solid"
                        onClick={() => follow(u.id)}
                      >
                        <UserPlus size={14} /> Follow back
                      </button>
                    )}
                    {mode === 'followers' && isOwnList && iFollow && (
                      <button type="button" className="fl-btn ghost" disabled>
                        Friends
                      </button>
                    )}
                    {!isOwnList && (
                      <button
                        type="button"
                        className={iFollow ? 'fl-btn ghost' : 'fl-btn solid'}
                        onClick={() => (iFollow ? unfollow(u.id) : follow(u.id))}
                      >
                        {iFollow ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>,
    document.body,
  )
}
