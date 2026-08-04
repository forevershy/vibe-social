import { Repeat2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import './RepostBanner.css'

export function useRepostInfo(postId: string) {
  const { users, currentUser } = useApp()

  const yourEntry = currentUser?.reposts.find((r) => r.postId === postId)
  const following = new Set(currentUser?.following || [])

  const friendEntries = users
    .filter((u) => u.id !== currentUser?.id && following.has(u.id))
    .map((u) => {
      const entry = u.reposts.find((r) => r.postId === postId)
      return entry ? { user: u, at: entry.createdAt } : null
    })
    .filter((x): x is { user: (typeof users)[0]; at: number } => !!x)
    .sort((a, b) => b.at - a.at)

  const youReposted = !!yourEntry
  if (!youReposted && friendEntries.length === 0) {
    return null
  }

  let label = ''
  let linkUser = friendEntries[0]?.user
  /** Face shown in the white pill — you first, else the friend who reposted */
  const face = youReposted ? currentUser! : friendEntries[0].user

  if (youReposted && friendEntries.length === 0) {
    label = 'You reposted'
  } else if (youReposted && friendEntries.length === 1) {
    label = `You and ${friendEntries[0].user.username} reposted`
  } else if (youReposted && friendEntries.length > 1) {
    label = `You and ${friendEntries.length} others reposted`
  } else if (friendEntries.length === 1) {
    label = `${friendEntries[0].user.username} reposted`
  } else if (friendEntries.length === 2) {
    label = `${friendEntries[0].user.username} and ${friendEntries[1].user.username} reposted`
  } else {
    label = `${friendEntries[0].user.username} and ${friendEntries.length - 1} others reposted`
  }

  return {
    label,
    linkUser,
    face,
    youReposted,
    friends: friendEntries.map((e) => e.user),
  }
}

export function RepostBanner({
  postId,
  variant = 'feed',
}: {
  postId: string
  variant?: 'feed' | 'panel'
}) {
  const info = useRepostInfo(postId)
  if (!info) return null

  const pillInner = (
    <>
      <img src={info.face.avatar} alt="" className="repost-pill-avatar" />
      {info.linkUser && !info.youReposted ? (
        <Link
          to={`/u/${info.linkUser.username}`}
          className="repost-pill-label"
          onClick={(e) => e.stopPropagation()}
        >
          {info.label}
        </Link>
      ) : (
        <span className="repost-pill-label">{info.label}</span>
      )}
    </>
  )

  return (
    <div className={`repost-banner ${variant}`}>
      <div className="repost-pill">{pillInner}</div>
      <span className="repost-icon-btn" aria-hidden>
        <Repeat2 size={14} strokeWidth={2.6} />
      </span>
    </div>
  )
}
