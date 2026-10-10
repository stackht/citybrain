// Supervised (Perceptron rule) and unsupervised (competitive / winner-take-all) learning.
import { makeRng, gaussian } from './rng.js'

// ---------- Perceptron: car vs heavy vehicle (bus / truck) ----------
export const LEN_MAX = 14 // m
export const WT_MAX = 30 // tonnes

export function makeVehicles(seed = 5, perClass = 24) {
  const rng = makeRng(seed)
  const out = []
  for (let i = 0; i < perClass; i++) {
    out.push({ len: 3.4 + rng() * 1.8, wt: 0.9 + rng() * 1.3, label: 0 })
    out.push({ len: 7 + rng() * 6, wt: 6 + rng() * 22, label: 1 })
  }
  return out.map((v) => ({ ...v, x: [v.len / LEN_MAX, v.wt / WT_MAX] }))
}

export function newPerceptron(seed = 3) {
  const rng = makeRng(seed)
  return { w: [rng() - 0.5, rng() - 0.5], b: rng() - 0.5, epoch: 0 }
}

export const perceptronOut = (p, x) => (p.w[0] * x[0] + p.w[1] * x[1] + p.b >= 0 ? 1 : 0)

// One pass over the data using  w <- w + eta (t - y) x.
export function perceptronEpoch(p, data, eta = 0.2) {
  const next = { w: [...p.w], b: p.b, epoch: p.epoch + 1 }
  let errors = 0
  for (const d of data) {
    const y = perceptronOut(next, d.x)
    const err = d.label - y
    if (err !== 0) {
      errors++
      next.w[0] += eta * err * d.x[0]
      next.w[1] += eta * err * d.x[1]
      next.b += eta * err
    }
  }
  return { model: next, errors }
}

// ---------- Competitive learning: traffic-pattern discovery ----------
export const PATTERNS = [
  { name: 'Night lull', hour: 2.5, vol: 10 },
  { name: 'Morning rush', hour: 8.5, vol: 85 },
  { name: 'Midday flow', hour: 13, vol: 48 },
  { name: 'Evening rush', hour: 18, vol: 90 },
]

export function makeTraffic(seed = 9, perPattern = 30) {
  const rng = makeRng(seed)
  const pts = []
  PATTERNS.forEach((p, k) => {
    for (let i = 0; i < perPattern; i++) {
      const hour = Math.max(0, Math.min(24, p.hour + gaussian(rng) * 1.1))
      const vol = Math.max(0, Math.min(100, p.vol + gaussian(rng) * 6))
      pts.push({ hour, vol, truth: k, x: [hour / 24, vol / 100] })
    }
  })
  return pts
}

export function newCompetitive(data, k = 4, seed = 2) {
  const rng = makeRng(seed)
  // start from random points scattered in the middle so a unit can lose or win
  const units = Array.from({ length: k }, () => [0.35 + rng() * 0.3, 0.35 + rng() * 0.3])
  return { units, epoch: 0, wins: new Array(k).fill(0), trail: units.map((u) => [[...u]]) }
}

const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2

export function winnerOf(units, x) {
  let best = 0
  for (let i = 1; i < units.length; i++) if (d2(units[i], x) < d2(units[best], x)) best = i
  return best
}

// One epoch of winner-take-all: only the closest unit moves toward the sample.
export function competitiveEpoch(model, data, eta = 0.15, seed = 1) {
  const rng = makeRng(seed + model.epoch)
  const units = model.units.map((u) => [...u])
  const wins = new Array(units.length).fill(0)
  const order = data.map((_, i) => i).sort(() => rng() - 0.5)
  for (const i of order) {
    const x = data[i].x
    const w = winnerOf(units, x)
    wins[w]++
    units[w][0] += eta * (x[0] - units[w][0])
    units[w][1] += eta * (x[1] - units[w][1])
  }
  const trail = model.trail.map((t, i) => [...t, [...units[i]]])
  return { units, epoch: model.epoch + 1, wins, trail }
}

export function describeUnit(u) {
  const hour = u[0] * 24
  const vol = u[1] * 100
  const clock = `${String(Math.floor(hour)).padStart(2, '0')}:${String(Math.round((hour % 1) * 60)).padStart(2, '0')}`
  const band = vol > 70 ? 'heavy' : vol > 30 ? 'moderate' : 'light'
  return { clock, vol: Math.round(vol), band }
}
