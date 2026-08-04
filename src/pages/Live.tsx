import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Radio, Send, Video, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { api, wsUrl } from '../lib/api'
import './Hub.css'

type Room = { hostId: string; hostUsername: string; title: string; viewers: number }
type ChatLine = { id?: string; username?: string; text: string; at: number; system?: boolean }

export function LivePage() {
  const { currentUser, spendCoins, showToast, apiOnline, getUser } = useApp()
  const nav = useNavigate()
  const [rooms, setRooms] = useState<Room[]>([])
  const [watching, setWatching] = useState<string | null>(null)
  const [hosting, setHosting] = useState(false)
  const [chat, setChat] = useState<ChatLine[]>([])
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let ws: WebSocket | null = null
    let cancelled = false

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl())
        wsRef.current = ws
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(String(ev.data))
            if (msg.type === 'live:rooms') setRooms(msg.rooms || [])
            if (msg.type === 'live:history') setChat(msg.chat || [])
            if (msg.type === 'live:chat') {
              setChat((prev) => [...prev, msg].slice(-80))
            }
            if (msg.type === 'live:tip') {
              setChat((prev) =>
                [
                  ...prev,
                  {
                    system: true,
                    text: `${msg.username} tipped ${msg.amount} coins`,
                    at: msg.at || Date.now(),
                  },
                ].slice(-80),
              )
            }
          } catch {
            /* ignore */
          }
        }
        ws.onclose = () => {
          if (!cancelled) window.setTimeout(connect, 1500)
        }
      } catch {
        /* offline */
      }
    }

    if (apiOnline) {
      void api.liveList().then((r) => setRooms(r.rooms)).catch(() => undefined)
      connect()
    }

    return () => {
      cancelled = true
      ws?.close()
      wsRef.current = null
    }
  }, [apiOnline])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const join = (hostId: string) => {
    setWatching(hostId)
    setChat([])
    wsRef.current?.send(
      JSON.stringify({
        type: 'live:join',
        hostId,
        username: currentUser?.username || 'guest',
      }),
    )
  }

  const leave = () => {
    wsRef.current?.send(JSON.stringify({ type: 'live:leave' }))
    setWatching(null)
    setChat([])
  }

  const startLive = async () => {
    if (!currentUser) {
      nav('/auth?next=/live')
      return
    }
    if (!apiOnline) {
      showToast('Start the Vibe server to go LIVE')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        void videoRef.current.play()
      }
      await api.liveStart(title || `${currentUser.displayName} LIVE`)
      setHosting(true)
      setWatching(currentUser.id)
      wsRef.current?.send(
        JSON.stringify({
          type: 'live:join',
          hostId: currentUser.id,
          username: currentUser.username,
        }),
      )
      showToast('You are LIVE')
    } catch {
      showToast('Camera permission needed to go LIVE')
    }
  }

  const stopLive = async () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    try {
      await api.liveStop()
    } catch {
      /* ignore */
    }
    setHosting(false)
    leave()
    showToast('LIVE ended')
  }

  const sendChat = () => {
    const t = text.trim()
    if (!t || !watching) return
    wsRef.current?.send(
      JSON.stringify({
        type: 'live:chat',
        hostId: watching,
        username: currentUser?.username || 'guest',
        text: t,
      }),
    )
    setText('')
  }

  const tip = () => {
    if (!currentUser || !watching) {
      showToast('Log in to tip')
      return
    }
    const res = spendCoins(10, 'Live tip')
    if (!res.ok) return
    wsRef.current?.send(
      JSON.stringify({
        type: 'live:tip',
        hostId: watching,
        username: currentUser.username,
        amount: 10,
      }),
    )
  }

  const host = watching ? getUser(watching) : null
  const room = rooms.find((r) => r.hostId === watching)

  return (
    <div className="hub-page">
      <header className="hub-head">
        <div>
          <h1>LIVE</h1>
          <p>
            {apiOnline
              ? 'Go live with your camera or join a room — chat & tip in real time'
              : 'Run the Vibe server to enable LIVE rooms'}
          </p>
        </div>
        <Radio size={28} color="#fe2c55" />
      </header>

      {watching ? (
        <div className="live-stage live-stage-full">
          <div className="live-video">
            <span className="live-pill">LIVE</span>
            {hosting ? (
              <video ref={videoRef} muted playsInline autoPlay className="live-cam" />
            ) : host ? (
              <>
                <img src={host.avatar} alt="" />
                <p>@{host.username} is live</p>
                <em>{room?.title || 'LIVE'}</em>
              </>
            ) : null}
            <span className="live-viewers">{room?.viewers ?? 1} watching</span>
          </div>

          <div className="live-chat">
            <div className="live-chat-log">
              {chat.map((c, i) => (
                <p key={c.id || i} className={c.system ? 'sys' : ''}>
                  {!c.system && <strong>@{c.username}</strong>} {c.text}
                </p>
              ))}
            </div>
            <div className="live-chat-compose">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Say something…"
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
              />
              <button type="button" onClick={sendChat} aria-label="Send">
                <Send size={16} />
              </button>
            </div>
          </div>

          <div className="live-actions">
            {!hosting && (
              <button type="button" onClick={tip}>
                Tip 10 coins
              </button>
            )}
            {hosting ? (
              <button type="button" className="ghost" onClick={() => void stopLive()}>
                End LIVE
              </button>
            ) : (
              <button type="button" className="ghost" onClick={leave}>
                <X size={16} /> Leave
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <section className="live-go">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Stream title (optional)"
            />
            <button type="button" className="live-go-btn" onClick={() => void startLive()}>
              <Video size={18} /> Go LIVE
            </button>
          </section>

          <div className="live-grid">
            {rooms.length === 0 ? (
              <p className="hub-empty">No one is live yet — be the first.</p>
            ) : (
              rooms.map((r) => {
                const u = getUser(r.hostId)
                return (
                  <button
                    key={r.hostId}
                    type="button"
                    className="live-card"
                    onClick={() => join(r.hostId)}
                  >
                    <img src={u?.avatar || ''} alt="" />
                    <div>
                      <strong>@{r.hostUsername}</strong>
                      <span>
                        {r.viewers} watching · {r.title}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}
