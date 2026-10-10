import { CORRIDORS } from './city.js'
import { classify } from './rules.js'
import { buildModel, generate, CORPUS } from './ngram.js'

let slm = null
export const trigram = () => (slm ||= buildModel(CORPUS, 3))

// Writes a short alert for the busiest corridor using the trigram model.
export function makeAlert(density, seed = 5) {
  const ranked = CORRIDORS.map((c) => ({ ...c, v: density[c.edge] })).sort((a, b) => b.v - a.v)
  const top = ranked[0]
  const level = classify(top.v)
  const prompt = { high: 'heavy congestion', medium: 'traffic density', low: 'road conditions' }[level]
  const g = generate(trigram(), prompt, { temperature: 0.6, seed, maxWords: 16 })
  return { road: top.label, level, text: `${top.label}: ${g.text}` }
}
