import express from 'express'
import cors from 'cors'
import multer from 'multer'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import path from 'node:path'
import fs from 'node:fs'
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'
import { ensureDirs, loadDb, saveDb, publicUser, uid, MEDIA_DIR, DATA_DIR } from './db.js'
import { seedIfEmpty, saveUpload } from './seed.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const PORT = Number(process.env.PORT || 8787)
const JWT_SECRET = process.env.VIBE_JWT_SECRET || 'vibe-dev-secret-change-me'
const upload = multer({ dest: path.join(DATA_DIR, 'tmp'), limits: { fileSize: 80 * 1024 * 1024 } })

ensureDirs()
fs.mkdirSync(path.join(DATA_DIR, 'tmp'), { recursive: true })

let db = loadDb()
await seedIfEmpty(db)
db = loadDb()

function persist() {
  saveDb(db)
}

function auth(req, _res, next) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : null
  if (!token) {
    req.user = null
    return next()
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = db.users.find((u) => u.id === payload.sub) || null
  } catch {
    req.user = null
  }
  next()
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Login required' })
  next()
}

function isOwner(u) {
  return !!u?.isOwner || u?.username?.toLowerCase() === 'shy'
}

function canView(post, viewer) {
  const privacy = post.privacy || 'public'
  if (privacy === 'public') return true
  if (!viewer) return false
  if (viewer.id === post.userId) return true
  if (privacy === 'private') return false
  return viewer.following.includes(post.userId) && viewer.followers.includes(post.userId)
}

function parseTags(caption) {
  return [...new Set((caption.match(/#[\w]+/g) || []).map((t) => t.slice(1).toLowerCase()))]
}

function sign(user) {
  return jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' })
}

function pushActivity(toUserId, fromUserId, type, postId, text) {
  if (!toUserId || toUserId === fromUserId) return
  db.activities.unshift({
    id: uid('a'),
    toUserId,
    fromUserId,
    type,
    postId,
    text,
    createdAt: Date.now(),
    read: false,
  })
  db.activities = db.activities.slice(0, 200)
}

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))
app.use(auth)
app.use('/media', express.static(MEDIA_DIR))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, name: 'Vibe', port: PORT })
})

app.get('/api/bootstrap', (req, res) => {
  const viewer = req.user
  res.json({
    me: publicUser(viewer),
    users: db.users.map(publicUser),
    posts: db.posts.filter((p) => canView(p, viewer)),
    conversations: viewer
      ? db.conversations.filter((c) => c.participants.includes(viewer.id))
      : [],
    activities: viewer ? db.activities.filter((a) => a.toUserId === viewer.id) : [],
    liveRooms: listLiveRooms(),
  })
})

app.post('/api/auth/register', async (req, res) => {
  const username = String(req.body.username || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '')
  const password = String(req.body.password || '')
  const displayName = String(req.body.displayName || username).trim() || username
  if (username.length < 3) return res.status(400).json({ error: 'Username too short' })
  if (password.length < 4) return res.status(400).json({ error: 'Password too short' })
  if (db.users.some((u) => u.username === username)) {
    return res.status(400).json({ error: 'Username taken' })
  }
  const user = {
    id: uid('u'),
    username,
    displayName,
    email: `${username}@vibe.app`,
    password: await bcrypt.hash(password, 8),
    bio: '',
    avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(username)}`,
    badges: ['early'],
    followers: [],
    following: [],
    saved: [],
    reposts: [],
    coins: 200,
    createdAt: Date.now(),
    deniedBadges: [],
  }
  db.users.push(user)
  persist()
  res.json({ token: sign(user), user: publicUser(user) })
})

app.post('/api/auth/login', async (req, res) => {
  const username = String(req.body.username || '')
    .trim()
    .toLowerCase()
  const password = String(req.body.password || '')
  const user = db.users.find((u) => u.username.toLowerCase() === username)
  if (!user) return res.status(401).json({ error: 'Invalid login' })
  const ok = await bcrypt.compare(password, user.password)
  if (!ok) return res.status(401).json({ error: 'Invalid login' })
  res.json({ token: sign(user), user: publicUser(user) })
})

app.patch('/api/me', requireAuth, (req, res) => {
  const u = req.user
  if (req.body.displayName != null) u.displayName = String(req.body.displayName).slice(0, 40)
  if (req.body.bio != null) u.bio = String(req.body.bio).slice(0, 160)
  if (req.body.avatar != null) u.avatar = String(req.body.avatar)
  if (req.body.username != null) {
    const next = String(req.body.username)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._]/g, '')
    if (next.length >= 3 && !db.users.some((x) => x.id !== u.id && x.username === next)) {
      u.username = next
    }
  }
  persist()
  res.json({ user: publicUser(u) })
})

app.post('/api/me/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  if (!newPassword || String(newPassword).length < 4) {
    return res.status(400).json({ error: 'New password too short' })
  }
  const ok = await bcrypt.compare(String(currentPassword || ''), req.user.password)
  if (!ok) return res.status(400).json({ error: 'Current password incorrect' })
  req.user.password = await bcrypt.hash(String(newPassword), 8)
  persist()
  res.json({ ok: true })
})

app.post('/api/follow/:userId', requireAuth, (req, res) => {
  const target = db.users.find((u) => u.id === req.params.userId)
  if (!target) return res.status(404).json({ error: 'User not found' })
  if (target.id === req.user.id) return res.status(400).json({ error: 'Cannot follow yourself' })
  if (!req.user.following.includes(target.id)) {
    req.user.following.push(target.id)
    target.followers.push(req.user.id)
    pushActivity(target.id, req.user.id, 'follow')
    persist()
  }
  res.json({ users: db.users.map(publicUser) })
})

app.post('/api/unfollow/:userId', requireAuth, (req, res) => {
  const target = db.users.find((u) => u.id === req.params.userId)
  if (!target) return res.status(404).json({ error: 'User not found' })
  req.user.following = req.user.following.filter((id) => id !== target.id)
  target.followers = target.followers.filter((id) => id !== req.user.id)
  persist()
  res.json({ users: db.users.map(publicUser) })
})

app.post('/api/posts', requireAuth, upload.single('media'), (req, res) => {
  let mediaUrl = req.body.mediaUrl
  let type = req.body.type === 'video' ? 'video' : 'image'
  if (req.file) {
    mediaUrl = saveUpload(req.file)
    type = req.file.mimetype.startsWith('video/') ? 'video' : 'image'
  }
  if (!mediaUrl) return res.status(400).json({ error: 'Media required' })
  const caption = String(req.body.caption || '')
  const post = {
    id: uid('post'),
    userId: req.user.id,
    type,
    mediaUrl,
    caption: caption.trim(),
    tags: parseTags(caption),
    likes: [],
    comments: [],
    shares: 0,
    views: 0,
    createdAt: Date.now(),
    soundName: req.body.soundName || `original sound - ${req.user.username}`,
    privacy: ['public', 'friends', 'private'].includes(req.body.privacy)
      ? req.body.privacy
      : 'public',
  }
  db.posts.unshift(post)
  if (!req.user.badges.includes('creator')) req.user.badges.push('creator')
  persist()
  res.json({ post })
})

app.delete('/api/posts/:id', requireAuth, (req, res) => {
  const post = db.posts.find((p) => p.id === req.params.id)
  if (!post) return res.status(404).json({ error: 'Not found' })
  if (post.userId !== req.user.id && !isOwner(req.user)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  db.posts = db.posts.filter((p) => p.id !== post.id)
  db.users.forEach((u) => {
    u.saved = u.saved.filter((id) => id !== post.id)
    u.reposts = u.reposts.filter((r) => r.postId !== post.id)
  })
  persist()
  res.json({ ok: true })
})

app.patch('/api/posts/:id/privacy', requireAuth, (req, res) => {
  const post = db.posts.find((p) => p.id === req.params.id)
  if (!post) return res.status(404).json({ error: 'Not found' })
  if (post.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' })
  if (!['public', 'friends', 'private'].includes(req.body.privacy)) {
    return res.status(400).json({ error: 'Bad privacy' })
  }
  post.privacy = req.body.privacy
  persist()
  res.json({ post })
})

app.post('/api/posts/:id/like', requireAuth, (req, res) => {
  const post = db.posts.find((p) => p.id === req.params.id)
  if (!post) return res.status(404).json({ error: 'Not found' })
  const i = post.likes.indexOf(req.user.id)
  if (i >= 0) post.likes.splice(i, 1)
  else {
    post.likes.push(req.user.id)
    pushActivity(post.userId, req.user.id, 'like', post.id)
  }
  persist()
  res.json({ post })
})

app.post('/api/posts/:id/comment', requireAuth, (req, res) => {
  const post = db.posts.find((p) => p.id === req.params.id)
  if (!post) return res.status(404).json({ error: 'Not found' })
  const text = String(req.body.text || '').trim()
  if (!text) return res.status(400).json({ error: 'Empty comment' })
  const comment = {
    id: uid('c'),
    userId: req.user.id,
    text: text.slice(0, 400),
    createdAt: Date.now(),
    likes: [],
  }
  post.comments.push(comment)
  pushActivity(post.userId, req.user.id, 'comment', post.id, text.slice(0, 80))
  persist()
  res.json({ post })
})

app.post('/api/posts/:id/save', requireAuth, (req, res) => {
  const post = db.posts.find((p) => p.id === req.params.id)
  if (!post) return res.status(404).json({ error: 'Not found' })
  const i = req.user.saved.indexOf(post.id)
  if (i >= 0) req.user.saved.splice(i, 1)
  else {
    req.user.saved.push(post.id)
    pushActivity(post.userId, req.user.id, 'save', post.id)
  }
  persist()
  res.json({ user: publicUser(req.user), users: db.users.map(publicUser) })
})

app.post('/api/posts/:id/repost', requireAuth, (req, res) => {
  const post = db.posts.find((p) => p.id === req.params.id)
  if (!post) return res.status(404).json({ error: 'Not found' })
  const i = req.user.reposts.findIndex((r) => r.postId === post.id)
  if (i >= 0) {
    req.user.reposts.splice(i, 1)
    post.shares = Math.max(0, (post.shares || 0) - 1)
  } else {
    req.user.reposts.push({ postId: post.id, createdAt: Date.now() })
    post.shares = (post.shares || 0) + 1
    pushActivity(post.userId, req.user.id, 'repost', post.id)
  }
  persist()
  res.json({ post, user: publicUser(req.user), users: db.users.map(publicUser) })
})

app.post('/api/posts/:id/view', (req, res) => {
  const post = db.posts.find((p) => p.id === req.params.id)
  if (!post) return res.status(404).json({ error: 'Not found' })
  post.views = (post.views || 0) + 1
  persist()
  res.json({ views: post.views })
})

app.post('/api/posts/:id/share', requireAuth, (req, res) => {
  const post = db.posts.find((p) => p.id === req.params.id)
  if (!post) return res.status(404).json({ error: 'Not found' })
  post.shares = (post.shares || 0) + 1
  persist()
  res.json({ post })
})

app.post('/api/messages', requireAuth, (req, res) => {
  const toUsername = String(req.body.toUsername || '').trim().toLowerCase()
  const text = String(req.body.text || '').trim()
  if (!text) return res.status(400).json({ error: 'Empty message' })
  const other = db.users.find((u) => u.username.toLowerCase() === toUsername)
  if (!other) return res.status(404).json({ error: 'User not found' })
  let convo = db.conversations.find(
    (c) => c.participants.includes(req.user.id) && c.participants.includes(other.id),
  )
  if (!convo) {
    convo = {
      id: uid('convo'),
      participants: [req.user.id, other.id],
      messages: [],
    }
    db.conversations.push(convo)
  }
  convo.messages.push({
    id: uid('m'),
    fromId: req.user.id,
    text: text.slice(0, 1000),
    createdAt: Date.now(),
    read: false,
  })
  persist()
  res.json({ conversation: convo })
})

app.post('/api/coins/buy', requireAuth, (req, res) => {
  const amount = Math.max(0, Math.floor(Number(req.body.amount) || 0))
  req.user.coins = (req.user.coins || 0) + amount
  persist()
  res.json({ user: publicUser(req.user) })
})

app.post('/api/coins/spend', requireAuth, (req, res) => {
  const amount = Math.max(0, Math.floor(Number(req.body.amount) || 0))
  if ((req.user.coins || 0) < amount) return res.status(400).json({ error: 'Not enough coins' })
  req.user.coins -= amount
  persist()
  res.json({ user: publicUser(req.user) })
})

app.post('/api/badges/:userId/:badge', requireAuth, (req, res) => {
  if (!isOwner(req.user)) return res.status(403).json({ error: 'Owner only' })
  const target = db.users.find((u) => u.id === req.params.userId)
  if (!target) return res.status(404).json({ error: 'Not found' })
  const badge = req.params.badge
  const action = req.body.action === 'revoke' ? 'revoke' : 'award'
  if (badge === 'owner' && target.id !== req.user.id) {
    return res.status(400).json({ error: 'Cannot change owner on others' })
  }
  if (action === 'award') {
    target.deniedBadges = (target.deniedBadges || []).filter((b) => b !== badge)
    if (!target.badges.includes(badge)) target.badges.push(badge)
  } else {
    target.badges = target.badges.filter((b) => b !== badge)
    target.deniedBadges = [...new Set([...(target.deniedBadges || []), badge])]
  }
  persist()
  res.json({ user: publicUser(target), users: db.users.map(publicUser) })
})

app.post('/api/owner/stats', requireAuth, (req, res) => {
  if (!isOwner(req.user)) return res.status(403).json({ error: 'Owner only' })
  const target = db.users.find((u) => u.id === (req.body.userId || req.user.id))
  if (!target) return res.status(404).json({ error: 'Not found' })
  target.statsOverride = { ...(target.statsOverride || {}) }
  if (req.body.followers != null) target.statsOverride.followers = Number(req.body.followers)
  if (req.body.likes != null) target.statsOverride.likes = Number(req.body.likes)
  if (req.body.views != null) {
    const v = Number(req.body.views)
    db.posts.forEach((p) => {
      if (p.userId === target.id) p.views = v
    })
  }
  persist()
  res.json({ user: publicUser(target), posts: db.posts })
})

app.post('/api/owner/post-counts', requireAuth, (req, res) => {
  if (!isOwner(req.user)) return res.status(403).json({ error: 'Owner only' })
  const { postId, userId, all, comments, saves, likes, shares, views } = req.body || {}
  const match = (p) => {
    if (all) return true
    if (postId) return p.id === postId
    if (userId) return p.userId === userId
    return false
  }
  db.posts.forEach((p) => {
    if (!match(p)) return
    if (views != null) p.views = Number(views)
    const o = { ...(p.countOverride || {}) }
    if (comments != null) o.comments = Number(comments)
    if (saves != null) o.saves = Number(saves)
    if (likes != null) o.likes = Number(likes)
    if (shares != null) {
      o.shares = Number(shares)
      p.shares = Number(shares)
    }
    p.countOverride = o
  })
  persist()
  res.json({ posts: db.posts })
})

/* ---------- LIVE rooms (in-memory + WS) ---------- */
/** @type {Map<string, { hostId: string, hostUsername: string, title: string, viewers: Set<string>, chat: any[] }>} */
const liveRooms = new Map()

function listLiveRooms() {
  return [...liveRooms.values()].map((r) => ({
    hostId: r.hostId,
    hostUsername: r.hostUsername,
    title: r.title,
    viewers: r.viewers.size,
  }))
}

app.get('/api/live', (_req, res) => {
  res.json({ rooms: listLiveRooms() })
})

app.post('/api/live/start', requireAuth, (req, res) => {
  const title = String(req.body.title || `${req.user.displayName} LIVE`).slice(0, 80)
  liveRooms.set(req.user.id, {
    hostId: req.user.id,
    hostUsername: req.user.username,
    title,
    viewers: new Set([req.user.id]),
    chat: [],
  })
  broadcastLive()
  res.json({ room: { hostId: req.user.id, hostUsername: req.user.username, title, viewers: 1 } })
})

app.post('/api/live/stop', requireAuth, (req, res) => {
  liveRooms.delete(req.user.id)
  broadcastLive()
  res.json({ ok: true })
})

const dist = path.join(ROOT, 'dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get(/^(?!\/api|\/media|\/ws).*/, (req, res, next) => {
    if (req.method !== 'GET') return next()
    res.sendFile(path.join(dist, 'index.html'))
  })
}

const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

/** @type {Set<import('ws').WebSocket>} */
const sockets = new Set()

function broadcastLive() {
  const payload = JSON.stringify({ type: 'live:rooms', rooms: listLiveRooms() })
  for (const ws of sockets) {
    if (ws.readyState === 1) ws.send(payload)
  }
}

function broadcastRoom(hostId, msg) {
  const payload = JSON.stringify(msg)
  for (const ws of sockets) {
    if (ws.readyState === 1 && ws.liveHostId === hostId) ws.send(payload)
  }
}

wss.on('connection', (ws) => {
  sockets.add(ws)
  ws.send(JSON.stringify({ type: 'live:rooms', rooms: listLiveRooms() }))

  ws.on('message', (raw) => {
    let data
    try {
      data = JSON.parse(String(raw))
    } catch {
      return
    }
    if (data.type === 'live:join') {
      const room = liveRooms.get(data.hostId)
      if (!room) return
      ws.liveHostId = data.hostId
      ws.viewerName = data.username || 'guest'
      room.viewers.add(ws.viewerName + Math.random())
      broadcastLive()
      broadcastRoom(data.hostId, {
        type: 'live:chat',
        system: true,
        text: `${ws.viewerName} joined`,
        at: Date.now(),
      })
      ws.send(JSON.stringify({ type: 'live:history', chat: room.chat.slice(-40) }))
    }
    if (data.type === 'live:leave') {
      ws.liveHostId = null
      broadcastLive()
    }
    if (data.type === 'live:chat' && data.hostId && data.text) {
      const room = liveRooms.get(data.hostId)
      if (!room) return
      const entry = {
        id: uid('lc'),
        username: data.username || 'guest',
        text: String(data.text).slice(0, 200),
        at: Date.now(),
      }
      room.chat.push(entry)
      room.chat = room.chat.slice(-100)
      broadcastRoom(data.hostId, { type: 'live:chat', ...entry })
    }
    if (data.type === 'live:tip' && data.hostId) {
      broadcastRoom(data.hostId, {
        type: 'live:tip',
        username: data.username || 'guest',
        amount: Number(data.amount) || 10,
        at: Date.now(),
      })
    }
  })

  ws.on('close', () => {
    sockets.delete(ws)
  })
})

server.listen(PORT, () => {
  console.log(`[vibe] API + LIVE on http://localhost:${PORT}`)
})

export { app, server, PORT }
