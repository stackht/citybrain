import { useMemo } from 'react'
import { EDGES, NODES, NODE_BY_ID, densityLevel } from '../lib/city.js'
import { LIGHT_SYSTEM, infer } from '../lib/fuzzy.js'
import { DEDGE, IN_EDGES, VEHICLE_TYPES } from '../sim/network.js'

const LEVEL = { low: '#35c98b', medium: '#ffb02e', high: '#ff5252' }
export const ROUTE = '#4fd1ff'

// Simulated daylight: dark before 06:00 and after 18:00.
export const ambientAt = (hour) => Math.round(100 * Math.pow(Math.max(0, Math.sin((Math.PI * (hour - 6)) / 12)), 0.6))

export function lampBrightness(engine) {
  const ambient = ambientAt(engine.hour())
  const counts = {}
  for (const v of engine.vehicles) {
    const e = DEDGE[v.edge].edge
    counts[e] = (counts[e] || 0) + 1
  }
  const out = {}
  for (const e of EDGES) out[e.id] = infer(LIGHT_SYSTEM, { ambient, activity: Math.min(100, (counts[e.id] || 0) * 14) }).crisp
  return { ambient, byEdge: out }
}

export default function SimMap({ engine, tool, layers, selectedNode, selectedEdge, route, onNode, onEdge }) {
  const lights = useMemo(() => (layers.lights ? lampBrightness(engine) : null), [layers.lights, engine, engine.version]) // eslint-disable-line react-hooks/exhaustive-deps
  const ambRoute = engine.ambulanceRoute()
  const pts = (nodes) => nodes.map((id) => `${NODE_BY_ID[id].x},${NODE_BY_ID[id].y}`).join(' ')

  return (
    <div className="simmap svgwrap">
      <svg viewBox="0 0 960 620" role="img" aria-label="Live road network simulation">
        <defs>
          <pattern id="simgrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="#161a22" strokeWidth="1" />
          </pattern>
          <filter id="glow"><feGaussianBlur stdDeviation="3" /></filter>
        </defs>
        <rect width="960" height="620" fill="url(#simgrid)" />

        {/* street lights overlay (under roads) */}
        {lights &&
          EDGES.map((e) => {
            const a = NODE_BY_ID[e.a]
            const b = NODE_BY_ID[e.b]
            const br = lights.byEdge[e.id] / 100
            return br > 0.04 ? <circle key={'l' + e.id} cx={(a.x + b.x) / 2} cy={(a.y + b.y) / 2} r={14 + 34 * br} fill="#ffe08a" opacity={0.08 + 0.3 * br} filter="url(#glow)" /> : null
          })}

        {/* roads */}
        {EDGES.map((e) => {
          const a = NODE_BY_ID[e.a]
          const b = NODE_BY_ID[e.b]
          const blocked = engine.blocked[e.id]
          const lvl = densityLevel(engine.density[e.id] ?? 0)
          const wide = DEDGE[`${e.a}>${e.b}`].lanes > 1
          const sel = selectedEdge === e.id
          return (
            <g key={e.id}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#07090d" strokeWidth={wide ? 20 : 15} strokeLinecap="round" />
              {sel && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fff" strokeWidth={wide ? 23 : 18} strokeLinecap="round" opacity="0.5" />}
              {blocked ? (
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={blocked === 'blocked' ? '#ff5252' : '#ffb02e'} strokeWidth="4" strokeDasharray="3 11" strokeLinecap="round" />
              ) : layers.density ? (
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={LEVEL[lvl]} strokeWidth={wide ? 10 : 7} strokeLinecap="round" opacity="0.55" />
              ) : (
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#4a505b" strokeWidth={wide ? 10 : 7} strokeLinecap="round" />
              )}
              {blocked && (
                <g transform={`translate(${(a.x + b.x) / 2} ${(a.y + b.y) / 2})`}>
                  <circle r="11" fill={blocked === 'blocked' ? '#ff5252' : '#ffb02e'} stroke="#0b0e16" strokeWidth="2.5" />
                  <path d="M-4.5 -4.5L4.5 4.5M4.5 -4.5L-4.5 4.5" stroke="#0b0e16" strokeWidth="3" strokeLinecap="round" />
                </g>
              )}
              <line className="edge-hit" x1={a.x} y1={a.y} x2={b.x} y2={b.y} onClick={() => onEdge(e.id)}>
                <title>{`${a.name} to ${b.name}${tool === 'block' ? ' (click to block or unblock)' : ''}`}</title>
              </line>
            </g>
          )
        })}

        {/* routes */}
        {layers.routes && route && route.length > 1 && <polyline points={pts(route)} fill="none" stroke={ROUTE} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" opacity="0.8" strokeDasharray="1 10" />}
        {layers.routes && ambRoute.length > 1 && (
          <g>
            <polyline points={pts(ambRoute)} fill="none" stroke={ROUTE} strokeWidth="9" strokeLinejoin="round" strokeLinecap="round" opacity="0.28" />
            <polyline points={pts(ambRoute)} fill="none" stroke={ROUTE} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" className="amb-route" />
          </g>
        )}

        {/* signals */}
        {layers.signals &&
          NODES.map((n) => {
            const sig = engine.signals[n.id]
            return IN_EDGES[n.id].map((d) => {
              const a = NODE_BY_ID[d.from]
              const dx = n.x - a.x
              const dy = n.y - a.y
              const len = Math.hypot(dx, dy)
              const ux = dx / len
              const uy = dy / len
              const x = n.x - ux * 24 - uy * 7
              const y = n.y - uy * 24 + ux * 7
              const active = sig.phase === d.group
              const col = active ? (sig.state === 'green' ? '#35e08f' : '#ffd24a') : '#ff4d4d'
              return <circle key={d.key} cx={x} cy={y} r="4" fill={col} stroke="#05070b" strokeWidth="1.2" />
            })
          })}

        {/* vehicles */}
        <g pointerEvents="none">
          {engine.vehicles.map((v) => {
            const E = DEDGE[v.edge]
            const a = NODE_BY_ID[E.from]
            const b = NODE_BY_ID[E.to]
            const f = v.pos / E.length
            const dx = b.x - a.x
            const dy = b.y - a.y
            const len = Math.hypot(dx, dy)
            const off = 3.2 + v.lane * 4.2
            const x = a.x + dx * f - (dy / len) * off
            const y = a.y + dy * f + (dx / len) * off
            const T = VEHICLE_TYPES[v.type]
            const r = v.type === 'bike' ? 2 : v.type === 'car' ? 2.9 : v.type === 'ambulance' ? 5 : 4.3
            return v.emerg ? (
              <g key={v.id} transform={`translate(${x} ${y})`}>
                <circle r="11" fill={T.color} opacity="0.25" className="amb-pulse" />
                <circle r={r} fill="#fff" stroke={ROUTE} strokeWidth="2.5" />
              </g>
            ) : (
              <circle key={v.id} cx={x} cy={y} r={r} fill={T.color} stroke="#05070b" strokeWidth="0.8" opacity={v.speed < 0.5 ? 0.7 : 1} />
            )
          })}
        </g>

        {/* intersections */}
        {NODES.map((n) => {
          const sig = engine.signals[n.id]
          const sel = selectedNode === n.id
          return (
            <g key={n.id} className="mapnode" transform={`translate(${n.x} ${n.y})`} onClick={() => onNode(n.id)}>
              {sig.preempt && <circle r="26" fill="none" stroke={ROUTE} strokeWidth="2.5" className="amb-pulse" />}
              {sel && <rect x="-23" y="-23" width="46" height="46" rx="9" fill="none" stroke="#e8c46a" strokeWidth="2.5" strokeDasharray="5 4" />}
              <rect x="-16" y="-16" width="32" height="32" rx="5" fill="#0c0f16" stroke={sig.manual ? '#e8c46a' : '#3a4150'} strokeWidth={sig.manual ? 3 : 2} />
              <text textAnchor="middle" dy="4" fontSize="11.5" fontWeight="800" fill="#eef0f6">{n.short}</text>
              {layers.labels && <text y="32" textAnchor="middle" fontSize="11" fontWeight="600" fill="#a8afbd" style={{ paintOrder: 'stroke' }} stroke="#07090d" strokeWidth="3.5">{n.name}</text>}
              <title>{`${n.name}: ${sig.phase} ${sig.state}${sig.manual ? ' (manual hold)' : ''}`}</title>
            </g>
          )
        })}
      </svg>
      <div className="map-badges">
        <span className={'badge ' + (engine.running ? 'live' : 'paused')}>{engine.running ? 'RUNNING' : 'PAUSED'}</span>
        <span className="badge sim" title="Deterministic sample city with synthetic vehicle arrivals. No live traffic feed is connected.">SIMULATED TRAFFIC</span>
        {tool === 'block' && <span className="badge tool">BLOCK TOOL: click a road</span>}
      </div>
      <div className="map-legend">
        <span><i style={{ background: '#35c98b' }} />clear</span>
        <span><i style={{ background: '#ffb02e' }} />moderate</span>
        <span><i style={{ background: '#ff5252' }} />congested or blocked</span>
        <span><i style={{ background: ROUTE }} />route</span>
        <span><i style={{ background: '#35e08f', borderRadius: 8 }} />green</span>
        <span><i style={{ background: '#ff4d4d', borderRadius: 8 }} />red signal</span>
      </div>
      
    </div>
  )
}
