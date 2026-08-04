import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Search,
  X,
  Repeat2,
  Link2,
  Code2,
  Send,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { Post, User } from '../types'
import { BADGES } from '../lib/utils'
import './ShareSheet.css'

type Props = {
  post: Post
  onClose: () => void
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden fill="currentColor">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
  )
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.458.02.889-.16 1.795-.96 6.14-1.358 8.148-.168.85-.499 1.134-.82 1.162-.696.056-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  )
}

export function ShareSheet({ post, onClose }: Props) {
  const {
    users,
    currentUser,
    getUser,
    toggleRepost,
    isReposted,
    sharePost,
    sendMessage,
    showToast,
  } = useApp()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  const author = getUser(post.userId)
  const url = `${window.location.origin}/post/${post.id}`
  const shareText = post.caption?.trim()
    ? `${post.caption.slice(0, 120)} ${url}`
    : `Check this out on Vibe ${url}`
  const reposted = isReposted(post.id)

  const contacts = useMemo(() => {
    const list = users.filter((u) => u.id !== currentUser?.id)
    // Prefer following, then others; keep author near front if not you
    const following = new Set(currentUser?.following || [])
    const sorted = [...list].sort((a, b) => {
      const af = following.has(a.id) ? 0 : 1
      const bf = following.has(b.id) ? 0 : 1
      if (af !== bf) return af - bf
      if (a.id === post.userId) return -1
      if (b.id === post.userId) return 1
      return a.username.localeCompare(b.username)
    })
    const query = q.trim().toLowerCase()
    if (!query) return sorted.slice(0, 16)
    return sorted
      .filter(
        (u) =>
          u.username.includes(query) ||
          u.displayName.toLowerCase().includes(query),
      )
      .slice(0, 16)
  }, [users, currentUser, post.userId, q])

  const needAuth = (next: string) => {
    onClose()
    nav(`/auth?next=${encodeURIComponent(next)}`)
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      sharePost(post.id)
      showToast('Link copied')
    } catch {
      showToast('Could not copy link')
    }
    onClose()
  }

  const sendToUser = (u: User) => {
    if (!currentUser) {
      needAuth(`/post/${post.id}`)
      return
    }
    const res = sendMessage(u.id, `Shared a video: ${url}`)
    if (!res.ok) {
      showToast(res.error || 'Could not send')
      return
    }
    sharePost(post.id)
    showToast(`Sent to @${u.username}`)
    onClose()
  }

  const openExternal = (href: string) => {
    sharePost(post.id)
    window.open(href, '_blank', 'noopener,noreferrer')
    onClose()
  }

  return createPortal(
    <div className="share-sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="share-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="share-sheet-head">
          <button
            type="button"
            className="share-icon-btn"
            aria-label="Search"
            onClick={() => setSearchOpen((o) => !o)}
          >
            <Search size={20} />
          </button>
          <h2 id="share-sheet-title">Share to</h2>
          <button
            type="button"
            className="share-icon-btn"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>

        {searchOpen && (
          <div className="share-search">
            <Search size={16} />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
            />
          </div>
        )}

        <div className="share-people">
          {contacts.map((u) => (
            <button
              key={u.id}
              type="button"
              className="share-person"
              onClick={() => sendToUser(u)}
            >
              <img src={u.avatar} alt="" />
              <span>
                {u.username}
                {u.badges.includes('owner')
                  ? ` ${BADGES.owner.emoji}`
                  : u.badges.includes('verified')
                    ? ' ✓'
                    : ''}
              </span>
            </button>
          ))}
          {contacts.length === 0 && (
            <p className="share-empty">{q ? 'No matches' : 'No people yet'}</p>
          )}
        </div>

        <div className="share-divider" />

        <div className="share-actions">
          <button
            type="button"
            className="share-action"
            onClick={() => {
              if (!currentUser) {
                needAuth(`/post/${post.id}`)
                return
              }
              toggleRepost(post.id)
              showToast(reposted ? 'Removed repost' : 'Reposted')
              onClose()
            }}
          >
            <span className="share-action-icon yellow">
              <Repeat2 size={24} strokeWidth={2.4} />
            </span>
            <span>{reposted ? 'Undo' : 'Repost'}</span>
          </button>

          <button type="button" className="share-action" onClick={copyLink}>
            <span className="share-action-icon blue">
              <Link2 size={22} strokeWidth={2.4} />
            </span>
            <span>Copy link</span>
          </button>

          <button
            type="button"
            className="share-action"
            onClick={() =>
              openExternal(`https://wa.me/?text=${encodeURIComponent(shareText)}`)
            }
          >
            <span className="share-action-icon whatsapp">
              <WhatsAppIcon />
            </span>
            <span>WhatsApp</span>
          </button>

          <button
            type="button"
            className="share-action"
            onClick={async () => {
              const embed = `<blockquote cite="${url}">Vibe · @${author?.username || 'user'}</blockquote><script async src="${window.location.origin}/embed.js"></script>`
              try {
                await navigator.clipboard.writeText(embed)
                sharePost(post.id)
                showToast('Embed code copied')
              } catch {
                showToast('Could not copy embed')
              }
              onClose()
            }}
          >
            <span className="share-action-icon teal">
              <Code2 size={22} strokeWidth={2.4} />
            </span>
            <span>Embed</span>
          </button>

          <button
            type="button"
            className="share-action"
            onClick={() =>
              openExternal(
                `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
              )
            }
          >
            <span className="share-action-icon facebook">
              <FacebookIcon />
            </span>
            <span>Facebook</span>
          </button>

          <button
            type="button"
            className="share-action"
            onClick={() =>
              openExternal(
                `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(post.caption || 'Vibe')}`,
              )
            }
          >
            <span className="share-action-icon telegram">
              <TelegramIcon />
            </span>
            <span>Telegram</span>
          </button>

          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              type="button"
              className="share-action"
              onClick={() => {
                navigator
                  .share({ title: 'Vibe', text: post.caption, url })
                  .then(() => {
                    sharePost(post.id)
                    showToast('Shared')
                  })
                  .catch(() => undefined)
                onClose()
              }}
            >
              <span className="share-action-icon more">
                <Send size={22} />
              </span>
              <span>More</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
