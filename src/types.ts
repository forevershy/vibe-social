export type BadgeId =
  | 'verified'
  | 'creator'
  | 'rising'
  | 'og'
  | 'top_creator'
  | 'early'
  | 'owner'

export interface Badge {
  id: BadgeId
  label: string
  description: string
  color: string
  emoji: string
}

export interface User {
  id: string
  username: string
  displayName: string
  email: string
  password: string
  bio: string
  avatar: string
  badges: BadgeId[]
  followers: string[]
  following: string[]
  saved: string[]
  /** Posts this user has reposted */
  reposts: RepostEntry[]
  coins: number
  createdAt: number
  /** Last time display name was changed (7-day cooldown like TikTok) */
  nameChangedAt?: number
  /** Owner-panel display overrides (fake counts) */
  statsOverride?: {
    followers?: number
    likes?: number
  }
  /** Badges the user (or owner) has explicitly removed — won't be auto-reapplied */
  deniedBadges?: BadgeId[]
  isOwner?: boolean
}

export interface RepostEntry {
  postId: string
  createdAt: number
}

export interface Comment {
  id: string
  userId: string
  text: string
  createdAt: number
  likes: string[]
}

export interface Post {
  id: string
  userId: string
  type: 'video' | 'image'
  mediaUrl: string
  posterUrl?: string
  caption: string
  tags: string[]
  likes: string[]
  comments: Comment[]
  shares: number
  views: number
  createdAt: number
  soundName?: string
  /** Who can see this video */
  privacy?: 'public' | 'friends' | 'private'
  /** Owner-panel display overrides for engagement counts */
  countOverride?: {
    comments?: number
    saves?: number
    likes?: number
    /** Shown on the share / repost action */
    shares?: number
  }
}

export interface ChatMessage {
  id: string
  fromId: string
  text: string
  createdAt: number
  read: boolean
}

export interface Conversation {
  id: string
  participants: [string, string]
  messages: ChatMessage[]
}

export type ActivityType = 'like' | 'follow' | 'comment' | 'repost' | 'save'

export interface Activity {
  id: string
  toUserId: string
  fromUserId: string
  type: ActivityType
  postId?: string
  text?: string
  createdAt: number
  read: boolean
}

export interface AppState {
  users: User[]
  posts: Post[]
  conversations: Conversation[]
  activities: Activity[]
  currentUserId: string | null
}

export type Tab = 'foryou' | 'following' | 'create' | 'search' | 'profile'
