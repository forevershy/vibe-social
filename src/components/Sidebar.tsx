import { useEffect, useRef, useState } from 'react'
import {
  Home,
  Compass,
  Users,
  UserPlus,
  Radio,
  MessageCircle,
  Bell,
  PlusSquare,
  User,
  MoreHorizontal,
  Search,
  Shield,
} from 'lucide-react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { MorePanel } from './MorePanel'
import './Sidebar.css'

export function Sidebar() {
  const {
    currentUser,
    users,
    isFollowing,
    isOwner,
    unreadMessages,
    unreadActivity,
  } = useApp()
  const nav = useNavigate()
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  const followingAccounts = currentUser
    ? users.filter((u) => isFollowing(u.id)).slice(0, 6)
    : users.filter((u) => !u.isOwner).slice(0, 5)

  const isPath = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`)

  useEffect(() => {
    if (!moreOpen) return
    const onDoc = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [moreOpen])

  const goAuth = (next: string) => {
    nav(`/auth?next=${encodeURIComponent(next)}`)
  }

  const requireOrGo = (path: string) => {
    if (
      !currentUser &&
      ['/messages', '/activity', '/profile', '/create', '/friends', '/following'].includes(path)
    ) {
      if (path === '/messages' || path === '/activity' || path === '/create') {
        goAuth(path)
        return
      }
    }
    nav(path)
  }

  return (
    <aside className="desk-sidebar">
      <Link to="/" className="desk-logo">
        <span className="desk-logo-mark">V</span>
        <span className="desk-logo-text">Vibe</span>
      </Link>

      <form
        className="desk-search"
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          const q = String(fd.get('q') || '').trim()
          nav(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
        }}
      >
        <Search size={16} />
        <input name="q" placeholder="Search" />
      </form>

      <nav className="desk-nav">
        <NavLink to="/" end className={({ isActive }) => `desk-nav-item ${isActive ? 'active' : ''}`}>
          <Home size={22} />
          <span>For You</span>
        </NavLink>

        <NavLink to="/search" className={({ isActive }) => `desk-nav-item ${isActive ? 'active' : ''}`}>
          <Compass size={22} />
          <span>Explore</span>
        </NavLink>

        <NavLink
          to="/following"
          className={({ isActive }) => `desk-nav-item ${isActive ? 'active' : ''}`}
        >
          <Users size={22} />
          <span>Following</span>
        </NavLink>

        <button
          type="button"
          className={`desk-nav-item ${isPath('/friends') ? 'active' : ''}`}
          onClick={() => requireOrGo('/friends')}
        >
          <UserPlus size={22} />
          <span>Friends</span>
        </button>

        <NavLink to="/live" className={({ isActive }) => `desk-nav-item ${isActive ? 'active' : ''}`}>
          <Radio size={22} />
          <span>LIVE</span>
        </NavLink>

        <button
          type="button"
          className={`desk-nav-item ${isPath('/messages') ? 'active' : ''}`}
          onClick={() => requireOrGo('/messages')}
        >
          <MessageCircle size={22} />
          <span>Messages</span>
          {unreadMessages > 0 && (
            <em className="desk-badge">{unreadMessages > 9 ? '9+' : unreadMessages}</em>
          )}
        </button>

        <button
          type="button"
          className={`desk-nav-item ${isPath('/activity') ? 'active' : ''}`}
          onClick={() => requireOrGo('/activity')}
        >
          <Bell size={22} />
          <span>Activity</span>
          {unreadActivity > 0 && (
            <em className="desk-badge">{unreadActivity > 9 ? '9+' : unreadActivity}</em>
          )}
        </button>

        <button
          type="button"
          className={`desk-nav-item ${isPath('/create') ? 'active' : ''}`}
          onClick={() => requireOrGo('/create')}
        >
          <PlusSquare size={22} />
          <span>Upload</span>
        </button>

        <button
          type="button"
          className={`desk-nav-item ${isPath('/profile') ? 'active' : ''}`}
          onClick={() => (currentUser ? nav('/profile') : goAuth('/profile'))}
        >
          <User size={22} />
          <span>Profile</span>
        </button>

        {isOwner && (
          <NavLink to="/owner" className={({ isActive }) => `desk-nav-item ${isActive ? 'active' : ''}`}>
            <Shield size={22} />
            <span>Owner</span>
          </NavLink>
        )}

        <div className="more-wrap" ref={moreRef}>
          <button
            type="button"
            className={`desk-nav-item ${moreOpen ? 'active' : ''}`}
            onClick={() => setMoreOpen((o) => !o)}
            aria-expanded={moreOpen}
          >
            <MoreHorizontal size={22} />
            <span>More</span>
          </button>

          {moreOpen && (
            <div className="desk-more-anchor">
              <MorePanel variant="popup" onClose={() => setMoreOpen(false)} />
            </div>
          )}
        </div>
      </nav>

      <div className="desk-following">
        <h3>Following accounts</h3>
        <div className="desk-follow-list">
          {followingAccounts.map((u) => (
            <Link key={u.id} to={`/u/${u.username}`} className="desk-follow-row">
              <img src={u.avatar} alt="" />
              <div>
                <strong>{u.displayName}</strong>
                <span>@{u.username}</span>
              </div>
            </Link>
          ))}
          {followingAccounts.length === 0 && (
            <p className="desk-empty">Follow people to see them here</p>
          )}
        </div>
        <button type="button" className="desk-view-all" onClick={() => requireOrGo('/friends')}>
          View all
        </button>
      </div>
    </aside>
  )
}
