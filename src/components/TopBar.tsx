import { useState } from 'react'
import { Coins, Smartphone } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { GetAppModal } from '../pages/Hub'
import { formatCount } from '../lib/utils'
import './TopBar.css'

export function TopBar() {
  const { currentUser } = useApp()
  const nav = useNavigate()
  const [appOpen, setAppOpen] = useState(false)

  return (
    <>
      <header className="desk-topbar">
        <div className="desk-topbar-spacer" />
        <div className="desk-topbar-actions">
          <button type="button" className="pill" onClick={() => nav('/shop')}>
            <Coins size={16} />
            {currentUser ? `${formatCount(currentUser.coins)} Coins` : 'Get Coins'}
          </button>
          <button type="button" className="pill" onClick={() => setAppOpen(true)}>
            <Smartphone size={16} />
            Get App
          </button>
          {currentUser ? (
            <Link to="/profile" className="desk-avatar">
              <img src={currentUser.avatar} alt="" />
            </Link>
          ) : (
            <Link to="/auth" className="login-pill">
              Log in
            </Link>
          )}
        </div>
      </header>
      {appOpen && <GetAppModal onClose={() => setAppOpen(false)} />}
    </>
  )
}
