import type { AppState, Post, User, RepostEntry } from '../types'
import { uid } from './utils'

const KEY = 'vibe_social_v6'

const avatars = (seed: string) =>
  `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`

const pics = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80',
  'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80',
  'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=800&q=80',
  'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=800&q=80',
  'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80',
  'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80',
]

/** Public sample MP4s that allow hotlinking (GCS sample bucket is often 403 now) */
export const sampleVideos = [
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
  'https://www.w3schools.com/html/mov_bbb.mp4',
  'https://media.w3.org/2010/05/sintel/trailer.mp4',
  'https://download.samplelib.com/mp4/sample-15s.mp4',
  'https://download.samplelib.com/mp4/sample-10s.mp4',
  'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
  'https://filesamples.com/samples/video/mp4/sample_640x360.mp4',
]

const BROKEN_VIDEO_HOSTS = [
  'commondatastorage.googleapis.com/gtv-videos-bucket',
  'storage.googleapis.com/gtv-videos-bucket',
]

/** Rewrite dead demo URLs so existing localStorage feeds keep playing */
export function fixMediaUrl(url: string, salt = 0): string {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url
  if (BROKEN_VIDEO_HOSTS.some((h) => url.includes(h))) {
    return sampleVideos[Math.abs(salt) % sampleVideos.length]
  }
  return url
}

export function createOwnerUser(): User {
  return {
    id: 'u_shy',
    username: 'shy',
    displayName: 'Shy',
    email: 'shy@vibe.app',
    password: 'owner123',
    bio: 'Vibe owner. Awarding badges from the Owner Panel.',
    avatar: avatars('shy'),
    badges: ['owner', 'verified', 'og'],
    followers: [],
    following: [],
    saved: [],
    reposts: [],
    coins: 5000,
    createdAt: Date.now() - 86400000 * 400,
    isOwner: true,
  }
}

function normalizeReposts(raw: unknown): RepostEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (typeof item === 'string') return { postId: item, createdAt: Date.now() - 3600000 }
      if (item && typeof item === 'object' && 'postId' in item) {
        const e = item as RepostEntry
        return {
          postId: String(e.postId),
          createdAt: typeof e.createdAt === 'number' ? e.createdAt : Date.now(),
        }
      }
      return null
    })
    .filter((x): x is RepostEntry => !!x && !!x.postId)
}

function withUserDefaults<T extends Partial<User> & { id: string }>(u: T): User {
  return {
    username: u.username || 'user',
    displayName: u.displayName || u.username || 'User',
    email: u.email || `${u.id}@vibe.app`,
    password: u.password || 'demo123',
    bio: u.bio || '',
    avatar: u.avatar || avatars(u.id),
    badges: u.badges || [],
    followers: u.followers || [],
    following: u.following || [],
    saved: u.saved || [],
    reposts: normalizeReposts(u.reposts),
    coins: typeof u.coins === 'number' ? u.coins : 200,
    createdAt: u.createdAt || Date.now(),
    nameChangedAt: u.nameChangedAt,
    statsOverride: u.statsOverride,
    deniedBadges: u.deniedBadges,
    isOwner: u.isOwner,
    id: u.id,
  }
}

function seedUsers(): User[] {
  const now = Date.now()
  const demos: Omit<User, 'followers' | 'following' | 'saved' | 'reposts' | 'coins'>[] = [
    {
      id: 'u_maya',
      username: 'maya.moves',
      displayName: 'Maya Chen',
      email: 'maya@vibe.app',
      password: 'demo123',
      bio: 'Dance · NYC · Teaching freestyle every Friday 🕺',
      avatar: avatars('maya'),
      badges: ['verified', 'creator', 'top_creator'],
      createdAt: now - 86400000 * 120,
    },
    {
      id: 'u_jordan',
      username: 'jordan.eats',
      displayName: 'Jordan Lee',
      email: 'jordan@vibe.app',
      password: 'demo123',
      bio: 'Street food hunter. If it sizzles, I film it.',
      avatar: avatars('jordan'),
      badges: ['creator', 'rising'],
      createdAt: now - 86400000 * 80,
    },
    {
      id: 'u_nova',
      username: 'nova.beats',
      displayName: 'Nova Beats',
      email: 'nova@vibe.app',
      password: 'demo123',
      bio: 'Producer · Lo-fi nights · New drop Fridays',
      avatar: avatars('nova'),
      badges: ['verified', 'creator'],
      createdAt: now - 86400000 * 200,
    },
    {
      id: 'u_alex',
      username: 'alex.lens',
      displayName: 'Alex Rivera',
      email: 'alex@vibe.app',
      password: 'demo123',
      bio: 'Travel clips & city nights. Based everywhere.',
      avatar: avatars('alex'),
      badges: ['rising', 'early'],
      createdAt: now - 86400000 * 40,
    },
    {
      id: 'u_sam',
      username: 'sam.skates',
      displayName: 'Sam Ortiz',
      email: 'sam@vibe.app',
      password: 'demo123',
      bio: 'Skate tricks until the battery dies 🛹',
      avatar: avatars('sam'),
      badges: ['og', 'creator'],
      createdAt: now - 86400000 * 300,
    },
    {
      id: 'u_riley',
      username: 'riley.fits',
      displayName: 'Riley Park',
      email: 'riley@vibe.app',
      password: 'demo123',
      bio: 'Fits of the day. Thrifting tips. Soft chaos.',
      avatar: avatars('riley'),
      badges: ['verified', 'rising'],
      createdAt: now - 86400000 * 90,
    },
  ]

  const demoUsers = demos.map((u, i) => {
    const others = demos.filter((_, j) => j !== i).map((x) => x.id)
    return withUserDefaults({
      ...u,
      followers: others.slice(0, 2 + (i % 3)),
      following: others.slice(1, 3 + (i % 2)),
      saved: [],
      reposts: [],
      coins: 150 + i * 40,
    })
  })

  const owner = createOwnerUser()
  owner.followers = demoUsers.slice(0, 4).map((u) => u.id)
  owner.following = demoUsers.slice(0, 3).map((u) => u.id)
  // Mutual follows so Follow back / Friends works out of the box
  demoUsers.forEach((u, i) => {
    if (i < 4 && !u.following.includes(owner.id)) {
      u.following = [...u.following, owner.id]
    }
    if (i < 3 && !u.followers.includes(owner.id)) {
      u.followers = [...u.followers, owner.id]
    }
  })
  return [owner, ...demoUsers]
}

function seedPosts(users: User[]): Post[] {
  const captions = [
    'POV: you finally nailed the transition #foryou #dance',
    'This spot hits different at golden hour #travel #city',
    'Beat drop in 3… 2… 1… #music #producer',
    'Day in the life — no filter needed #vibe #daily',
    'Trying this trend so you don’t have to #trend #comedy',
    'Fit check before the night out #fashion #ootd',
    'Skate park sessions never miss #skate #sport',
    'Recipe that took 10 minutes and zero stress #food',
    'Night drive playlist loading… #cars #aesthetic',
    'Behind the scenes of today’s shoot #creator #bts',
    'When the lighting is this good you just film #photo',
    'New sound, who this? #sound #viral',
  ]

  const sounds = [
    'original sound - maya.moves',
    'lofi loop - nova.beats',
    'city nights - vibe audio',
    'trending audio · summer rush',
    'original sound - sam.skates',
  ]

  const posts: Post[] = []
  let t = Date.now() - 86400000 * 14

  for (let i = 0; i < 24; i++) {
    const user = users[i % users.length]
    const caption = captions[i % captions.length]
    const tags = (caption.match(/#[\w]+/g) || []).map((x) => x.slice(1).toLowerCase())
    const likers = users
      .filter((u) => u.id !== user.id)
      .slice(0, (i % 5) + 1)
      .map((u) => u.id)

    posts.push({
      id: uid('post'),
      userId: user.id,
      type: 'video',
      mediaUrl: sampleVideos[i % sampleVideos.length],
      posterUrl: pics[(i + 3) % pics.length],
      caption,
      tags,
      likes: likers,
      comments: [
        {
          id: uid('c'),
          userId: users[(i + 1) % users.length].id,
          text: i % 2 === 0 ? 'This is unreal 🔥' : 'Need the tutorial asap',
          createdAt: t + 3600000,
          likes: [],
        },
        {
          id: uid('c'),
          userId: users[(i + 2) % users.length].id,
          text: 'Saved this for later',
          createdAt: t + 7200000,
          likes: [users[0].id],
        },
      ],
      shares: 12 + i * 7,
      views: 1200 + i * 840,
      createdAt: t,
      soundName: sounds[i % sounds.length],
    })
    t += 3600000 * 8
  }

  return posts.sort((a, b) => b.createdAt - a.createdAt)
}

export function createSeedState(): AppState {
  const users = seedUsers()
  const posts = seedPosts(users)
  const now = Date.now()

  // Seed friend-style reposts so the feed can show "X reposted"
  if (posts[0] && posts[1] && posts[2]) {
    const maya = users.find((u) => u.id === 'u_maya')
    const jordan = users.find((u) => u.id === 'u_jordan')
    const nova = users.find((u) => u.id === 'u_nova')
    if (maya) {
      maya.reposts = [
        { postId: posts[1].id, createdAt: now - 3600000 * 2 },
        { postId: posts[3]?.id || posts[0].id, createdAt: now - 3600000 * 8 },
      ]
      maya.following = [...new Set([...maya.following, posts[1].userId])]
    }
    if (jordan) {
      jordan.reposts = [{ postId: posts[0].id, createdAt: now - 3600000 * 5 }]
    }
    if (nova) {
      nova.reposts = [{ postId: posts[2].id, createdAt: now - 7200000 }]
    }
    // Make shy follow maya/jordan so friend repost banners show when logged in as owner
    const shy = users.find((u) => u.id === 'u_shy')
    if (shy) {
      shy.following = [...new Set([...shy.following, 'u_maya', 'u_jordan', 'u_nova'])]
    }
  }

  return {
    users,
    posts,
    conversations: [
      {
        id: 'convo_shy_maya',
        participants: ['u_shy', 'u_maya'],
        messages: [
          {
            id: uid('m'),
            fromId: 'u_maya',
            text: 'Hey! Loved your latest drop 🔥',
            createdAt: now - 3600000 * 5,
            read: false,
          },
          {
            id: uid('m'),
            fromId: 'u_maya',
            text: 'Drop the sound link?',
            createdAt: now - 3600000 * 4,
            read: false,
          },
          {
            id: uid('m'),
            fromId: 'u_maya',
            text: 'Also collab soon?',
            createdAt: now - 3600000 * 3,
            read: false,
          },
        ],
      },
      {
        id: 'convo_maya_nova',
        participants: ['u_maya', 'u_nova'],
        messages: [
          {
            id: uid('m'),
            fromId: 'u_nova',
            text: 'New beat for you',
            createdAt: now - 3600000,
            read: false,
          },
          {
            id: uid('m'),
            fromId: 'u_nova',
            text: 'Lmk what you think',
            createdAt: now - 3500000,
            read: false,
          },
        ],
      },
      {
        id: 'convo_maya_alex',
        participants: ['u_maya', 'u_alex'],
        messages: [
          {
            id: uid('m'),
            fromId: 'u_alex',
            text: 'Shot looks insane',
            createdAt: now - 1800000,
            read: false,
          },
        ],
      },
    ],
    activities: [
      {
        id: uid('a'),
        toUserId: 'u_shy',
        fromUserId: 'u_maya',
        type: 'follow',
        createdAt: now - 8600000,
        read: false,
      },
      {
        id: uid('a'),
        toUserId: 'u_shy',
        fromUserId: 'u_jordan',
        type: 'like',
        postId: posts[0]?.id,
        createdAt: now - 7200000,
        read: false,
      },
      {
        id: uid('a'),
        toUserId: 'u_maya',
        fromUserId: 'u_nova',
        type: 'comment',
        postId: posts[1]?.id,
        text: 'Tutorial please',
        createdAt: now - 5000000,
        read: false,
      },
      {
        id: uid('a'),
        toUserId: 'u_maya',
        fromUserId: 'u_riley',
        type: 'like',
        postId: posts[2]?.id,
        createdAt: now - 4000000,
        read: false,
      },
      {
        id: uid('a'),
        toUserId: 'u_maya',
        fromUserId: 'u_sam',
        type: 'follow',
        createdAt: now - 3000000,
        read: false,
      },
    ],
    currentUserId: 'u_shy',
  }
}

function normalizeState(raw: AppState): AppState {
  const withOwner = (() => {
    const existing = raw.users.find(
      (u) => u.id === 'u_shy' || u.username?.toLowerCase() === 'shy',
    )
    if (existing) {
      return {
        ...raw,
        users: raw.users.map((u) => {
          if (u.id !== existing.id) return u
          const denied = new Set(u.deniedBadges || [])
          const forced = (['owner', 'verified'] as const).filter((b) => !denied.has(b))
          return {
            ...u,
            username: 'shy',
            isOwner: true,
            badges: [...new Set([...(u.badges || []).filter((b) => !denied.has(b)), ...forced])],
          }
        }),
      }
    }
    return { ...raw, users: [createOwnerUser(), ...raw.users] }
  })()

  const shy = withOwner.users.find(
    (u) => u.id === 'u_shy' || u.username?.toLowerCase() === 'shy',
  )

  const currentUserId =
    withOwner.currentUserId &&
    withOwner.users.some((u) => u.id === withOwner.currentUserId)
      ? withOwner.currentUserId
      : shy?.id || null

  const posts = (withOwner.posts || []).map((p, i) => {
    const mediaUrl = fixMediaUrl(p.mediaUrl, i + (p.id?.length || 0))
    return mediaUrl === p.mediaUrl ? p : { ...p, mediaUrl }
  })

  return {
    ...withOwner,
    users: withOwner.users.map((u) => withUserDefaults(u)),
    posts,
    conversations: withOwner.conversations || [],
    activities: withOwner.activities || [],
    currentUserId,
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      const seeded = createSeedState()
      saveState(seeded)
      return seeded
    }
    const state = normalizeState(JSON.parse(raw) as AppState)
    saveState(state)
    return state
  } catch {
    const seeded = createSeedState()
    saveState(seeded)
    return seeded
  }
}

export function saveState(state: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Storage full — keep session alive without persisting huge media
    const slim: AppState = {
      ...state,
      posts: state.posts.map((p) =>
        p.mediaUrl.startsWith('data:')
          ? { ...p, mediaUrl: p.posterUrl || pics[0] }
          : p,
      ),
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(slim))
    } catch {
      /* ignore */
    }
  }
}

export function resetDemo() {
  localStorage.removeItem(KEY)
  return createSeedState()
}
