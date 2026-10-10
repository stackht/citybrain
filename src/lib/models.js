// Models trained once at first use and shared by the dashboard and the experiment pages.
import { makeData, trainedModel, predict as anfisPredict } from './anfis.js'
import { trainMLP } from './mlp.js'
import { infer, leftShoulder, rightShoulder, tri } from './fuzzy.js'
import { makeVehicles, newPerceptron, perceptronEpoch, perceptronOut, LEN_MAX, WT_MAX, makeTraffic, newCompetitive, competitiveEpoch, winnerOf, describeUnit } from './neural.js'

// Hand-written fuzzy rule base (no learning): temperature + humidity -> congestion.
export const FUZZY_ONLY = {
  inputs: {
    temp: { range: [5, 45], sets: { cool: leftShoulder(12, 24), mild: tri(14, 25, 36), hot: rightShoulder(28, 38) } },
    hum: { range: [20, 100], sets: { dry: leftShoulder(35, 55), humid: tri(40, 60, 80), wet: rightShoulder(65, 85) } },
  },
  output: { range: [0, 100], sets: { light: leftShoulder(20, 45), moderate: tri(30, 52, 72), heavy: rightShoulder(58, 80) } },
  rules: [
    { if: { temp: 'cool', hum: 'dry' }, then: 'light' },
    { if: { temp: 'cool', hum: 'humid' }, then: 'moderate' },
    { if: { temp: 'cool', hum: 'wet' }, then: 'heavy' },
    { if: { temp: 'mild', hum: 'dry' }, then: 'light' },
    { if: { temp: 'mild', hum: 'humid' }, then: 'moderate' },
    { if: { temp: 'mild', hum: 'wet' }, then: 'heavy' },
    { if: { temp: 'hot', hum: 'dry' }, then: 'moderate' },
    { if: { temp: 'hot', hum: 'humid' }, then: 'heavy' },
    { if: { temp: 'hot', hum: 'wet' }, then: 'heavy' },
  ],
}

let forecast = null
export function forecastModels() {
  if (!forecast) forecast = { anfis: trainedModel(), mlp: trainMLP(makeData()) }
  return forecast
}

// Returns the three separate estimates plus the demand multiplier derived from the combined one.
export function forecastAll(temp, hum) {
  const { anfis, mlp } = forecastModels()
  const fuzzy = infer(FUZZY_ONLY, { temp, hum }).crisp
  const neural = mlp.predict(temp, hum)
  const combined = anfisPredict(anfis, temp, hum).value
  return { fuzzy, neural, combined, factor: 0.7 + (combined / 100) * 0.9 }
}

let perceptron = null
export function trainedPerceptron() {
  if (!perceptron) {
    const data = makeVehicles()
    let p = newPerceptron()
    for (let i = 0; i < 60; i++) {
      const r = perceptronEpoch(p, data)
      p = r.model
      if (!r.errors) break
    }
    perceptron = p
  }
  return perceptron
}
// "heavy" (bus / truck) vs "light" (car / bike) from the vehicle's length and weight features.
export const classifyVehicle = (feat) => (perceptronOut(trainedPerceptron(), [feat.len / LEN_MAX, feat.wt / WT_MAX]) ? 'heavy' : 'light')

let competitive = null
export function trainedCompetitive() {
  if (!competitive) {
    const data = makeTraffic()
    let m = newCompetitive(data, 4)
    for (let i = 0; i < 40; i++) m = competitiveEpoch(m, data, 0.12)
    competitive = m
  }
  return competitive
}
// Which learned traffic-pattern cluster does (hour of day, network load %) fall into?
export function patternCluster(hour, load) {
  const m = trainedCompetitive()
  const x = [hour / 24, Math.min(100, load) / 100]
  const k = winnerOf(m.units, x)
  return { k, units: m.units.map(describeUnit), current: describeUnit(m.units[k]) }
}
