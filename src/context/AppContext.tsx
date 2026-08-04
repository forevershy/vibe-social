import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { loadState, saveState } from '../lib/storage'
import { api, checkApi, setToken } from '../lib/api'
import { canViewPost, isOwnerUser, parseTags, uid } from '../lib/utils'
import type {
  Activity,
  ActivityType,
  BadgeId,
  Comment,
  Conversation,
  Post,
  User,
} from '../types'

interface AuthResult {
  ok: boolean
  error?: string
}

interface AppContextValue {
  users: User[]
  posts: Post[]
  conversations: Conversation[]
  activities: Activity[]
  currentUser: User | null
  ready: boolean
  toast: string
  showToast: (msg: string) => void
  apiOnline: boolean
  signup: (data: {
    username: string
    displayName: string
    email: string
    password: string
  }) => Promise<AuthResult>
  login: (usernameOrEmail: string, password: string) => Promise<AuthResult>
  logout: () => void
  updateProfile: (
    patch: Partial<Pick<User, 'displayName' | 'bio' | 'avatar' | 'username'>>,
  ) => Promise<AuthResult>
  follow: (userId: string) => void
  unfollow: (userId: string) => void
  createPost: (input: {
    type: 'video' | 'image'
    mediaUrl: string
    caption: string
    soundName?: string
    privacy?: 'public' | 'friends' | 'private'
  }) => void
  deletePost: (postId: string) => { ok: boolean; error?: string }
  setPostPrivacy: (
    postId: string,
    privacy: 'public' | 'friends' | 'private',
  ) => { ok: boolean; error?: string }
  toggleLike: (postId: string) => { ok: boolean; needAuth?: boolean }
  toggleSave: (postId: string) => { ok: boolean; needAuth?: boolean }
  toggleRepost: (postId: string) => { ok: boolean; needAuth?: boolean }
  isSaved: (postId: string) => boolean
  isReposted: (postId: string) => boolean
  addComment: (postId: string, text: string) => void
  sharePost: (postId: string) => void
  bumpView: (postId: string) => void
  buyCoins: (amount: number, costLabel: string) => void
  spendCoins: (amount: number, reason: string) => { ok: boolean; error?: string }
  sendMessage: (toUserId: string, text: string) => {
    ok: boolean
    error?: string
    conversationId?: string
  }
  markConversationRead: (conversationId: string) => void
  markActivitiesRead: () => void
  getUser: (id: string) => User | undefined
  isFollowing: (userId: string) => boolean
  isOwner: boolean
  unreadMessages: number
  unreadActivity: number
  awardBadge: (userId: string, badge: BadgeId) => { ok: boolean; error?: string }
  revokeBadge: (userId: string, badge: BadgeId) => { ok: boolean; error?: string }
  /** Owner only — set display followers/likes and/or post views */
  setOwnerStats: (input: {
    userId?: string
    followers?: number
    likes?: number
    views?: number
  }) => { ok: boolean; error?: string }
  /** Owner only — set comment/favorite/like/repost display counts on one or many videos */
  setPostCounts: (input: {
    postId?: string
    /** Apply to every post by this user */
    userId?: string
    /** Apply to every post on the platform */
    all?: boolean
    comments?: number
    saves?: number
    likes?: number
    shares?: number
    views?: number
  }) => { ok: boolean; error?: string }
  search: (q: string) => { users: User[]; posts: Post[]; tags: string[] }
  forYouFeed: Post[]
  followingFeed: Post[]
  friendsFeed: Post[]
  friends: User[]
}

const AppContext = createContext<AppContextValue | null>(null)

function computeBadges(user: User, posts: Post[]): BadgeId[] {
  const denied = new Set(user.deniedBadges || [])
  const set = new Set<BadgeId>(user.badges.filter((b) => !denied.has(b)))
  const userPosts = posts.filter((p) => p.userId === user.id)
  const totalLikes = userPosts.reduce((a, p) => a + p.likes.length, 0)
  if (userPosts.length >= 1 && !denied.has('creator')) set.add('creator')
  if (user.followers.length >= 3 && !denied.has('rising')) set.add('rising')
  if (totalLikes >= 8 && !denied.has('top_creator')) set.add('top_creator')
  if (Date.now() - user.createdAt > 86400000 * 100 && !denied.has('og')) set.add('og')
  // Never strip owner/verified if present unless denied
  user.badges.forEach((b) => {
    if (!denied.has(b)) set.add(b)
  })
  return [...set]
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [toast, setToast] = useState('')
  const [apiOnline, setApiOnline] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const online = await checkApi()
      if (cancelled) return
      if (online) {
        try {
          const boot = await api.bootstrap()
          if (cancelled) return
          setApiOnline(true)
          setUsers(boot.users)
          setPosts(boot.posts)
          setConversations(boot.conversations || [])
          setActivities(boot.activities || [])
          // Restore session from JWT; fall back to last local user id if still valid
          const local = loadState()
          const meId =
            boot.me?.id ||
            (local.currentUserId && boot.users.some((u) => u.id === local.currentUserId)
              ? local.currentUserId
              : null)
          setCurrentUserId(meId)
          setReady(true)
          return
        } catch {
          /* fall through to local */
        }
      }
      const s = loadState()
      setUsers(s.users)
      setPosts(s.posts)
      setConversations(s.conversations || [])
      setActivities(s.activities || [])
      setCurrentUserId(s.currentUserId || null)
      setApiOnline(false)
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    // Always mirror to localStorage so profile/session survive app restarts
    // even if the API is down next launch.
    saveState({ users, posts, conversations, activities, currentUserId })
  }, [users, posts, conversations, activities, currentUserId, ready])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 2200)
  }, [])

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) || null,
    [users, currentUserId],
  )

  const getUser = useCallback((id: string) => users.find((u) => u.id === id), [users])

  const isFollowing = useCallback(
    (userId: string) => !!currentUser?.following.includes(userId),
    [currentUser],
  )

  const pushActivity = useCallback(
    (toUserId: string, type: ActivityType, postId?: string, text?: string) => {
      if (!currentUserId || toUserId === currentUserId) return
      const item: Activity = {
        id: uid('a'),
        toUserId,
        fromUserId: currentUserId,
        type,
        postId,
        text,
        createdAt: Date.now(),
        read: false,
      }
      setActivities((prev) => [item, ...prev].slice(0, 200))
    },
    [currentUserId],
  )

  const signup = useCallback(
    async (data: {
      username: string
      displayName: string
      email: string
      password: string
    }): Promise<AuthResult> => {
      if (apiOnline) {
        try {
          const res = await api.register(data.username, data.password, data.displayName)
          setToken(res.token)
          const boot = await api.bootstrap()
          setUsers(boot.users)
          setPosts(boot.posts)
          setConversations(boot.conversations || [])
          setActivities(boot.activities || [])
          setCurrentUserId(res.user.id)
          showToast('Welcome to Vibe!')
          return { ok: true }
        } catch (e) {
          return { ok: false, error: e instanceof Error ? e.message : 'Signup failed' }
        }
      }
      const username = data.username.trim().toLowerCase().replace(/[^a-z0-9._]/g, '')
      const email = data.email.trim().toLowerCase()
      if (username.length < 3) return { ok: false, error: 'Username must be at least 3 characters' }
      if (data.password.length < 4) return { ok: false, error: 'Password must be at least 4 characters' }
      if (users.some((u) => u.username === username)) return { ok: false, error: 'Username already taken' }
      if (users.some((u) => u.email === email)) return { ok: false, error: 'Email already in use' }

      const user: User = {
        id: uid('u'),
        username,
        displayName: data.displayName.trim() || username,
        email,
        password: data.password,
        bio: '',
        avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(username)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`,
        badges: ['early'],
        followers: [],
        following: [],
        saved: [],
        reposts: [],
        coins: 100,
        createdAt: Date.now(),
      }
      setUsers((prev) => [...prev, user])
      setCurrentUserId(user.id)
      showToast('Welcome to Vibe!')
      return { ok: true }
    },
    [users, showToast, apiOnline],
  )

  const login = useCallback(
    async (usernameOrEmail: string, password: string): Promise<AuthResult> => {
      if (apiOnline) {
        try {
          const res = await api.login(usernameOrEmail, password)
          setToken(res.token)
          const boot = await api.bootstrap()
          setUsers(boot.users)
          setPosts(boot.posts)
          setConversations(boot.conversations || [])
          setActivities(boot.activities || [])
          setCurrentUserId(res.user.id)
          showToast(`Welcome back, ${res.user.displayName}`)
          return { ok: true }
        } catch (e) {
          return { ok: false, error: e instanceof Error ? e.message : 'Login failed' }
        }
      }
      const key = usernameOrEmail.trim().toLowerCase()
      const user = users.find(
        (u) => (u.username === key || u.email === key) && u.password === password,
      )
      if (!user) return { ok: false, error: 'Invalid username/email or password' }
      setCurrentUserId(user.id)
      showToast(`Welcome back, ${user.displayName}`)
      return { ok: true }
    },
    [users, showToast, apiOnline],
  )

  const logout = useCallback(() => {
    setToken(null)
    setCurrentUserId(null)
    showToast('Logged out')
  }, [showToast])

  const updateProfile = useCallback(
    async (
      patch: Partial<Pick<User, 'displayName' | 'bio' | 'avatar' | 'username'>>,
    ): Promise<AuthResult> => {
      if (!currentUserId) return { ok: false, error: 'Not logged in' }
      const me = users.find((u) => u.id === currentUserId)
      if (!me) return { ok: false, error: 'Not logged in' }

      const nextPatch = { ...patch }

      if (nextPatch.username) {
        const username = nextPatch.username.trim().toLowerCase().replace(/[^a-z0-9._]/g, '')
        if (username.length < 3) return { ok: false, error: 'Username too short' }
        if (users.some((u) => u.username === username && u.id !== currentUserId)) {
          return { ok: false, error: 'Username already taken' }
        }
        nextPatch.username = username
      }

      if (nextPatch.bio !== undefined) {
        nextPatch.bio = nextPatch.bio.slice(0, 160)
      }

      if (nextPatch.displayName !== undefined) {
        const nextName = nextPatch.displayName.trim() || me.username
        nextPatch.displayName = nextName
        if (nextName !== me.displayName) {
          const cooldown = 7 * 24 * 60 * 60 * 1000
          if (me.nameChangedAt && Date.now() - me.nameChangedAt < cooldown) {
            return { ok: false, error: 'Nickname can only be changed once every 7 days' }
          }
        }
      }

      if (apiOnline) {
        try {
          const res = await api.updateMe(nextPatch)
          setUsers((prev) =>
            prev.map((u) => {
              if (u.id !== currentUserId) return u
              const next = { ...u, ...res.user }
              if (
                nextPatch.displayName !== undefined &&
                nextPatch.displayName !== me.displayName
              ) {
                next.nameChangedAt = Date.now()
              }
              return next
            }),
          )
          showToast('Profile saved')
          return { ok: true }
        } catch (e) {
          return { ok: false, error: e instanceof Error ? e.message : 'Could not save profile' }
        }
      }

      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== currentUserId) return u
          const next = { ...u, ...nextPatch }
          if (
            nextPatch.displayName !== undefined &&
            nextPatch.displayName !== u.displayName
          ) {
            next.nameChangedAt = Date.now()
          }
          return next
        }),
      )
      // Flush immediately so closing the app right after save still keeps data
      const nextUsers = users.map((u) => {
        if (u.id !== currentUserId) return u
        const next = { ...u, ...nextPatch }
        if (
          nextPatch.displayName !== undefined &&
          nextPatch.displayName !== u.displayName
        ) {
          next.nameChangedAt = Date.now()
        }
        return next
      })
      saveState({
        users: nextUsers,
        posts,
        conversations,
        activities,
        currentUserId,
      })
      showToast('Profile saved')
      return { ok: true }
    },
    [
      currentUserId,
      users,
      showToast,
      apiOnline,
      posts,
      conversations,
      activities,
    ],
  )

  const follow = useCallback(
    (userId: string) => {
      if (!currentUserId || userId === currentUserId) return
      const target = users.find((u) => u.id === userId)
      const willBeFriends = !!target?.following.includes(currentUserId)
      setUsers((prev) => {
        const next = prev.map((u) => {
          if (u.id === currentUserId && !u.following.includes(userId)) {
            return { ...u, following: [...u.following, userId] }
          }
          if (u.id === userId && !u.followers.includes(currentUserId)) {
            return { ...u, followers: [...u.followers, currentUserId] }
          }
          return u
        })
        return next.map((u) =>
          u.id === userId || u.id === currentUserId
            ? { ...u, badges: computeBadges(u, posts) }
            : u,
        )
      })
      pushActivity(userId, 'follow')
      showToast(willBeFriends ? 'Friends now' : 'Following')
    },
    [currentUserId, pushActivity, showToast, posts, users],
  )

  const unfollow = useCallback(
    (userId: string) => {
      if (!currentUserId) return
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === currentUserId) {
            return { ...u, following: u.following.filter((id) => id !== userId) }
          }
          if (u.id === userId) {
            return { ...u, followers: u.followers.filter((id) => id !== currentUserId) }
          }
          return u
        }),
      )
      showToast('Unfollowed')
    },
    [currentUserId, showToast],
  )

  const createPost = useCallback(
    (input: {
      type: 'video' | 'image'
      mediaUrl: string
      caption: string
      soundName?: string
      privacy?: 'public' | 'friends' | 'private'
    }) => {
      if (!currentUserId) return
      if (apiOnline) {
        void api
          .createPost({
            type: input.type,
            mediaUrl: input.mediaUrl,
            caption: input.caption,
            soundName: input.soundName,
            privacy: input.privacy,
          })
          .then((res) => {
            setPosts((prev) => [res.post, ...prev])
            showToast('Posted!')
          })
          .catch((e) => showToast(e instanceof Error ? e.message : 'Post failed'))
        return
      }
      const post: Post = {
        id: uid('post'),
        userId: currentUserId,
        type: input.type,
        mediaUrl: input.mediaUrl,
        caption: input.caption.trim(),
        tags: parseTags(input.caption),
        likes: [],
        comments: [],
        shares: 0,
        views: 0,
        createdAt: Date.now(),
        soundName: input.soundName || `original sound - ${currentUser?.username || 'user'}`,
        privacy: input.privacy || 'public',
      }
      setPosts((prev) => [post, ...prev])
      setUsers((prev) =>
        prev.map((u) =>
          u.id === currentUserId
            ? { ...u, badges: computeBadges({ ...u, badges: [...u.badges, 'creator'] }, [post, ...posts]) }
            : u,
        ),
      )
      showToast('Posted!')
    },
    [currentUserId, currentUser, posts, showToast, apiOnline],
  )

  const deletePost = useCallback(
    (postId: string) => {
      if (!currentUserId) return { ok: false, error: 'Not logged in' }
      const post = posts.find((p) => p.id === postId)
      if (!post) return { ok: false, error: 'Video not found' }
      if (post.userId !== currentUserId && !isOwnerUser(users.find((u) => u.id === currentUserId))) {
        return { ok: false, error: 'You can only delete your own videos' }
      }
      setPosts((prev) => prev.filter((p) => p.id !== postId))
      setUsers((prev) =>
        prev.map((u) => ({
          ...u,
          saved: u.saved.filter((id) => id !== postId),
          reposts: u.reposts.filter((r) => r.postId !== postId),
        })),
      )
      setActivities((prev) => prev.filter((a) => a.postId !== postId))
      showToast('Video deleted')
      return { ok: true }
    },
    [currentUserId, posts, users, showToast],
  )

  const setPostPrivacy = useCallback(
    (postId: string, privacy: 'public' | 'friends' | 'private') => {
      if (!currentUserId) return { ok: false, error: 'Not logged in' }
      const post = posts.find((p) => p.id === postId)
      if (!post) return { ok: false, error: 'Video not found' }
      if (post.userId !== currentUserId) {
        return { ok: false, error: 'You can only edit your own videos' }
      }
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, privacy } : p)))
      const label =
        privacy === 'public' ? 'Everyone' : privacy === 'friends' ? 'Friends' : 'Only you'
      showToast(`Privacy · ${label}`)
      return { ok: true }
    },
    [currentUserId, posts, showToast],
  )

  const toggleLike = useCallback(
    (postId: string) => {
      if (!currentUserId) {
        showToast('Log in to like')
        return { ok: false, needAuth: true }
      }
      if (apiOnline) {
        void api.like(postId).then((res) => {
          setPosts((prev) => prev.map((p) => (p.id === postId ? res.post : p)))
        })
        return { ok: true }
      }
      const post = posts.find((p) => p.id === postId)
      const liked = post?.likes.includes(currentUserId)
      const nextPosts = posts.map((p) => {
        if (p.id !== postId) return p
        return {
          ...p,
          likes: liked
            ? p.likes.filter((id) => id !== currentUserId)
            : [...p.likes, currentUserId],
        }
      })
      setPosts(nextPosts)
      if (!liked && post) {
        pushActivity(post.userId, 'like', postId)
        setUsers((prev) =>
          prev.map((u) =>
            u.id === post.userId ? { ...u, badges: computeBadges(u, nextPosts) } : u,
          ),
        )
      }
      return { ok: true }
    },
    [currentUserId, posts, pushActivity, showToast, apiOnline],
  )

  const toggleSave = useCallback(
    (postId: string) => {
      if (!currentUserId) {
        showToast('Log in to save')
        return { ok: false, needAuth: true }
      }
      const me = users.find((u) => u.id === currentUserId)
      const saved = me?.saved.includes(postId)
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== currentUserId) return u
          return {
            ...u,
            saved: saved ? u.saved.filter((id) => id !== postId) : [...u.saved, postId],
          }
        }),
      )
      const post = posts.find((p) => p.id === postId)
      if (!saved && post) pushActivity(post.userId, 'save', postId)
      showToast(saved ? 'Removed from favorites' : 'Saved to favorites')
      return { ok: true }
    },
    [currentUserId, users, posts, pushActivity, showToast],
  )

  const toggleRepost = useCallback(
    (postId: string) => {
      if (!currentUserId) {
        showToast('Log in to repost')
        return { ok: false, needAuth: true }
      }
      const me = users.find((u) => u.id === currentUserId)
      const done = me?.reposts.some((r) => r.postId === postId)
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== currentUserId) return u
          return {
            ...u,
            reposts: done
              ? u.reposts.filter((r) => r.postId !== postId)
              : [...u.reposts, { postId, createdAt: Date.now() }],
          }
        }),
      )
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, shares: Math.max(0, p.shares + (done ? -1 : 1)) }
            : p,
        ),
      )
      const post = posts.find((p) => p.id === postId)
      if (!done && post) pushActivity(post.userId, 'repost', postId)
      showToast(done ? 'Removed repost' : 'Reposted')
      return { ok: true }
    },
    [currentUserId, users, posts, pushActivity, showToast],
  )

  const isSaved = useCallback(
    (postId: string) => !!currentUser?.saved.includes(postId),
    [currentUser],
  )

  const isReposted = useCallback(
    (postId: string) => !!currentUser?.reposts.some((r) => r.postId === postId),
    [currentUser],
  )

  const addComment = useCallback(
    (postId: string, text: string) => {
      if (!currentUserId || !text.trim()) return
      const comment: Comment = {
        id: uid('c'),
        userId: currentUserId,
        text: text.trim(),
        createdAt: Date.now(),
        likes: [],
      }
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comments: [...p.comments, comment] } : p)),
      )
      const post = posts.find((p) => p.id === postId)
      if (post) pushActivity(post.userId, 'comment', postId, text.trim())
    },
    [currentUserId, posts, pushActivity],
  )

  const sharePost = useCallback(
    (postId: string) => {
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, shares: p.shares + 1 } : p)))
      showToast('Link copied')
    },
    [showToast],
  )

  const bumpView = useCallback((postId: string) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, views: p.views + 1 } : p)))
  }, [])

  const buyCoins = useCallback(
    (amount: number, costLabel: string) => {
      if (!currentUserId) {
        showToast('Log in to buy coins')
        return
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === currentUserId ? { ...u, coins: u.coins + amount } : u)),
      )
      showToast(`Added ${amount} coins (${costLabel})`)
    },
    [currentUserId, showToast],
  )

  const spendCoins = useCallback(
    (amount: number, reason: string) => {
      if (!currentUserId) {
        showToast('Log in first')
        return { ok: false, error: 'Log in first' }
      }
      const me = users.find((u) => u.id === currentUserId)
      if (!me || me.coins < amount) {
        showToast('Not enough coins — buy more in Shop')
        return { ok: false, error: 'Not enough coins' }
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === currentUserId ? { ...u, coins: u.coins - amount } : u)),
      )
      showToast(`${reason} (−${amount} coins)`)
      return { ok: true }
    },
    [currentUserId, users, showToast],
  )

  const sendMessage = useCallback(
    (toUserId: string, text: string) => {
      if (!currentUserId) return { ok: false, error: 'Log in to message' }
      if (!text.trim()) return { ok: false, error: 'Empty message' }
      if (toUserId === currentUserId) return { ok: false, error: 'Cannot message yourself' }

      const pairKey = [currentUserId, toUserId].sort().join('|')
      const existing = conversations.find(
        (c) => [...c.participants].sort().join('|') === pairKey,
      )
      const msg = {
        id: uid('m'),
        fromId: currentUserId,
        text: text.trim(),
        createdAt: Date.now(),
        read: false,
      }
      if (existing) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === existing.id ? { ...c, messages: [...c.messages, msg] } : c,
          ),
        )
        showToast('Message sent')
        return { ok: true, conversationId: existing.id }
      }
      const conversationId = uid('convo')
      setConversations((prev) => [
        {
          id: conversationId,
          participants: [currentUserId, toUserId] as [string, string],
          messages: [msg],
        },
        ...prev,
      ])
      showToast('Message sent')
      return { ok: true, conversationId }
    },
    [currentUserId, conversations, showToast],
  )

  const markConversationRead = useCallback(
    (conversationId: string) => {
      if (!currentUserId) return
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.fromId !== currentUserId ? { ...m, read: true } : m,
                ),
              }
            : c,
        ),
      )
    },
    [currentUserId],
  )

  const markActivitiesRead = useCallback(() => {
    if (!currentUserId) return
    setActivities((prev) =>
      prev.map((a) => (a.toUserId === currentUserId ? { ...a, read: true } : a)),
    )
  }, [currentUserId])

  const awardBadge = useCallback(
    (userId: string, badge: BadgeId) => {
      const me = users.find((u) => u.id === currentUserId)
      if (!isOwnerUser(me)) return { ok: false, error: 'Owner access only' }
      if (badge === 'owner' && userId !== currentUserId) {
        return { ok: false, error: 'Cannot grant owner badge' }
      }
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== userId) return u
          const denied = (u.deniedBadges || []).filter((b) => b !== badge)
          const badges = u.badges.includes(badge) ? u.badges : [...u.badges, badge]
          return { ...u, badges, deniedBadges: denied }
        }),
      )
      return { ok: true }
    },
    [currentUserId, users],
  )

  const revokeBadge = useCallback(
    (userId: string, badge: BadgeId) => {
      const me = users.find((u) => u.id === currentUserId)
      if (!isOwnerUser(me)) return { ok: false, error: 'Owner access only' }
      // Crown is display-only — hide it on yourself, but keep owner access
      if (badge === 'owner' && userId !== currentUserId) {
        return { ok: false, error: 'Cannot revoke owner badge from others' }
      }
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== userId) return u
          const denied = [...new Set([...(u.deniedBadges || []), badge])]
          return {
            ...u,
            badges: u.badges.filter((b) => b !== badge),
            deniedBadges: denied,
          }
        }),
      )
      return { ok: true }
    },
    [currentUserId, users],
  )

  const setOwnerStats = useCallback(
    (input: {
      userId?: string
      followers?: number
      likes?: number
      views?: number
    }) => {
      const me = users.find((u) => u.id === currentUserId)
      if (!isOwnerUser(me)) return { ok: false, error: 'Owner access only' }

      const targetId = input.userId || currentUserId
      if (!targetId) return { ok: false, error: 'No user' }
      if (!users.some((u) => u.id === targetId)) return { ok: false, error: 'User not found' }

      const clamp = (n: number) => Math.max(0, Math.min(Math.floor(n), 999_999_999_999))

      if (input.followers !== undefined || input.likes !== undefined) {
        setUsers((prev) =>
          prev.map((u) => {
            if (u.id !== targetId) return u
            const next = { ...(u.statsOverride || {}) }
            if (input.followers !== undefined) next.followers = clamp(input.followers)
            if (input.likes !== undefined) next.likes = clamp(input.likes)
            return { ...u, statsOverride: next }
          }),
        )
      }

      if (input.views !== undefined) {
        const v = clamp(input.views)
        setPosts((prev) =>
          prev.map((p) => (p.userId === targetId ? { ...p, views: v } : p)),
        )
      }

      showToast('Stats updated')
      return { ok: true }
    },
    [currentUserId, users, showToast],
  )

  const setPostCounts = useCallback(
    (input: {
      postId?: string
      userId?: string
      all?: boolean
      comments?: number
      saves?: number
      likes?: number
      shares?: number
      views?: number
    }) => {
      const me = users.find((u) => u.id === currentUserId)
      if (!isOwnerUser(me)) return { ok: false, error: 'Owner access only' }

      const clamp = (n: number) => Math.max(0, Math.min(Math.floor(n), 999_999_999_999))
      const hasCount =
        input.comments !== undefined ||
        input.saves !== undefined ||
        input.likes !== undefined ||
        input.shares !== undefined ||
        input.views !== undefined
      if (!hasCount) return { ok: false, error: 'Enter at least one count' }

      const match = (p: Post) => {
        if (input.all) return true
        if (input.postId) return p.id === input.postId
        if (input.userId) return p.userId === input.userId
        return false
      }

      if (!input.all && !input.postId && !input.userId) {
        return { ok: false, error: 'Pick a video or scope' }
      }

      setPosts((prev) =>
        prev.map((p) => {
          if (!match(p)) return p
          const next = { ...p }
          if (input.views !== undefined) next.views = clamp(input.views)
          if (
            input.comments !== undefined ||
            input.saves !== undefined ||
            input.likes !== undefined ||
            input.shares !== undefined
          ) {
            const override = { ...(p.countOverride || {}) }
            if (input.comments !== undefined) override.comments = clamp(input.comments)
            if (input.saves !== undefined) override.saves = clamp(input.saves)
            if (input.likes !== undefined) override.likes = clamp(input.likes)
            if (input.shares !== undefined) {
              override.shares = clamp(input.shares)
              next.shares = clamp(input.shares)
            }
            next.countOverride = override
          }
          return next
        }),
      )

      showToast('Video counts updated')
      return { ok: true }
    },
    [currentUserId, users, showToast],
  )

  const search = useCallback(
    (q: string) => {
      const query = q.trim().toLowerCase().replace(/^#/, '')
      if (!query) return { users: [], posts: [], tags: [] }
      const matchedUsers = users.filter(
        (u) =>
          u.username.includes(query) ||
          u.displayName.toLowerCase().includes(query) ||
          u.bio.toLowerCase().includes(query),
      )
      const matchedPosts = posts.filter(
        (p) =>
          canViewPost(p, currentUser) &&
          (p.caption.toLowerCase().includes(query) ||
            p.tags.some((t) => t.includes(query))),
      )
      const tagSet = new Set<string>()
      posts.forEach((p) => {
        if (!canViewPost(p, currentUser)) return
        p.tags.forEach((t) => {
          if (t.includes(query)) tagSet.add(t)
        })
      })
      return { users: matchedUsers, posts: matchedPosts, tags: [...tagSet] }
    },
    [users, posts, currentUser],
  )

  const forYouFeed = useMemo(() => {
    return [...posts]
      .filter((p) => canViewPost(p, currentUser))
      .map((p) => ({
        p,
        score:
          p.likes.length * 3 +
          p.comments.length * 4 +
          p.shares * 2 +
          p.views * 0.01 +
          (Date.now() - p.createdAt < 86400000 * 2 ? 20 : 0),
      }))
      .sort((a, b) => b.score - a.score || b.p.createdAt - a.p.createdAt)
      .map((x) => x.p)
  }, [posts, currentUser])

  const followingFeed = useMemo(() => {
    if (!currentUser) return []
    const following = new Set(currentUser.following)
    const friendRepostIds = new Set<string>()
    users.forEach((u) => {
      if (!following.has(u.id)) return
      u.reposts.forEach((r) => friendRepostIds.add(r.postId))
    })
    return posts
      .filter(
        (p) =>
          canViewPost(p, currentUser) &&
          (following.has(p.userId) ||
            p.userId === currentUser.id ||
            friendRepostIds.has(p.id) ||
            currentUser.reposts.some((r) => r.postId === p.id)),
      )
      .sort((a, b) => {
        const aRepostAt = Math.max(
          0,
          ...users
            .filter((u) => following.has(u.id) || u.id === currentUser.id)
            .flatMap((u) => u.reposts.filter((r) => r.postId === a.id).map((r) => r.createdAt)),
        )
        const bRepostAt = Math.max(
          0,
          ...users
            .filter((u) => following.has(u.id) || u.id === currentUser.id)
            .flatMap((u) => u.reposts.filter((r) => r.postId === b.id).map((r) => r.createdAt)),
        )
        const aTime = Math.max(a.createdAt, aRepostAt)
        const bTime = Math.max(b.createdAt, bRepostAt)
        return bTime - aTime
      })
  }, [posts, currentUser, users])

  const friends = useMemo(() => {
    if (!currentUser) return []
    return users.filter(
      (u) =>
        currentUser.following.includes(u.id) && currentUser.followers.includes(u.id),
    )
  }, [users, currentUser])

  const friendsFeed = useMemo(() => {
    if (!currentUser) return []
    const friendIds = new Set(friends.map((u) => u.id))
    if (friendIds.size === 0) return []
    return posts
      .filter((p) => friendIds.has(p.userId) && p.privacy !== 'private')
      .sort((a, b) => b.createdAt - a.createdAt)
  }, [posts, currentUser, friends])

  const unreadMessages = useMemo(() => {
    if (!currentUserId) return 0
    return conversations.reduce((n, c) => {
      if (!c.participants.includes(currentUserId)) return n
      return n + c.messages.filter((m) => m.fromId !== currentUserId && !m.read).length
    }, 0)
  }, [conversations, currentUserId])

  const unreadActivity = useMemo(() => {
    if (!currentUserId) return 0
    return activities.filter((a) => a.toUserId === currentUserId && !a.read).length
  }, [activities, currentUserId])

  const value: AppContextValue = {
    users,
    posts,
    conversations,
    activities,
    currentUser,
    ready,
    toast,
    showToast,
    apiOnline,
    signup,
    login,
    logout,
    updateProfile,
    follow,
    unfollow,
    createPost,
    deletePost,
    setPostPrivacy,
    toggleLike,
    toggleSave,
    toggleRepost,
    isSaved,
    isReposted,
    addComment,
    sharePost,
    bumpView,
    buyCoins,
    spendCoins,
    sendMessage,
    markConversationRead,
    markActivitiesRead,
    getUser,
    isFollowing,
    isOwner: isOwnerUser(currentUser),
    unreadMessages,
    unreadActivity,
    awardBadge,
    revokeBadge,
    setOwnerStats,
    setPostCounts,
    search,
    forYouFeed,
    followingFeed,
    friendsFeed,
    friends,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
