// Hybrid neuro-fuzzy system (Sugeno ANFIS-style) predicting a congestion index
// from temperature and humidity.
//  - fuzzy part: Gaussian membership functions + 3 x 3 = 9 IF-THEN rules
//  - neural part: parameters learned from data. Hybrid learning =
//    least-squares for the rule consequents (forward pass) +
//    gradient descent for the membership functions (backward pass).
import { makeRng, gaussian } from './rng.js'

export const T_RANGE = [5, 45]
export const H_RANGE = [20, 100]
export const SET_NAMES = [['cool', 'mild', 'hot'], ['dry', 'humid', 'wet']]

const clip = (v) => Math.max(-0.004, Math.min(0.004, v))
const sig = (x) => 1 / (1 + Math.exp(-x))
const norm = (T, H) => [(T - T_RANGE[0]) / (T_RANGE[1] - T_RANGE[0]), (H - H_RANGE[0]) / (H_RANGE[1] - H_RANGE[0])]

// Synthetic "ground truth" the network must discover. Labelled synthetic in the UI.
function truth(T, H) {
  return 28 + 30 * sig((H - 68) / 7) + 24 * sig((T - 35) / 3) + 8 * sig((12 - T) / 3)
}

export function makeData(n = 150, seed = 11) {
  const rng = makeRng(seed)
  return Array.from({ length: n }, () => {
    const T = T_RANGE[0] + rng() * (T_RANGE[1] - T_RANGE[0])
    const H = H_RANGE[0] + rng() * (H_RANGE[1] - H_RANGE[0])
    const y = Math.max(0, Math.min(100, truth(T, H) + gaussian(rng) * 2.5))
    return { T, H, y }
  })
}

export function newModel() {
  return {
    c: [[0.35, 0.5, 0.65], [0.35, 0.5, 0.65]],
    s: [[0.12, 0.12, 0.12], [0.12, 0.12, 0.12]],
    theta: Array.from({ length: 9 }, () => [0, 0, 50]),
    epoch: 0,
  }
}

const gauss = (x, c, s) => Math.exp(-((x - c) ** 2) / (2 * s * s))

function firing(m, x1, x2) {
  const w = []
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) w.push(gauss(x1, m.c[0][a], m.s[0][a]) * gauss(x2, m.c[1][b], m.s[1][b]))
  return w
}

export function predictRaw(m, x1, x2) {
  const w = firing(m, x1, x2)
  const W = w.reduce((a, b) => a + b, 0) || 1e-9
  let y = 0
  const f = m.theta.map(([p, q, r]) => p * x1 + q * x2 + r)
  for (let k = 0; k < 9; k++) y += (w[k] / W) * f[k]
  return { y, w, W, f }
}

export function predict(m, T, H) {
  const [x1, x2] = norm(T, H)
  const r = predictRaw(m, x1, x2)
  return { ...r, value: Math.max(0, Math.min(100, r.y)) }
}

export const conditionOf = (v) => (v < 40 ? 'Light' : v < 65 ? 'Moderate' : 'Heavy')

// Solve (A^T A + lambda I) x = A^T b by Gaussian elimination.
function solve(A, b, lambda = 1e-4) {
  const n = A[0].length
  const M = Array.from({ length: n }, () => new Array(n + 1).fill(0))
  for (let r = 0; r < A.length; r++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) M[i][j] += A[r][i] * A[r][j]
      M[i][n] += A[r][i] * b[r]
    }
  }
  for (let i = 0; i < n; i++) M[i][i] += lambda
  for (let i = 0; i < n; i++) {
    let p = i
    for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r
    ;[M[i], M[p]] = [M[p], M[i]]
    for (let r = i + 1; r < n; r++) {
      const f = M[r][i] / M[i][i]
      for (let c = i; c <= n; c++) M[r][c] -= f * M[i][c]
    }
  }
  const x = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n]
    for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j]
    x[i] = s / M[i][i]
  }
  return x
}

export function mse(m, data) {
  let s = 0
  for (const d of data) {
    const [x1, x2] = norm(d.T, d.H)
    s += (predictRaw(m, x1, x2).y - d.y) ** 2
  }
  return s / data.length
}

// One hybrid-learning epoch. Returns a new model.
export function trainEpoch(m, data, lr = 0.02) {
  const X = data.map((d) => norm(d.T, d.H))
  // forward pass: least squares on consequent parameters
  const A = X.map(([x1, x2]) => {
    const w = firing(m, x1, x2)
    const W = w.reduce((a, b) => a + b, 0) || 1e-9
    const row = []
    for (let k = 0; k < 9; k++) row.push((w[k] / W) * x1, (w[k] / W) * x2, w[k] / W)
    return row
  })
  const sol = solve(A, data.map((d) => d.y))
  const theta = Array.from({ length: 9 }, (_, k) => [sol[3 * k], sol[3 * k + 1], sol[3 * k + 2]])
  const next = { ...m, theta, c: m.c.map((r) => [...r]), s: m.s.map((r) => [...r]) }

  // backward pass: gradient descent on membership function centres and widths
  const gc = [[0, 0, 0], [0, 0, 0]]
  const gs = [[0, 0, 0], [0, 0, 0]]
  data.forEach((d, idx) => {
    const [x1, x2] = X[idx]
    const { y, w, W, f } = predictRaw(next, x1, x2)
    const e = (y - d.y) / data.length
    for (let a = 0; a < 3; a++) {
      for (let b = 0; b < 3; b++) {
        const k = a * 3 + b
        const dydw = (f[k] - y) / W
        const g1 = e * dydw * w[k]
        gc[0][a] += g1 * ((x1 - next.c[0][a]) / next.s[0][a] ** 2)
        gs[0][a] += g1 * ((x1 - next.c[0][a]) ** 2 / next.s[0][a] ** 3)
        gc[1][b] += g1 * ((x2 - next.c[1][b]) / next.s[1][b] ** 2)
        gs[1][b] += g1 * ((x2 - next.c[1][b]) ** 2 / next.s[1][b] ** 3)
      }
    }
  })
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 3; j++) {
      next.c[i][j] -= clip(lr * gc[i][j])
      next.s[i][j] = Math.max(0.06, next.s[i][j] - clip(lr * gs[i][j]))
    }
  }
  next.epoch = m.epoch + 1
  return next
}

// Membership curve of input i, set j over its real range.
export function memberships(m, i, n = 60) {
  const [lo, hi] = i === 0 ? T_RANGE : H_RANGE
  return [0, 1, 2].map((j) =>
    Array.from({ length: n + 1 }, (_, k) => {
      const real = lo + ((hi - lo) * k) / n
      return [real, gauss(k / n, m.c[i][j], m.s[i][j])]
    })
  )
}

let cached = null
// A model trained once and shared by the scenario and dashboard.
export function trainedModel(epochs = 80) {
  if (!cached) {
    const data = makeData()
    let m = newModel()
    for (let i = 0; i < epochs; i++) m = trainEpoch(m, data, 0.002)
    cached = m
  }
  return cached
}
