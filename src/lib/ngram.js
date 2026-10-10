// Micro Language Model (bigram: 1 previous word) and Small Language Model (trigram: 2 previous words).
import { makeRng } from './rng.js'

export const CORPUS = `Traffic density is high on the main road during the morning rush hour.
Heavy congestion is expected near the city square and the metro hub.
The traffic signal turns green for a longer time when traffic density is high.
Low traffic density allows a short green signal on the quiet road.
Vehicles are waiting at the red signal near the market junction.
Road conditions are poor after heavy rain and vehicles move slowly.
An accident is blocking the left lane and congestion is building on the bridge.
The ambulance is moving fast through the clear road to the hospital.
Please avoid the stadium road because heavy traffic is reported there.
Construction work is blocking the road near the library cross.
Traffic density is low on the airport road after midnight.
Congestion is easing on the main road and vehicles are moving normally.
Vehicles are moving slowly on the bridge because of heavy rain.
The signal near the hospital turns green quickly for the ambulance.
Medium traffic density is reported on the market street this afternoon.
Road conditions are good and vehicles are moving fast on the ring road.
Heavy vehicles are waiting at the depot signal during the evening rush hour.
Congestion is building near the stadium road and the signal stays green longer.
Please use the ring road because the main road is blocked.
Traffic density is medium and the signal stays green for a medium time.
The bridge is clear and vehicles are moving normally to the airport.
A long queue of vehicles is waiting at the red signal on the main road.
Heavy rain is slowing vehicles and traffic density is rising on the bridge.
The traffic police are clearing the accident near the city square.
Road conditions are slippery near the harbour gate and vehicles are moving slowly.
Signal timing is adjusted automatically when congestion is detected on the road.
Vehicles are moving fast on the clear road to the tech park.
Heavy congestion is reported on the main road near the market junction.`

const START = '<s>'
const END = '</s>'

export const tokenize = (text) => text.toLowerCase().replace(/[^a-z\s.]/g, '').replace(/\./g, ' . ').split(/\s+/).filter(Boolean)

function sentences(text) {
  return text
    .split('\n')
    .map((l) => tokenize(l).filter((t) => t !== '.'))
    .filter((s) => s.length)
}

// order 2 = bigram (context = 1 word), order 3 = trigram (context = 2 words)
export function buildModel(text, order) {
  const table = new Map()
  const ctxLen = order - 1
  const vocab = new Set()
  for (const s of sentences(text)) {
    const toks = [...Array(ctxLen).fill(START), ...s, END]
    toks.forEach((t) => vocab.add(t))
    for (let i = ctxLen; i < toks.length; i++) {
      const ctx = toks.slice(i - ctxLen, i).join(' ')
      if (!table.has(ctx)) table.set(ctx, new Map())
      const row = table.get(ctx)
      row.set(toks[i], (row.get(toks[i]) || 0) + 1)
    }
  }
  return { order, ctxLen, table, vocab }
}

// Probability list for the next word given the typed words so far.
export function nextWords(model, words) {
  const padded = [...Array(model.ctxLen).fill(START), ...words]
  const ctx = padded.slice(padded.length - model.ctxLen).join(' ')
  const row = model.table.get(ctx)
  if (!row) return { ctx, known: false, options: [] }
  const total = [...row.values()].reduce((a, b) => a + b, 0)
  const options = [...row.entries()]
    .map(([word, count]) => ({ word, count, p: count / total }))
    .sort((a, b) => b.p - a.p || a.word.localeCompare(b.word))
  return { ctx, known: true, total, options }
}

export function pick(options, rng, temperature = 1) {
  const adj = options.map((o) => Math.pow(o.p, 1 / Math.max(temperature, 0.05)))
  const sum = adj.reduce((a, b) => a + b, 0)
  let r = rng() * sum
  for (let i = 0; i < options.length; i++) {
    r -= adj[i]
    if (r <= 0) return options[i].word
  }
  return options[options.length - 1].word
}

export function generate(model, seedText, { maxWords = 18, temperature = 0.8, seed = 1 } = {}) {
  const rng = makeRng(seed)
  const words = tokenize(seedText).filter((t) => t !== '.')
  const steps = []
  for (let i = 0; i < maxWords; i++) {
    const res = nextWords(model, words)
    if (!res.known) {
      steps.push({ ctx: res.ctx, stuck: true })
      break
    }
    const w = pick(res.options, rng, temperature)
    steps.push({ ctx: res.ctx, options: res.options.slice(0, 4), chosen: w })
    if (w === END) break
    words.push(w)
  }
  const text = words.join(' ')
  return { text: text.charAt(0).toUpperCase() + text.slice(1) + '.', steps }
}

export function modelStats(model) {
  let transitions = 0
  model.table.forEach((row) => (transitions += row.size))
  return { contexts: model.table.size, transitions, vocab: model.vocab.size }
}
