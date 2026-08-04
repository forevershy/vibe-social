import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { timeAgo, displayCommentCount } from '../lib/utils'
import type { Post } from '../types'
import './CommentSheet.css'

export function CommentSheet({ post, onClose }: { post: Post; onClose: () => void }) {
  const { getUser, addComment, currentUser } = useApp()
  const [text, setText] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!currentUser) return
    addComment(post.id, text)
    setText('')
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-header">
          <h3>{displayCommentCount(post)} comments</h3>
          <button onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        <div className="sheet-list">
          {post.comments.length === 0 && (
            <p className="empty">Be the first to comment</p>
          )}
          {post.comments.map((c) => {
            const u = getUser(c.userId)
            if (!u) return null
            return (
              <div key={c.id} className="comment">
                <Link to={`/u/${u.username}`} onClick={onClose}>
                  <img src={u.avatar} alt="" />
                </Link>
                <div>
                  <div className="comment-top">
                    <Link to={`/u/${u.username}`} onClick={onClose}>@{u.username}</Link>
                    <span>{timeAgo(c.createdAt)}</span>
                  </div>
                  <p>{c.text}</p>
                </div>
              </div>
            )
          })}
        </div>

        {currentUser ? (
          <form className="sheet-form" onSubmit={submit}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add a comment…"
              maxLength={280}
              autoFocus
            />
            <button type="submit" disabled={!text.trim()}>
              Post
            </button>
          </form>
        ) : (
          <div className="sheet-login">
            <p>Log in to join the conversation</p>
            <Link to={`/auth?next=${encodeURIComponent(`/post/${post.id}`)}`} onClick={onClose}>
              Log in
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
