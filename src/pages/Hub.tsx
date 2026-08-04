import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Coins,
  Users,
  MessageCircle,
  Bell,
  Gift,
  Smartphone,
  Send,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatCount, timeAgo } from '../lib/utils'
import './Hub.css'

export function ShopPage() {
  const { currentUser, buyCoins, spendCoins } = useApp()
  const nav = useNavigate()
  const packs = [
    { coins: 100, label: '$0.99' },
    { coins: 500, label: '$4.99' },
    { coins: 1000, label: '$8.99' },
    { coins: 5000, label: '$39.99' },
  ]
  const gifts = [
    { name: 'Rose', cost: 1 },
    { name: 'Fire', cost: 10 },
    { name: 'Galaxy', cost: 99 },
    { name: 'Crown', cost: 299 },
  ]

  if (!currentUser) {
    return (
      <div className="hub-page locked">
        <h2>Shop</h2>
        <p>Log in to buy coins and send gifts.</p>
        <button onClick={() => nav('/auth?next=/shop')}>Log in</button>
      </div>
    )
  }

  return (
    <div className="hub-page">
      <header className="hub-head">
        <div>
          <h1>Shop</h1>
          <p>
            Balance: <strong>{formatCount(currentUser.coins)}</strong> coins ·{' '}
            <em className="demo-tag">Demo — no real money</em>
          </p>
        </div>
        <Coins size={28} color="#f5a623" />
      </header>

      <section>
        <h2>Get Coins (demo)</h2>
        <p className="hub-empty" style={{ marginBottom: '0.75rem' }}>
          Free demo packs — nothing is charged.
        </p>
        <div className="pack-grid">
          {packs.map((p) => (
            <button key={p.coins} type="button" onClick={() => buyCoins(p.coins, p.label)}>
              <Coins size={20} />
              <strong>{formatCount(p.coins)}</strong>
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>Unlock effects</h2>
        <p className="hub-empty" style={{ marginBottom: '0.75rem' }}>
          Spend coins on demo effects for your account.
        </p>
        <div className="pack-grid">
          {gifts.map((g) => (
            <button
              key={g.name}
              type="button"
              onClick={() => spendCoins(g.cost, `Unlocked ${g.name}`)}
            >
              <Gift size={20} />
              <strong>{g.name}</strong>
              <span>{g.cost} coins</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

export function FriendsPage() {
  const { friends, users, currentUser, follow, isFollowing } = useApp()
  const nav = useNavigate()
  const suggested = users
    .filter((u) => u.id !== currentUser?.id && !isFollowing(u.id) && !u.isOwner)
    .slice(0, 8)

  if (!currentUser) {
    return (
      <div className="hub-page locked">
        <h2>Friends</h2>
        <p>Log in to see mutual follows.</p>
        <button onClick={() => nav('/auth?next=/friends')}>Log in</button>
      </div>
    )
  }

  return (
    <div className="hub-page">
      <header className="hub-head">
        <div>
          <h1>Friends</h1>
          <p>People you follow who follow you back</p>
        </div>
        <Users size={28} />
      </header>

      <section>
        <h2>Your friends</h2>
        {friends.length === 0 ? (
          <p className="hub-empty">No mutual friends yet — follow people and get followed back.</p>
        ) : (
          <div className="hub-list">
            {friends.map((u) => (
              <Link key={u.id} to={`/u/${u.username}`} className="hub-row">
                <img src={u.avatar} alt="" />
                <div>
                  <strong>{u.displayName}</strong>
                  <span>@{u.username}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2>Suggested</h2>
        <div className="hub-list">
          {suggested.map((u) => (
            <div key={u.id} className="hub-row">
              <Link to={`/u/${u.username}`} className="hub-row-main">
                <img src={u.avatar} alt="" />
                <div>
                  <strong>{u.displayName}</strong>
                  <span>@{u.username}</span>
                </div>
              </Link>
              <button
                type="button"
                className="solid"
                onClick={() => follow(u.id)}
              >
                Follow
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export function MessagesPage() {
  const {
    currentUser,
    conversations,
    users,
    getUser,
    sendMessage,
    markConversationRead,
    unreadMessages,
    showToast,
  } = useApp()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const openWith = params.get('u')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [composeTo, setComposeTo] = useState(openWith || '')

  const mine = useMemo(() => {
    if (!currentUser) return []
    return conversations
      .filter((c) => c.participants.includes(currentUser.id))
      .sort((a, b) => (b.messages.at(-1)?.createdAt || 0) - (a.messages.at(-1)?.createdAt || 0))
  }, [conversations, currentUser])

  useEffect(() => {
    if (!currentUser || !openWith) return
    const otherUser = users.find((u) => u.username === openWith.toLowerCase())
    if (!otherUser) {
      showToast('User not found')
      return
    }
    const existing = conversations.find(
      (c) => c.participants.includes(currentUser.id) && c.participants.includes(otherUser.id),
    )
    if (existing) {
      setActiveId(existing.id)
      markConversationRead(existing.id)
    } else {
      setComposeTo(otherUser.username)
      setActiveId(null)
    }
  }, [openWith, currentUser, users, conversations, markConversationRead, showToast])

  const active = mine.find((c) => c.id === activeId) || null
  const otherId = active?.participants.find((id) => id !== currentUser?.id)
  const other =
    (otherId ? getUser(otherId) : null) ||
    users.find((u) => u.username === composeTo.trim().toLowerCase()) ||
    null

  const send = () => {
    if (!currentUser) {
      nav('/auth?next=/messages')
      return
    }
    if (!other) {
      showToast('Enter a valid username')
      return
    }
    const res = sendMessage(other.id, text)
    if (!res.ok) {
      showToast(res.error || 'Could not send')
      return
    }
    setText('')
    if (res.conversationId) setActiveId(res.conversationId)
    setParams({}, { replace: true })
  }

  if (!currentUser) {
    return (
      <div className="hub-page locked">
        <h2>Messages</h2>
        <p>Log in to chat with creators.</p>
        <button onClick={() => nav('/auth?next=/messages')}>Log in</button>
      </div>
    )
  }

  return (
    <div className="hub-page messages">
      <header className="hub-head">
        <div>
          <h1>Messages {unreadMessages > 0 ? `(${unreadMessages})` : ''}</h1>
          <p>Chat with people on Vibe</p>
        </div>
        <MessageCircle size={28} />
      </header>

      <div className="msg-layout">
        <div className="msg-list">
          <div className="compose">
            <input
              value={composeTo}
              onChange={(e) => setComposeTo(e.target.value.replace(/^@/, ''))}
              placeholder="Username to message"
            />
            <button
              type="button"
              onClick={() => {
                const u = users.find((x) => x.username === composeTo.trim().toLowerCase())
                if (!u) {
                  showToast('User not found')
                  return
                }
                if (u.id === currentUser.id) {
                  showToast('Cannot message yourself')
                  return
                }
                const existing = conversations.find(
                  (c) =>
                    c.participants.includes(currentUser.id) && c.participants.includes(u.id),
                )
                setComposeTo(u.username)
                if (existing) {
                  setActiveId(existing.id)
                  markConversationRead(existing.id)
                  setParams({}, { replace: true })
                } else {
                  setActiveId(null)
                  setParams({ u: u.username })
                }
              }}
            >
              New
            </button>
          </div>
          {mine.map((c) => {
            const oid = c.participants.find((id) => id !== currentUser.id)!
            const u = getUser(oid)
            if (!u) return null
            const last = c.messages.at(-1)
            const unread = c.messages.some((m) => m.fromId !== currentUser.id && !m.read)
            return (
              <button
                key={c.id}
                type="button"
                className={`msg-item ${activeId === c.id ? 'on' : ''}`}
                onClick={() => {
                  setActiveId(c.id)
                  markConversationRead(c.id)
                  setComposeTo(u.username)
                  setParams({}, { replace: true })
                }}
              >
                <img src={u.avatar} alt="" />
                <div>
                  <strong>
                    {u.displayName}
                    {unread ? <i className="dot" /> : null}
                  </strong>
                  <span>{last?.text || 'Say hi'}</span>
                </div>
              </button>
            )
          })}
        </div>

        <div className="msg-thread">
          {!other ? (
            <p className="hub-empty">Pick a conversation or enter a username</p>
          ) : (
            <>
              <div className="msg-thread-head">
                <Link to={`/u/${other.username}`}>@{other.username}</Link>
              </div>
              <div className="msg-bubbles">
                {(active?.messages || []).map((m) => (
                  <div
                    key={m.id}
                    className={`bubble ${m.fromId === currentUser.id ? 'me' : 'them'}`}
                  >
                    <p>{m.text}</p>
                    <span>{timeAgo(m.createdAt)}</span>
                  </div>
                ))}
                {!active && (
                  <p className="hub-empty">Say hello to start the chat</p>
                )}
              </div>
              <form
                className="msg-compose"
                onSubmit={(e) => {
                  e.preventDefault()
                  send()
                }}
              >
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={`Message @${other.username}`}
                />
                <button type="submit" disabled={!text.trim()}>
                  <Send size={18} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function ActivityPage() {
  const {
    currentUser,
    activities,
    getUser,
    markActivitiesRead,
    posts,
  } = useApp()
  const nav = useNavigate()

  useEffect(() => {
    markActivitiesRead()
  }, [markActivitiesRead])

  if (!currentUser) {
    return (
      <div className="hub-page locked">
        <h2>Activity</h2>
        <p>Log in to see likes, follows, and comments.</p>
        <button onClick={() => nav('/auth?next=/activity')}>Log in</button>
      </div>
    )
  }

  const mine = activities
    .filter((a) => a.toUserId === currentUser.id)
    .sort((a, b) => b.createdAt - a.createdAt)

  const label = (type: string) => {
    if (type === 'like') return 'liked your post'
    if (type === 'follow') return 'started following you'
    if (type === 'comment') return 'commented on your post'
    if (type === 'repost') return 'reposted your post'
    if (type === 'save') return 'saved your post'
    return 'interacted with you'
  }

  return (
    <div className="hub-page">
      <header className="hub-head">
        <div>
          <h1>Activity</h1>
          <p>Notifications from people on Vibe</p>
        </div>
        <Bell size={28} />
      </header>

      {mine.length === 0 ? (
        <p className="hub-empty">No activity yet — post and engage to fill this up.</p>
      ) : (
        <div className="hub-list">
          {mine.map((a) => {
            const from = getUser(a.fromUserId)
            const post = a.postId ? posts.find((p) => p.id === a.postId) : null
            if (!from) return null
            return (
              <div key={a.id} className="hub-row activity">
                <Link to={`/u/${from.username}`}>
                  <img src={from.avatar} alt="" />
                </Link>
                <div className="activity-text">
                  <p>
                    <Link to={`/u/${from.username}`}>
                      <strong>@{from.username}</strong>
                    </Link>{' '}
                    {label(a.type)}
                    {a.text ? `: “${a.text}”` : ''}
                  </p>
                  <span>{timeAgo(a.createdAt)}</span>
                </div>
                {post && (
                  <Link to={`/post/${post.id}`} className="activity-thumb">
                    {post.type === 'video' ? (
                      <video src={post.mediaUrl} muted poster={post.posterUrl} />
                    ) : (
                      <img src={post.mediaUrl} alt="" />
                    )}
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function GetAppModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <Smartphone size={36} />
        <h2>Get the Vibe app</h2>
        <p>Scan or tap below to install the mobile experience.</p>
        <div className="qr-fake">VIBE</div>
        <button type="button" className="solid" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  )
}
