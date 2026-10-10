import { makeRng } from './rng.js'

// 4 x 4 synthetic city. All names and numbers are made up for the demo.
const COLS = [120, 350, 590, 830]
const ROWS = [95, 235, 380, 525]
const NAMES = [
  'St. Mary Hospital', 'Central Market', 'Tech Park', 'Airport Road',
  'Old Bridge', 'City Square', 'Metro Hub', 'Harbour Gate',
  'Law Courts', 'Library Cross', 'Stadium', 'Mill Road',
  'Fire Station', 'Green Park', 'Bus Depot', 'Riverside',
]
const SHORT = ['H', 'MK', 'TP', 'AR', 'OB', 'CS', 'MH', 'HG', 'LC', 'LX', 'ST', 'MR', 'FS', 'GP', 'BD', 'RS']

export const NODES = NAMES.map((name, i) => ({
  id: 'n' + i,
  name,
  short: SHORT[i],
  x: COLS[i % 4] + (i % 3 === 1 ? 12 : -6) * (i % 2 ? 1 : -1),
  y: ROWS[Math.floor(i / 4)] + (i % 5 === 2 ? 14 : -4),
}))

export const NODE_BY_ID = Object.fromEntries(NODES.map((n) => [n.id, n]))

export const edgeKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`)

function buildEdges() {
  const pairs = []
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const i = r * 4 + c
      if (c < 3 && !(i === 5 || i === 9)) pairs.push([i, i + 1])
      if (r < 3) pairs.push([i, i + 4])
    }
  }
  pairs.push([0, 5], [6, 11], [10, 15])
  return pairs.map(([a, b]) => {
    const na = NODES[a]
    const nb = NODES[b]
    const length = Math.hypot(na.x - nb.x, na.y - nb.y)
    return { id: edgeKey('n' + a, 'n' + b), a: 'n' + a, b: 'n' + b, length }
  })
}

export const EDGES = buildEdges()
export const EDGE_BY_ID = Object.fromEntries(EDGES.map((e) => [e.id, e]))

export const HOSPITAL = 'n0'
export const DEFAULT_EMERGENCY = 'n15'

export const ADJ = (() => {
  const m = Object.fromEntries(NODES.map((n) => [n.id, []]))
  EDGES.forEach((e) => {
    m[e.a].push({ to: e.b, edge: e.id })
    m[e.b].push({ to: e.a, edge: e.id })
  })
  return m
})()

// Density = vehicles per minute on a road segment (0..100). Deterministic start.
export function initialDensity(seed = 7) {
  const rng = makeRng(seed)
  const d = {}
  EDGES.forEach((e) => {
    d[e.id] = Math.round(8 + rng() * 85)
  })
  return d
}

export const densityLevel = (v) => (v < 30 ? 'low' : v < 60 ? 'medium' : 'high')

// Travel cost of a segment: free-flow length stretched by congestion.
export function edgeCost(edge, density) {
  return edge.length * (1 + (density[edge.id] ?? 0) / 50)
}

export const heuristic = (aId, bId) => {
  const a = NODE_BY_ID[aId]
  const b = NODE_BY_ID[bId]
  return Math.hypot(a.x - b.x, a.y - b.y)
}

// Convert pixel-cost to "minutes" for display.
export const toMinutes = (cost) => Math.round((cost / 60) * 10) / 10

export const roadName = (edgeId) => {
  const e = EDGE_BY_ID[edgeId]
  return `${NODE_BY_ID[e.a].short}-${NODE_BY_ID[e.b].short}`
}

// Named corridors used by the rule-based advisor (they mirror prolog/traffic_signal.pl).
export const CORRIDORS = [
  { key: 'main_road', label: 'Main Road', edge: 'n1-n5' },
  { key: 'market_street', label: 'Market Street', edge: 'n0-n1' },
  { key: 'hospital_lane', label: 'Hospital Lane', edge: 'n0-n4' },
  { key: 'airport_road', label: 'Airport Road', edge: 'n2-n3' },
  { key: 'ring_road', label: 'Ring Road', edge: 'n6-n7' },
  { key: 'harbour_gate', label: 'Harbour Gate', edge: 'n11-n7' },
  { key: 'depot_street', label: 'Depot Street', edge: 'n10-n14' },
]
