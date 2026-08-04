import { useState } from 'react'
import {
  Home,
  Users,
  PlusSquare,
  MessageCircle,
  Menu,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { MorePanel } from './MorePanel'
import './BottomNav.css'

export function BottomNav() {
  const { unreadMessages } = useApp()
  const [moreOpen, setMoreOpen] = useState(false)

  const items = [
    { to: '/', icon: Home, label: 'Home', end: true },
    { to: '/following', icon: Users, label: 'Following' },
    { to: '/create', icon: PlusSquare, label: 'Create', create: true },
    { to: '/messages', icon: MessageCircle, label: 'Inbox', badge: unreadMessages },
  ]

  return (
    <>
      <nav className="bottom-nav" aria-label="Main">
        {items.map(({ to, icon: Icon, label, end, create, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''} ${create ? 'create' : ''}`
            }
          >
            <span className="nav-icon-wrap">
              <Icon size={create ? 28 : 24} strokeWidth={create ? 2.2 : 2} />
              {!!badge && badge > 0 && <em className="nav-badge">{badge > 9 ? '9+' : badge}</em>}
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          className={`nav-item ${moreOpen ? 'active' : ''}`}
          onClick={() => setMoreOpen(true)}
        >
          <Menu size={24} />
          <span>More</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="more-sheet-backdrop" onClick={() => setMoreOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <MorePanel variant="sheet" onClose={() => setMoreOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
