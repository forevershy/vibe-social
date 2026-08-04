import type { Activity, Conversation, Post, User } from '../types'

const TOKEN_KEY = 'vibe_api_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function apiBase() {
  const env = (import.meta as ImportMeta & { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL
  if (env) return env.replace(/\/$/, '')
  return ''
}

async function req<T>(
  path: string,
  opts: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const headers = new Headers(opts.headers || {})
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  let body = opts.body
  if (opts.json !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(opts.json)
  }
  const res = await fetch(`${apiBase()}${path}`, { ...opts, headers, body })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || res.statusText)
  return data as T
}

export type Bootstrap = {
  me: User | null
  users: User[]
  posts: Post[]
  conversations: Conversation[]
  activities: Activity[]
  liveRooms: { hostId: string; hostUsername: string; title: string; viewers: number }[]
}

export async function checkApi(): Promise<boolean> {
  try {
    const r = await fetch(`${apiBase()}/api/health`, { method: 'GET' })
    return r.ok
  } catch {
    return false
  }
}

export const api = {
  bootstrap: () => req<Bootstrap>('/api/bootstrap'),
  login: (username: string, password: string) =>
    req<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      json: { username, password },
    }),
  register: (username: string, password: string, displayName: string) =>
    req<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      json: { username, password, displayName },
    }),
  updateMe: (body: Partial<User>) =>
    req<{ user: User }>('/api/me', { method: 'PATCH', json: body }),
  follow: (userId: string) =>
    req<{ users: User[] }>(`/api/follow/${userId}`, { method: 'POST' }),
  unfollow: (userId: string) =>
    req<{ users: User[] }>(`/api/unfollow/${userId}`, { method: 'POST' }),
  createPost: async (input: {
    type: string
    mediaUrl?: string
    caption: string
    soundName?: string
    privacy?: string
    file?: File
  }) => {
    if (input.file) {
      const fd = new FormData()
      fd.append('media', input.file)
      fd.append('caption', input.caption)
      if (input.soundName) fd.append('soundName', input.soundName)
      if (input.privacy) fd.append('privacy', input.privacy)
      const headers = new Headers()
      const token = getToken()
      if (token) headers.set('Authorization', `Bearer ${token}`)
      const res = await fetch(`${apiBase()}/api/posts`, { method: 'POST', headers, body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      return data as { post: Post }
    }
    return req<{ post: Post }>('/api/posts', {
      method: 'POST',
      json: input,
    })
  },
  deletePost: (id: string) => req(`/api/posts/${id}`, { method: 'DELETE' }),
  setPrivacy: (id: string, privacy: string) =>
    req<{ post: Post }>(`/api/posts/${id}/privacy`, { method: 'PATCH', json: { privacy } }),
  like: (id: string) => req<{ post: Post }>(`/api/posts/${id}/like`, { method: 'POST' }),
  comment: (id: string, text: string) =>
    req<{ post: Post }>(`/api/posts/${id}/comment`, { method: 'POST', json: { text } }),
  save: (id: string) =>
    req<{ user: User; users: User[] }>(`/api/posts/${id}/save`, { method: 'POST' }),
  repost: (id: string) =>
    req<{ post: Post; user: User; users: User[] }>(`/api/posts/${id}/repost`, {
      method: 'POST',
    }),
  view: (id: string) => req(`/api/posts/${id}/view`, { method: 'POST' }),
  share: (id: string) => req<{ post: Post }>(`/api/posts/${id}/share`, { method: 'POST' }),
  sendMessage: (toUsername: string, text: string) =>
    req<{ conversation: Conversation }>('/api/messages', {
      method: 'POST',
      json: { toUsername, text },
    }),
  buyCoins: (amount: number) =>
    req<{ user: User }>('/api/coins/buy', { method: 'POST', json: { amount } }),
  spendCoins: (amount: number) =>
    req<{ user: User }>('/api/coins/spend', { method: 'POST', json: { amount } }),
  badge: (userId: string, badge: string, action: 'award' | 'revoke') =>
    req<{ user: User; users: User[] }>(`/api/badges/${userId}/${badge}`, {
      method: 'POST',
      json: { action },
    }),
  ownerStats: (body: Record<string, unknown>) =>
    req('/api/owner/stats', { method: 'POST', json: body }),
  ownerPostCounts: (body: Record<string, unknown>) =>
    req('/api/owner/post-counts', { method: 'POST', json: body }),
  liveStart: (title?: string) =>
    req('/api/live/start', { method: 'POST', json: { title } }),
  liveStop: () => req('/api/live/stop', { method: 'POST' }),
  liveList: () => req<{ rooms: Bootstrap['liveRooms'] }>('/api/live'),
}

export function wsUrl() {
  const base = apiBase()
  if (base) {
    const u = new URL(base)
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'
    u.pathname = '/ws'
    return u.toString()
  }
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${location.host}/ws`
}
