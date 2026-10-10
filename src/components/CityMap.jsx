import { useEffect, useRef, useState } from 'react'
import { EDGES, NODES, NODE_BY_ID, densityLevel } from '../lib/city.js'
import { makeRng } from '../lib/rng.js'

const LEVEL_COLOR = { low: '#35c98b', medium: '#ff9a2e', high: '#ff5252' }

// Draws the shared city. All overlays are optional so every module can reuse it.
export default function CityMap({
  density = {},
  status = {},
  colorByDensity = true,
  explored = [],
  frontier = [],
  current = null,
  pathEdges = [],
  start = null,
  goal = null,
  onEdge,
  onNode,
  labels = true,
  vehicles = false,
  edgeLabels = false,
  nodeNote = null,
  height = null,
}) {
  const exploredSet = new Set(explored)
  const frontierSet = new Set(frontier)
  const pathSet = new Set(pathEdges)

  return (
    <div className="svgwrap">
      <svg viewBox="0 0 960 620" role="img" aria-label="City road map" style={height ? { height } : undefined}>
        <defs>
          <pattern id="gridp" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="#1a1c20" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="960" height="620" fill="url(#gridp)" />

        {EDGES.map((e) => {
          const a = NODE_BY_ID[e.a]
          const b = NODE_BY_ID[e.b]
          const st = status[e.id]
          const lvl = densityLevel(density[e.id] ?? 0)
          const col = colorByDensity ? LEVEL_COLOR[lvl] : '#5a5f68'
          return (
            <g key={e.id}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#0a0a0c" strokeWidth="16" strokeLinecap="round" />
              {st ? (
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={st === 'blocked' ? '#ff5252' : '#ff9a2e'} strokeWidth="5" strokeDasharray="3 12" strokeLinecap="round" opacity="0.9" />
              ) : (
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={col} strokeWidth="9" strokeLinecap="round" opacity={pathEdges.length && !pathSet.has(e.id) ? 0.45 : 0.9} />
              )}
              {pathSet.has(e.id) && (
                <line className="route-glow" x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#e8c46a" strokeWidth="11" strokeLinecap="round" />
              )}
              {pathSet.has(e.id) && (
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#101010" strokeWidth="3" strokeDasharray="2 14" strokeLinecap="round" />
              )}
              {st && <StatusMark x={(a.x + b.x) / 2} y={(a.y + b.y) / 2} kind={st} />}
              {edgeLabels && !st && (
                <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 11} textAnchor="middle" fontSize="11" fontWeight="700" fill="#e9e9e4" style={{ paintOrder: 'stroke' }} stroke="#101114" strokeWidth="3">
                  {Math.round(density[e.id] ?? 0)}
                </text>
              )}
              {onEdge && <line className="edge-hit" x1={a.x} y1={a.y} x2={b.x} y2={b.y} onClick={() => onEdge(e.id)}><title>{`${a.name} to ${b.name}`}</title></line>}
            </g>
          )
        })}

        {vehicles && <Vehicles density={density} status={status} />}

        {NODES.map((n) => {
          const isStart = n.id === start
          const isGoal = n.id === goal
          const isCur = n.id === current
          const ex = exploredSet.has(n.id)
          const fr = frontierSet.has(n.id)
          const fill = isGoal ? '#ff5252' : isStart ? '#ffffff' : '#101010'
          const ink = isGoal ? '#101010' : isStart ? '#c81e1e' : '#f3f2ec'
          return (
            <g key={n.id} className="mapnode" transform={`translate(${n.x} ${n.y})`} onClick={onNode ? () => onNode(n.id) : undefined}>
              {isCur && <circle r="30" fill="none" stroke="#fff" strokeWidth="3" />}
              {fr && <rect x="-23" y="-23" width="46" height="46" rx="8" fill="none" stroke="#e8c46a" strokeWidth="3" strokeDasharray="5 4" />}
              <rect x="-18" y="-18" width="36" height="36" rx="5" fill={fill} stroke={ex ? '#5ab2ff' : isStart || isGoal ? '#e8c46a' : '#3b3f46'} strokeWidth={ex ? 4 : 2.5} />
              {isStart ? (
                <path d="M-6 0H6M0 -6V6" stroke={ink} strokeWidth="4.5" strokeLinecap="round" />
              ) : (
                <text textAnchor="middle" dy="4.5" fontSize="13" fontWeight="800" fill={ink}>{isGoal ? '!' : n.short}</text>
              )}
              {labels && (
                <text y="36" textAnchor="middle" fontSize="12" fontWeight="700" fill="#cfd0d3" style={{ paintOrder: 'stroke' }} stroke="#101114" strokeWidth="4">{n.name}</text>
              )}
              {nodeNote && nodeNote[n.id] != null && (
                <text y="-26" textAnchor="middle" fontSize="12" fontWeight="800" fill="#e8c46a" style={{ paintOrder: 'stroke' }} stroke="#101114" strokeWidth="4">{nodeNote[n.id]}</text>
              )}
              <title>{n.name}</title>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function StatusMark({ x, y, kind }) {
  return kind === 'blocked' ? (
    <g transform={`translate(${x} ${y})`}>
      <circle r="13" fill="#ff5252" stroke="#101010" strokeWidth="2.5" />
      <path d="M-5 -5L5 5M5 -5L-5 5" stroke="#101010" strokeWidth="3.4" strokeLinecap="round" />
    </g>
  ) : (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 -15L15 11H-15Z" fill="#ff9a2e" stroke="#101010" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M0 -5V3M0 6.5V7" stroke="#101010" strokeWidth="3" strokeLinecap="round" />
    </g>
  )
}

// Cars driving the open roads; busy roads carry more cars that move slower.
function Vehicles({ density, status }) {
  const cars = useRef([])
  const [, tick] = useState(0)
  const key = JSON.stringify([density, status])

  useEffect(() => {
    const rng = makeRng(42)
    const list = []
    EDGES.forEach((e) => {
      if (status[e.id]) return
      const d = density[e.id] ?? 0
      const n = Math.max(1, Math.round(d / 22))
      for (let i = 0; i < n; i++) list.push({ e, t: rng(), dir: rng() > 0.5 ? 1 : -1, v: 0.0016 + rng() * 0.0008, slow: 1 - (d / 100) * 0.7 })
    })
    cars.current = list
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      tick((x) => x + 1)
      return undefined
    }
    let raf
    let last = 0
    const loop = (t) => {
      if (t - last > 33) {
        last = t
        for (const c of cars.current) {
          c.t += c.dir * c.v * c.slow * (c.e.length > 0 ? 160 / c.e.length : 1)
          if (c.t > 1) { c.t = 1; c.dir = -1 }
          if (c.t < 0) { c.t = 0; c.dir = 1 }
        }
        tick((x) => x + 1)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <g pointerEvents="none">
      {cars.current.map((c, i) => {
        const a = NODE_BY_ID[c.e.a]
        const b = NODE_BY_ID[c.e.b]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const len = Math.hypot(dx, dy)
        const ox = (-dy / len) * 3.2 * c.dir
        const oy = (dx / len) * 3.2 * c.dir
        return <circle key={i} cx={a.x + dx * c.t + ox} cy={a.y + dy * c.t + oy} r="3.2" fill="#fffbe0" stroke="#101010" strokeWidth="1" />
      })}
    </g>
  )
}
