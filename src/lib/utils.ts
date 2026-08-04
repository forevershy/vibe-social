import type { Badge, BadgeId } from '../types'

export const BADGES: Record<BadgeId, Badge> = {
  verified: {
    id: 'verified',
    label: 'Verified',
    description: 'Authentic and notable account',
    color: '#20D5EC',
    emoji: '✅',
  },
  creator: {
    id: 'creator',
    label: 'Creator',
    description: 'Active content creator',
    color: '#FE2C55',
    emoji: '🎬',
  },
  rising: {
    id: 'rising',
    label: 'Rising Star',
    description: 'Fast-growing creator',
    color: '#F5A623',
    emoji: '🌟',
  },
  og: {
    id: 'og',
    label: 'OG',
    description: 'Early Vibe member',
    color: '#A855F7',
    emoji: '🔥',
  },
  top_creator: {
    id: 'top_creator',
    label: 'Top Creator',
    description: 'High engagement creator',
    color: '#22C55E',
    emoji: '🏆',
  },
  early: {
    id: 'early',
    label: 'Early Adopter',
    description: 'Joined in the first wave',
    color: '#38BDF8',
    emoji: '🌱',
  },
  owner: {
    id: 'owner',
    label: 'Owner',
    description: 'Platform owner — can award badges',
    color: '#FFD700',
    emoji: '👑',
  },
}

/** Badges the owner can grant/revoke from the panel */
export const OWNER_GRANTABLE: BadgeId[] = [
  'verified',
  'creator',
  'rising',
  'og',
  'top_creator',
  'early',
]

/** Badges editable on your own profile (including showing/hiding the crown) */
export const SELF_EDITABLE_BADGES: BadgeId[] = [
  'owner',
  'verified',
  'creator',
  'rising',
  'og',
  'top_creator',
  'early',
]

export function isOwnerUser(user: { username: string; isOwner?: boolean } | null | undefined) {
  if (!user) return false
  return !!user.isOwner || user.username.toLowerCase() === 'shy'
}

/** Whether a viewer may see a post given privacy + friendship */
export function canViewPost(
  post: { userId: string; privacy?: 'public' | 'friends' | 'private' },
  viewer: { id: string; following: string[]; followers: string[] } | null | undefined,
): boolean {
  const privacy = post.privacy || 'public'
  if (privacy === 'public') return true
  if (!viewer) return false
  if (viewer.id === post.userId) return true
  if (privacy === 'private') return false
  // friends = mutual follow
  return (
    viewer.following.includes(post.userId) && viewer.followers.includes(post.userId)
  )
}

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}

export function displayCommentCount(post: {
  comments: { length: number }
  countOverride?: { comments?: number }
}): number {
  return post.countOverride?.comments ?? post.comments.length
}

export function displayLikeCount(post: {
  likes: { length: number }
  countOverride?: { likes?: number }
}): number {
  return post.countOverride?.likes ?? post.likes.length
}

export function displaySaveCount(
  post: { id: string; countOverride?: { saves?: number } },
  users: { saved: string[] }[],
): number {
  if (post.countOverride?.saves != null) return post.countOverride.saves
  return users.filter((u) => u.saved.includes(post.id)).length
}

export function displayShareCount(post: {
  shares: number
  countOverride?: { shares?: number }
}): number {
  return post.countOverride?.shares ?? post.shares
}

export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return `${Math.floor(d / 7)}w`
}

export function parseTags(caption: string): string[] {
  const matches = caption.match(/#[\w]+/g) || []
  return [...new Set(matches.map((t) => t.slice(1).toLowerCase()))]
}

export async function fileToDataUrl(file: File, maxDim = 1280): Promise<string> {
  if (file.type.startsWith('video/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = reject
    img.src = url
  })
}
