// Signal timing decisions. Uses the project's real fuzzy engine (src/lib/fuzzy.js)
// and the rule base that mirrors prolog/traffic_signal.pl (src/lib/rules.js).
import { SIGNAL_SYSTEM, infer } from '../lib/fuzzy.js'
import { solveSignal } from '../lib/rules.js'

export const FIXED_GREEN = 30
export const YELLOW = 3
export const MIN_GREEN = 8

// Both controllers are always evaluated so the UI can compare them; `mode` picks which one is applied.
export function decideGreen(mode, density, waiting) {
  const d = Math.max(0, Math.min(100, density))
  const w = Math.max(0, Math.min(120, waiting))
  const fz = infer(SIGNAL_SYSTEM, { density: d, waiting: w })
  const rule = solveSignal('approach', Math.round(d))
  const fuzzySeconds = Math.round(fz.crisp)
  const ruleSeconds = rule.seconds
  const applied = mode === 'fixed' ? FIXED_GREEN : mode === 'rules' ? ruleSeconds : fuzzySeconds
  const topRules = fz.fired
    .filter((r) => r.strength > 0.05)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 3)
    .map((r) => ({ text: `density ${r.if.density} and wait ${r.if.waiting} → ${r.then}`, strength: r.strength }))
  return { mode, density: d, waiting: w, applied, fuzzySeconds, ruleSeconds, ruleLevel: rule.level, topRules }
}
