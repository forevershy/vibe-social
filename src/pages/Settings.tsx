import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { resetDemo } from '../lib/storage'
import './Hub.css'

const PRIVACY_KEY = 'vibe_default_privacy'

export function SettingsPage() {
  const { currentUser, logout, showToast } = useApp()
  const nav = useNavigate()
  const defaultPrivacy =
    (localStorage.getItem(PRIVACY_KEY) as 'public' | 'friends' | 'private') || 'public'

  if (!currentUser) {
    return (
      <div className="hub-page locked">
        <h2>Settings</h2>
        <p>Log in to manage your account.</p>
        <button onClick={() => nav('/auth?next=/settings')}>Log in</button>
      </div>
    )
  }

  return (
    <div className="hub-page">
      <header className="hub-head">
        <div>
          <h1>Settings</h1>
          <p>@{currentUser.username}</p>
        </div>
      </header>

      <section>
        <h2>Account</h2>
        <div className="hub-list">
          <button type="button" className="hub-row" onClick={() => nav('/profile')}>
            <div>
              <strong>Edit profile</strong>
              <span>Name, username, bio, badges</span>
            </div>
          </button>
          <button
            type="button"
            className="hub-row"
            onClick={() => {
              logout()
              nav('/auth')
            }}
          >
            <div>
              <strong>Log out</strong>
              <span>Sign out of this device</span>
            </div>
          </button>
        </div>
      </section>

      <section>
        <h2>Privacy</h2>
        <div className="hub-list">
          {(
            [
              ['public', 'Everyone', 'New posts visible on For You'],
              ['friends', 'Friends', 'Only mutual follows'],
              ['private', 'Only you', 'Hidden from feeds'],
            ] as const
          ).map(([id, label, hint]) => (
            <button
              key={id}
              type="button"
              className={`hub-row ${defaultPrivacy === id ? 'on' : ''}`}
              onClick={() => {
                localStorage.setItem(PRIVACY_KEY, id)
                showToast(`Default privacy: ${label}`)
                // force re-render via toast is enough if we remount — navigate soft refresh
                nav('/settings')
              }}
            >
              <div>
                <strong>{label}</strong>
                <span>{hint}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>Developer</h2>
        <div className="hub-list">
          <button
            type="button"
            className="hub-row"
            onClick={() => {
              if (!confirm('Reset all local demo data?')) return
              resetDemo()
              showToast('Demo data reset — refreshing')
              window.setTimeout(() => window.location.reload(), 500)
            }}
          >
            <div>
              <strong>Reset local demo data</strong>
              <span>Clear this device’s saved state and restore seed content</span>
            </div>
          </button>
        </div>
      </section>
    </div>
  )
}
