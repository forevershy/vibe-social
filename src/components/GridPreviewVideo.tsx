import { useEffect, useRef } from 'react'

/** Muted looping preview for explore/profile grids — plays when on screen */
export function GridPreviewVideo({
  src,
  poster,
}: {
  src: string
  poster?: string
}) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let cancelled = false

    const play = async () => {
      if (cancelled) return
      el.muted = true
      el.defaultMuted = true
      el.playsInline = true
      try {
        await el.play()
      } catch {
        /* autoplay blocked — stay on poster */
      }
    }

    const pause = () => {
      el.pause()
      try {
        el.currentTime = 0
      } catch {
        /* ignore */
      }
    }

    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries[0]
        if (!hit) return
        if (hit.isIntersecting && hit.intersectionRatio >= 0.35) void play()
        else pause()
      },
      { threshold: [0, 0.35, 0.6] },
    )
    io.observe(el)

    return () => {
      cancelled = true
      io.disconnect()
      pause()
    }
  }, [src])

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      playsInline
      loop
      preload="metadata"
      aria-hidden
    />
  )
}
