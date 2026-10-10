// The simulation road graph, built from the shared city (src/lib/city.js).
// Each undirected road becomes two directed lanes-of-travel ("dedges"); every
// intersection has a signal with two phase groups: NS (vertical-ish approaches)
// and EW (horizontal-ish approaches).
import { NODES, NODE_BY_ID, EDGES } from '../lib/city.js'

export const VEHICLE_SLOT = 7 // metres of road one queued car occupies (4.5 m car + 2.5 m gap)
export const MIN_GAP = 2

const WIDE_ROADS = new Set(['n1-n2', 'n1-n5', 'n6-n10', 'n10-n14', 'n0-n1']) // two lanes each way

const groupOf = (from, to) => {
  const a = NODE_BY_ID[from]
  const b = NODE_BY_ID[to]
  return Math.abs(b.x - a.x) >= Math.abs(b.y - a.y) ? 'EW' : 'NS'
}

export const DEDGES = []
for (const e of EDGES) {
  const lanes = WIDE_ROADS.has(e.id) ? 2 : 1
  const cap = Math.max(2, Math.floor((e.length * lanes) / VEHICLE_SLOT))
  for (const [from, to] of [[e.a, e.b], [e.b, e.a]]) {
    DEDGES.push({ key: `${from}>${to}`, edge: e.id, from, to, length: e.length, lanes, cap, group: groupOf(from, to) })
  }
}
export const DEDGE = Object.fromEntries(DEDGES.map((d) => [d.key, d]))

export const IN_EDGES = Object.fromEntries(NODES.map((n) => [n.id, []]))
for (const d of DEDGES) IN_EDGES[d.to].push(d)

export const otherPhase = (p) => (p === 'NS' ? 'EW' : 'NS')

export const VEHICLE_TYPES = {
  car: { len: 4.5, vmax: 12, color: '#dfe7f5' },
  bike: { len: 2, vmax: 9, color: '#8be0a0' },
  bus: { len: 10, vmax: 9, color: '#f2c14e' },
  truck: { len: 9, vmax: 8, color: '#c58cff' },
  ambulance: { len: 5.5, vmax: 19, color: '#4fd1ff' },
}
