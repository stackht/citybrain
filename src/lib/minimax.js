// Cyber-defence game solved with Minimax (+ alpha-beta pruning).
// MAX = defender (AI), MIN = attacker.

export const MAX_SEC = 3

export const DEFAULT_SERVERS = [
  { id: 's0', name: 'Signal Controller', short: 'SIG', imp: 9, vuln: 3, sec: 1, comp: false },
  { id: 's1', name: 'Dispatch Server', short: 'DSP', imp: 8, vuln: 2, sec: 1, comp: false },
  { id: 's2', name: 'Camera Hub', short: 'CAM', imp: 5, vuln: 3, sec: 0, comp: false },
  { id: 's3', name: 'Public Info Portal', short: 'WEB', imp: 2, vuln: 4, sec: 0, comp: false },
]

export const cloneState = (s) => ({ servers: s.servers.map((v) => ({ ...v })), res: s.res })

export function defenderActions(s) {
  const acts = [{ type: 'pass' }]
  s.servers.forEach((v, i) => {
    if (s.res <= 0) return
    if (v.comp) acts.push({ type: 'restore', i })
    else if (v.sec < MAX_SEC) acts.push({ type: 'harden', i })
  })
  return acts
}

export function attackerActions(s) {
  const acts = []
  s.servers.forEach((v, i) => {
    if (!v.comp) acts.push({ type: 'attack', i })
  })
  if (!acts.length) acts.push({ type: 'pass' })
  return acts
}

// An attack succeeds when vulnerability exceeds the security level; otherwise it erodes security by 1.
export function apply(s, a) {
  const n = cloneState(s)
  if (a.type === 'harden') {
    n.servers[a.i].sec += 1
    n.res -= 1
  } else if (a.type === 'restore') {
    n.servers[a.i].comp = false
    n.res -= 1
  } else if (a.type === 'attack') {
    const v = n.servers[a.i]
    if (v.vuln > v.sec) v.comp = true
    else v.sec = Math.max(0, v.sec - 1)
  }
  return n
}

export function evaluate(s) {
  let score = 0
  for (const v of s.servers) {
    if (v.comp) score -= v.imp
    else score += v.imp + 0.3 * v.imp * (v.sec - v.vuln)
  }
  return score
}

export function describe(s, a) {
  if (a.type === 'pass') return 'pass'
  const v = s.servers[a.i]
  const verb = { harden: 'Harden', restore: 'Restore', attack: 'Attack' }[a.type]
  return `${verb} ${v.short}`
}

export const MAX_DEPTH_NODES = 400000

// Returns { value, pv, nodes }.
export function minimax(s, depth, maximizing, alpha, beta, stats, prune = true) {
  stats.nodes++
  if (depth === 0) return { value: evaluate(s), pv: [] }
  const acts = maximizing ? defenderActions(s) : attackerActions(s)
  let best = { value: maximizing ? -Infinity : Infinity, pv: [] }
  for (const a of acts) {
    const child = minimax(apply(s, a), depth - 1, !maximizing, alpha, beta, stats, prune)
    const better = maximizing ? child.value > best.value : child.value < best.value
    if (better) best = { value: child.value, pv: [{ who: maximizing ? 'D' : 'A', a, text: describe(s, a) }, ...child.pv] }
    if (maximizing) alpha = Math.max(alpha, best.value)
    else beta = Math.min(beta, best.value)
    if (prune && beta <= alpha) {
      stats.pruned++
      break
    }
  }
  return best
}

// Evaluate every defender move at the root so the UI can show the whole decision.
export function analyse(s, plies = 4) {
  const stats = { nodes: 0, pruned: 0 }
  const rootActs = defenderActions(s)
  const options = rootActs.map((a) => {
    const child = minimax(apply(s, a), plies - 1, false, -Infinity, Infinity, stats, true)
    return { action: a, text: describe(s, a), value: child.value, pv: [{ who: 'D', a, text: describe(s, a) }, ...child.pv] }
  })
  const full = { nodes: 0, pruned: 0 }
  minimax(s, plies, true, -Infinity, Infinity, full, false)
  options.sort((x, y) => y.value - x.value)
  return { options, best: options[0], stats, fullNodes: full.nodes }
}

export function attackerBest(s, plies = 3) {
  const stats = { nodes: 0, pruned: 0 }
  const acts = attackerActions(s)
  let best = null
  for (const a of acts) {
    const child = minimax(apply(s, a), plies - 1, true, -Infinity, Infinity, stats, true)
    if (!best || child.value < best.value) best = { action: a, value: child.value, text: describe(s, a) }
  }
  return best
}
