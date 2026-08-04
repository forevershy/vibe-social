import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImagePlus, Film, X, Globe, Users, Lock } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { fileToDataUrl } from '../lib/utils'
import './Create.css'

type Privacy = 'public' | 'friends' | 'private'

export function CreatePage() {
  const { currentUser, createPost } = useApp()
  const nav = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [type, setType] = useState<'image' | 'video'>('image')
  const [caption, setCaption] = useState('')
  const [privacy, setPrivacy] = useState<Privacy>(
    () =>
      (localStorage.getItem('vibe_default_privacy') as Privacy) || 'public',
  )
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!currentUser) {
    return (
      <div className="create-page locked">
        <h2>Create</h2>
        <p>Log in to post photos and videos.</p>
        <button onClick={() => nav('/auth?next=/create')}>Log in</button>
      </div>
    )
  }

  const onPick = async (file: File | null) => {
    if (!file) return
    setError('')
    setBusy(true)
    try {
      const isVideo = file.type.startsWith('video/')
      if (!isVideo && !file.type.startsWith('image/')) {
        setError('Choose an image or video file')
        return
      }
      // Higher limits when API/file storage is available; browser data-URL still capped
      const maxVideo = 40 * 1024 * 1024
      const maxImage = 12 * 1024 * 1024
      if (isVideo && file.size > maxVideo) {
        setError('Video must be under 40MB')
        return
      }
      if (!isVideo && file.size > maxImage) {
        setError('Image must be under 12MB')
        return
      }
      if (isVideo && file.size > 8 * 1024 * 1024) {
        // warn but allow — server path handles large files better
        setError('')
      }
      const url = await fileToDataUrl(file)
      setType(isVideo ? 'video' : 'image')
      setPreview(url)
    } catch {
      setError('Could not read that file — try a smaller one')
    } finally {
      setBusy(false)
    }
  }

  const publish = () => {
    if (!preview) return setError('Add a photo or video first')
    try {
      createPost({
        type,
        mediaUrl: preview,
        caption,
        soundName: `original sound - ${currentUser.username}`,
        privacy,
      })
      nav('/')
    } catch {
      setError('Could not save — storage may be full. Try a smaller file.')
    }
  }

  return (
    <div className="create-page">
      <header>
        <h1>New post</h1>
        <button className="post-btn" onClick={publish} disabled={!preview || busy}>
          Post
        </button>
      </header>

      {!preview ? (
        <button
          type="button"
          className={`dropzone ${dragging ? 'dragging' : ''}`}
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          onDragEnter={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            void onPick(e.dataTransfer.files?.[0] || null)
          }}
        >
          <div className="drop-icons">
            <ImagePlus size={28} />
            <Film size={28} />
          </div>
          <strong>{busy ? 'Loading…' : dragging ? 'Drop to upload' : 'Upload photo or video'}</strong>
          <span>Drag & drop or click · Vertical 9:16 looks best</span>
        </button>
      ) : (
        <div className="preview-wrap">
          <button className="clear" onClick={() => setPreview(null)} aria-label="Remove">
            <X size={18} />
          </button>
          {type === 'video' ? (
            <video src={preview} controls playsInline className="preview" />
          ) : (
            <img src={preview} alt="" className="preview" />
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        hidden
        onChange={(e) => onPick(e.target.files?.[0] || null)}
      />

      <label className="caption-label">
        Caption
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Say something… use #hashtags"
          maxLength={500}
          rows={4}
        />
      </label>

      <div className="privacy-picker" role="group" aria-label="Who can watch">
        <span className="privacy-label">Who can watch</span>
        <div className="privacy-opts">
          {(
            [
              ['public', Globe, 'Everyone'],
              ['friends', Users, 'Friends'],
              ['private', Lock, 'Only you'],
            ] as const
          ).map(([id, Icon, label]) => (
            <button
              key={id}
              type="button"
              className={privacy === id ? 'on' : ''}
              onClick={() => setPrivacy(id)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="create-error">{error}</p>}

      <div className="tips">
        <p>Tips</p>
        <ul>
          <li>Add #tags so people can find you in Search</li>
          <li>Double-tap videos on For You to like</li>
          <li>Friends-only posts only show to mutual follows</li>
        </ul>
      </div>
    </div>
  )
}
