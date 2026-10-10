export const fmtClock = (sec) => {
  const s = Math.floor(sec) % 86400
  const h = String(Math.floor(s / 3600)).padStart(2, '0')
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const x = String(s % 60).padStart(2, '0')
  return `${h}:${m}:${x}`
}
export const fmtWall = (ms) => new Date(ms).toLocaleTimeString('en-GB')
