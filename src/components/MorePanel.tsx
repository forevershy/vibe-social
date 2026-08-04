import { useEffect, useState } from 'react'
import {
  Settings,
  Languages,
  Moon,
  Sun,
  SlidersHorizontal,
  Wand2,
  Tv,
  Coins,
  ClipboardPen,
  LogOut,
  LogIn,
  ChevronRight,
  Shield,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import './MorePanel.css'

export type ThemeMode = 'system' | 'dark' | 'light'

const THEME_KEY = 'vibe_theme_mode'

export function getStoredTheme(): ThemeMode {
  const v = localStorage.getItem(THEME_KEY)
  if (v === 'dark' || v === 'light' || v === 'system') return v
  return 'dark'
}

export function applyTheme(mode: ThemeMode) {
  localStorage.setItem(THEME_KEY, mode)
  const root = document.documentElement
  if (mode === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  } else {
    root.setAttribute('data-theme', mode)
  }
  root.setAttribute('data-theme-pref', mode)
}

type MorePanelProps = {
  onClose: () => void
  variant?: 'popup' | 'sheet'
}

export function MorePanel({ onClose, variant = 'popup' }: MorePanelProps) {
  const { currentUser, isOwner, logout, showToast } = useApp()
  const nav = useNavigate()
  const [theme, setTheme] = useState<ThemeMode>(() => getStoredTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const go = (path: string) => {
    onClose()
    nav(path)
  }

  const tip = (msg: string) => {
    onClose()
    showToast(msg)
  }

  return (
    <div className={`more-panel more-panel--${variant}`} role="dialog" aria-label="More">
      <header className="more-panel-head">
        <h2>More</h2>
        <button type="button" className="more-panel-close" aria-label="Close" onClick={onClose}>
          <X size={20} />
        </button>
      </header>

      <div className="more-panel-scroll">
        <section className="more-section">
          <h3>Settings</h3>
          <button type="button" className="more-item" onClick={() => go('/settings')}>
            <Settings size={22} strokeWidth={1.75} />
            <span>General</span>
          </button>
          <button
            type="button"
            className="more-item"
            onClick={() => tip('Language stays English (US) in this demo')}
          >
            <Languages size={22} strokeWidth={1.75} />
            <span>English (US)</span>
            <ChevronRight size={18} className="more-chevron" />
          </button>
          <div className="more-item more-item--static">
            <Moon size={22} strokeWidth={1.75} />
            <span>Dark mode</span>
            <div className="theme-seg" role="group" aria-label="Theme">
              {(
                [
                  ['system', SlidersHorizontal, 'Device'],
                  ['dark', Moon, 'Dark'],
                  ['light', Sun, 'Light'],
                ] as const
              ).map(([id, Icon, label]) => (
                <button
                  key={id}
                  type="button"
                  className={theme === id ? 'on' : ''}
                  aria-label={label}
                  aria-pressed={theme === id}
                  onClick={() => setTheme(id)}
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="more-section">
          <h3>Tools</h3>
          <button type="button" className="more-item" onClick={() => go('/live')}>
            <Tv size={22} strokeWidth={1.75} />
            <span>LIVE</span>
            <ChevronRight size={18} className="more-chevron" />
          </button>
          <button type="button" className="more-item" onClick={() => go('/shop')}>
            <Coins size={22} strokeWidth={1.75} />
            <span>Get Coins (demo)</span>
          </button>
          <button type="button" className="more-item" onClick={() => go('/create')}>
            <Wand2 size={22} strokeWidth={1.75} />
            <span>Create</span>
          </button>
          {isOwner && (
            <button type="button" className="more-item" onClick={() => go('/owner')}>
              <Shield size={22} strokeWidth={1.75} />
              <span>Owner panel</span>
            </button>
          )}
        </section>

        <section className="more-section">
          <h3>Other</h3>
          <button type="button" className="more-item" onClick={() => go('/settings')}>
            <ClipboardPen size={22} strokeWidth={1.75} />
            <span>Help &amp; settings</span>
          </button>
          {currentUser ? (
            <button
              type="button"
              className="more-item"
              onClick={() => {
                onClose()
                logout()
                nav('/auth')
              }}
            >
              <LogOut size={22} strokeWidth={1.75} />
              <span>Log out</span>
            </button>
          ) : (
            <button
              type="button"
              className="more-item"
              onClick={() => {
                onClose()
                nav('/auth')
              }}
            >
              <LogIn size={22} strokeWidth={1.75} />
              <span>Log in</span>
            </button>
          )}
        </section>
      </div>
    </div>
  )
}

/** Call once on app boot so theme preference sticks */
export function initTheme() {
  applyTheme(getStoredTheme())
}
