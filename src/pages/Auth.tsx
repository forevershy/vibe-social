import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import './Auth.css'

export function AuthPage() {
  const { login, signup } = useApp()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/'
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    username: '',
    displayName: '',
    email: '',
    password: '',
  })

  const goNext = () => {
    const safe = next.startsWith('/') ? next : '/'
    nav(safe)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (mode === 'login') {
      const res = await login(form.username || form.email, form.password)
      if (!res.ok) return setError(res.error || 'Login failed')
      goNext()
    } else {
      const res = await signup(form)
      if (!res.ok) return setError(res.error || 'Signup failed')
      goNext()
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-glow" />
      <div className="auth-card">
        <div className="brand">
          <span className="logo">Vibe</span>
          <p>Make it. Post it. Go viral.</p>
        </div>

        <div className="mode-toggle">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            Log in
          </button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>
            Sign up
          </button>
        </div>

        <form onSubmit={onSubmit}>
          {mode === 'signup' && (
            <>
              <label>
                Display name
                <input
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="Your name"
                  required
                />
              </label>
              <label>
                Username
                <input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="username"
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@email.com"
                  required
                />
              </label>
            </>
          )}
          {mode === 'login' && (
            <label>
              Username or email
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="username"
                required
              />
            </label>
          )}
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              required
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit">
            {mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        <p className="auth-back">
          <Link to={next.startsWith('/') ? next : '/'}>Continue browsing</Link>
        </p>
      </div>
    </div>
  )
}
