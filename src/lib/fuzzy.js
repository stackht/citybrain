// Generic Mamdani fuzzy inference: fuzzify, fire rules (min), aggregate (max), centroid.
export const tri = (a, b, c) => (x) => (x <= a || x >= c ? 0 : x < b ? (x - a) / (b - a) : (c - x) / (c - b))
export const leftShoulder = (b, c) => (x) => (x <= b ? 1 : x >= c ? 0 : (c - x) / (c - b))
export const rightShoulder = (a, b) => (x) => (x <= a ? 0 : x >= b ? 1 : (x - a) / (b - a))

// system = { inputs: {name:{range, sets:{label:fn}}}, output:{range, sets}, rules:[{if:{in:'set'}, then:'set'}] }
export function infer(system, values) {
  const fuzzified = {}
  for (const [name, v] of Object.entries(system.inputs)) {
    fuzzified[name] = {}
    for (const [label, fn] of Object.entries(v.sets)) fuzzified[name][label] = fn(values[name])
  }
  const fired = system.rules.map((r) => {
    const strength = Math.min(...Object.entries(r.if).map(([name, label]) => fuzzified[name][label]))
    return { ...r, strength }
  })
  const [lo, hi] = system.output.range
  const N = 200
  const xs = []
  const agg = []
  let num = 0
  let den = 0
  for (let i = 0; i <= N; i++) {
    const x = lo + ((hi - lo) * i) / N
    let m = 0
    for (const r of fired) m = Math.max(m, Math.min(r.strength, system.output.sets[r.then](x)))
    xs.push(x)
    agg.push(m)
    num += x * m
    den += m
  }
  const crisp = den > 0 ? num / den : (lo + hi) / 2
  return { fuzzified, fired, xs, agg, crisp }
}

export function curve(fn, range, n = 100) {
  const [lo, hi] = range
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = lo + ((hi - lo) * i) / n
    return [x, fn(x)]
  })
}

// ---- Systems used by the app ----
export const SIGNAL_SYSTEM = {
  inputs: {
    density: {
      label: 'Traffic density', unit: '% full', range: [0, 100],
      sets: { low: leftShoulder(15, 40), medium: tri(25, 50, 75), high: rightShoulder(60, 85) },
    },
    waiting: {
      label: 'Waiting time', unit: 's', range: [0, 120],
      sets: { short: leftShoulder(15, 50), moderate: tri(30, 60, 90), long: rightShoulder(70, 100) },
    },
  },
  output: {
    label: 'Green duration', unit: 's', range: [10, 70],
    sets: { short: leftShoulder(20, 35), medium: tri(25, 40, 55), long: rightShoulder(45, 60) },
  },
  rules: [
    { if: { density: 'low', waiting: 'short' }, then: 'short' },
    { if: { density: 'low', waiting: 'moderate' }, then: 'short' },
    { if: { density: 'low', waiting: 'long' }, then: 'medium' },
    { if: { density: 'medium', waiting: 'short' }, then: 'medium' },
    { if: { density: 'medium', waiting: 'moderate' }, then: 'medium' },
    { if: { density: 'medium', waiting: 'long' }, then: 'long' },
    { if: { density: 'high', waiting: 'short' }, then: 'medium' },
    { if: { density: 'high', waiting: 'moderate' }, then: 'long' },
    { if: { density: 'high', waiting: 'long' }, then: 'long' },
  ],
}

export const LIGHT_SYSTEM = {
  inputs: {
    ambient: {
      label: 'Ambient light', unit: 'lux', range: [0, 100],
      sets: { dark: leftShoulder(10, 35), dim: tri(20, 45, 70), bright: rightShoulder(55, 80) },
    },
    activity: {
      label: 'Pedestrian / vehicle activity', unit: '/min', range: [0, 100],
      sets: { none: leftShoulder(5, 25), some: tri(15, 45, 75), busy: rightShoulder(60, 85) },
    },
  },
  output: {
    label: 'Brightness', unit: '%', range: [0, 100],
    sets: { off: leftShoulder(5, 20), low: tri(10, 30, 50), medium: tri(40, 60, 80), high: rightShoulder(70, 90) },
  },
  rules: [
    { if: { ambient: 'bright', activity: 'none' }, then: 'off' },
    { if: { ambient: 'bright', activity: 'some' }, then: 'off' },
    { if: { ambient: 'bright', activity: 'busy' }, then: 'low' },
    { if: { ambient: 'dim', activity: 'none' }, then: 'low' },
    { if: { ambient: 'dim', activity: 'some' }, then: 'medium' },
    { if: { ambient: 'dim', activity: 'busy' }, then: 'high' },
    { if: { ambient: 'dark', activity: 'none' }, then: 'low' },
    { if: { ambient: 'dark', activity: 'some' }, then: 'high' },
    { if: { ambient: 'dark', activity: 'busy' }, then: 'high' },
  ],
}
