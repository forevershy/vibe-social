import fs from 'node:fs'
import path from 'node:path'
import bcrypt from 'bcryptjs'
import { MEDIA_DIR, publicUser, saveDb, uid } from './db.js'

const SAMPLE_VIDEOS = [
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
  'https://www.w3schools.com/html/mov_bbb.mp4',
  'https://media.w3.org/2010/05/sintel/trailer.mp4',
  'https://download.samplelib.com/mp4/sample-15s.mp4',
  'https://download.samplelib.com/mp4/sample-10s.mp4',
]

const PICS = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80',
  'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80',
  'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=800&q=80',
  'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=800&q=80',
  'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80',
]

const avatars = (seed) =>
  `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`

export async function seedIfEmpty(db) {
  if (db.users?.length) return db

  const hash = await bcrypt.hash('demo123', 8)
  const ownerHash = await bcrypt.hash('owner123', 8)
  const now = Date.now()

  const demos = [
    ['u_maya', 'maya.moves', 'Maya Chen', 'Dance · NYC'],
    ['u_jordan', 'jordan.eats', 'Jordan Lee', 'Food + vibes'],
    ['u_nova', 'nova.beats', 'Nova', 'Producer'],
    ['u_alex', 'alex.lens', 'Alex Rivera', 'Visuals'],
    ['u_sam', 'sam.skates', 'Sam Ortiz', 'Skate'],
    ['u_riley', 'riley.fits', 'Riley', 'Fashion'],
  ]

  const users = demos.map(([id, username, displayName, bio], i) => ({
    id,
    username,
    displayName,
    email: `${username}@vibe.app`,
    password: hash,
    bio,
    avatar: avatars(username),
    badges: i === 0 ? ['verified', 'creator'] : i < 3 ? ['creator'] : [],
    followers: [],
    following: [],
    saved: [],
    reposts: [],
    coins: 200 + i * 50,
    createdAt: now - 86400000 * (30 + i),
    deniedBadges: [],
  }))

  const owner = {
    id: 'u_shy',
    username: 'shy',
    displayName: 'Shy',
    email: 'shy@vibe.app',
    password: ownerHash,
    bio: 'Vibe owner',
    avatar: avatars('shy'),
    badges: ['owner', 'verified', 'og'],
    followers: users.slice(0, 4).map((u) => u.id),
    following: users.slice(0, 3).map((u) => u.id),
    saved: [],
    reposts: [],
    coins: 5000,
    createdAt: now - 86400000 * 400,
    isOwner: true,
    deniedBadges: [],
  }

  users.forEach((u, i) => {
    if (i < 4) u.following = [...u.following, owner.id]
    if (i < 3) u.followers = [...u.followers, owner.id]
  })
  // mutual among first demos
  users[0].following.push(users[1].id)
  users[1].followers.push(users[0].id)
  users[1].following.push(users[0].id)
  users[0].followers.push(users[1].id)

  const captions = [
    'POV: you finally nailed the transition #foryou #dance',
    'This spot hits different at golden hour #travel #city',
    'Beat drop in 3… 2… 1… #music #producer',
    'Day in the life — no filter needed #vibe #daily',
    'Trying this trend so you don’t have to #trend #comedy',
    'Fit check before the night out #fashion #ootd',
  ]

  const allUsers = [owner, ...users]
  const posts = []
  let t = now - 86400000 * 10
  for (let i = 0; i < 18; i++) {
    const user = allUsers[i % allUsers.length]
    const caption = captions[i % captions.length]
    const tags = (caption.match(/#[\w]+/g) || []).map((x) => x.slice(1).toLowerCase())
    posts.push({
      id: uid('post'),
      userId: user.id,
      type: 'video',
      mediaUrl: SAMPLE_VIDEOS[i % SAMPLE_VIDEOS.length],
      posterUrl: PICS[i % PICS.length],
      caption,
      tags,
      likes: allUsers.filter((u) => u.id !== user.id).slice(0, (i % 4) + 1).map((u) => u.id),
      comments: [
        {
          id: uid('c'),
          userId: allUsers[(i + 1) % allUsers.length].id,
          text: i % 2 === 0 ? 'This is unreal 🔥' : 'Need the tutorial asap',
          createdAt: t + 3600000,
          likes: [],
        },
      ],
      shares: 12 + i * 5,
      views: 900 + i * 400,
      createdAt: t,
      soundName: `original sound - ${user.username}`,
      privacy: 'public',
    })
    t += 3600000 * 6
  }

  // friend reposts
  users[0].reposts = [{ postId: posts[1].id, createdAt: now - 7200000 }]
  users[1].reposts = [{ postId: posts[0].id, createdAt: now - 3600000 }]

  db.users = allUsers
  db.posts = posts.sort((a, b) => b.createdAt - a.createdAt)
  db.conversations = []
  db.activities = []
  saveDb(db)
  console.log('[vibe] Seeded demo users and posts')
  return db
}

export function mediaUrlFor(filename) {
  return `/media/${filename}`
}

export function saveUpload(file) {
  const ext = path.extname(file.originalname || '') || (file.mimetype?.includes('video') ? '.mp4' : '.jpg')
  const name = `${uid('media')}${ext}`
  const dest = path.join(MEDIA_DIR, name)
  fs.renameSync(file.path, dest)
  return mediaUrlFor(name)
}

export { publicUser }
