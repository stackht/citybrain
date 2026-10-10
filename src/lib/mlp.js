// A tiny multilayer perceptron (2 inputs, 6 tanh hidden units, 1 linear output),
// the "neural" half of the neuro-fuzzy comparison. Trained by SGD on the same
// synthetic samples as the ANFIS model.
import { makeRng } from './rng.js'

const norm = (T, H) => [(T - 5) / 40, (H - 20) / 80]

export function trainMLP(data, { hidden = 6, epochs = 600, lr = 0.05, seed = 3 } = {}) {
  const rng = makeRng(seed)
  const W1 = Array.from({ length: hidden }, () => [rng() * 2 - 1, rng() * 2 - 1])
  const b1 = new Array(hidden).fill(0)
  const W2 = Array.from({ length: hidden }, () => rng() * 2 - 1)
  let b2 = 0.5

  const forward = (x) => {
    const h = W1.map((w, j) => Math.tanh(w[0] * x[0] + w[1] * x[1] + b1[j]))
    const y = h.reduce((s, v, j) => s + v * W2[j], b2)
    return { h, y }
  }

  for (let e = 0; e < epochs; e++) {
    for (const d of data) {
      const x = norm(d.T, d.H)
      const { h, y } = forward(x)
      const err = y - d.y / 100
      for (let j = 0; j < hidden; j++) {
        const dh = err * W2[j] * (1 - h[j] * h[j])
        W2[j] -= lr * err * h[j]
        W1[j][0] -= lr * dh * x[0]
        W1[j][1] -= lr * dh * x[1]
        b1[j] -= lr * dh
      }
      b2 -= lr * err
    }
  }
  return { predict: (T, H) => Math.max(0, Math.min(100, forward(norm(T, H)).y * 100)) }
}
