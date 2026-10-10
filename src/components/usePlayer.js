import { useEffect, useState } from 'react'

// Step-through animation helper: idx walks 0..max, auto-advancing while playing.
export default function usePlayer(max, ms = 450) {
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing) return undefined
    if (idx >= max) {
      setPlaying(false)
      return undefined
    }
    const t = setTimeout(() => setIdx((i) => Math.min(i + 1, max)), ms)
    return () => clearTimeout(t)
  }, [playing, idx, max, ms])

  return {
    idx: Math.min(idx, max),
    playing,
    setIdx,
    play: () => {
      if (idx >= max) setIdx(0)
      setPlaying(true)
    },
    pause: () => setPlaying(false),
    step: () => setIdx((i) => Math.min(i + 1, max)),
    reset: () => {
      setPlaying(false)
      setIdx(0)
    },
    finish: () => {
      setPlaying(false)
      setIdx(max)
    },
  }
}
