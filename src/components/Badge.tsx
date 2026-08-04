import { BADGES } from '../lib/utils'
import type { BadgeId } from '../types'
import './Badge.css'

/** Preferred order when showing emoji badges next to a name */
const DISPLAY_ORDER: BadgeId[] = [
  'owner',
  'verified',
  'top_creator',
  'creator',
  'rising',
  'og',
  'early',
]

export function badgeEmoji(id: BadgeId): string {
  return BADGES[id]?.emoji || ''
}

/** TikTok-style blue verified badge */
export function TikTokVerified({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <svg
      className={`tiktok-verified ${size}`}
      viewBox="0 0 48 48"
      aria-label="Verified"
      role="img"
    >
      <circle cx="24" cy="24" r="24" fill="#20D5EC" />
      <path
        d="M34.5 16.8 21.2 30.4l-7.7-7.7 2.8-2.8 4.9 4.9 10.5-10.8 2.8 2.8z"
        fill="#fff"
      />
    </svg>
  )
}

export function BadgeEmoji({
  id,
  size = 'sm',
}: {
  id: BadgeId
  size?: 'sm' | 'md' | 'lg'
}) {
  const badge = BADGES[id]
  if (!badge) return null
  if (id === 'verified') {
    return (
      <span
        className={`badge-emoji ${size}`}
        title={`${badge.label} — ${badge.description}`}
      >
        <TikTokVerified size={size} />
      </span>
    )
  }
  return (
    <span
      className={`badge-emoji ${size}`}
      title={`${badge.label} — ${badge.description}`}
      aria-label={badge.label}
      role="img"
    >
      {badge.emoji}
    </span>
  )
}

/** @deprecated alias — now renders emoji */
export function BadgePill({ id, size = 'sm' }: { id: BadgeId; size?: 'sm' | 'md' }) {
  return <BadgeEmoji id={id} size={size} />
}

/** Emoji marks shown next to usernames */
export function VerifiedMark({ badges }: { badges: BadgeId[] }) {
  if (!badges?.length) return null
  const ordered = DISPLAY_ORDER.filter((id) => badges.includes(id))
  if (!ordered.length) return null
  return (
    <span className="badge-marks">
      {ordered.map((id) => (
        <BadgeEmoji key={id} id={id} size="sm" />
      ))}
    </span>
  )
}

export function BadgeRow({ badges }: { badges: BadgeId[] }) {
  if (!badges.length) return null
  const ordered = DISPLAY_ORDER.filter((id) => badges.includes(id))
  return (
    <div className="badge-row">
      {ordered.map((id) => (
        <BadgeEmoji key={id} id={id} size="md" />
      ))}
    </div>
  )
}
