import { ADJ, EDGE_BY_ID, edgeCost, heuristic } from './city.js'

export const ALGOS = {
  bfs: { label: 'Breadth-first', blurb: 'Fewest road segments. Ignores path cost.' },
  ucs: { label: 'Uniform cost', blurb: 'Cheapest by g(n) only. Optimal but explores widely.' },
  greedy: { label: 'Greedy best-first', blurb: 'Follows h(n) only. Fast, not always optimal.' },
  astar: { label: 'A*', blurb: 'f(n) = g(n) + h(n). Optimal with an admissible h.' },
}

// Runs a search and records one snapshot per node expansion for animation.
// `status` maps edgeId -> 'blocked' | 'construction'; such edges are not actions.
export function search(algo, start, goal, density, status = {}) {
  const g = { [start]: 0 }
  const parent = {}
  const order = { [start]: 0 }
  const h = (n) => heuristic(n, goal)
  const prio = (n) => {
    if (algo === 'bfs') return order[n]
    if (algo === 'ucs') return g[n]
    if (algo === 'greedy') return h(n)
    return g[n] + h(n)
  }
  let counter = 1
  const frontier = [start]
  const explored = new Set()
  const steps = []
  let found = false

  while (frontier.length) {
    frontier.sort((a, b) => prio(a) - prio(b) || order[a] - order[b])
    const cur = frontier.shift()
    if (explored.has(cur)) continue
    explored.add(cur)
    steps.push({
      current: cur,
      explored: [...explored],
      frontier: [...frontier],
      g: { ...g },
    })
    if (cur === goal) {
      found = true
      break
    }
    for (const { to, edge } of ADJ[cur]) {
      if (status[edge]) continue
      if (explored.has(to)) continue
      const ng = g[cur] + edgeCost(EDGE_BY_ID[edge], density)
      const better = g[to] === undefined || (algo !== 'bfs' && algo !== 'greedy' && ng < g[to])
      if (better) {
        g[to] = ng
        parent[to] = { from: cur, edge }
        if (!(to in order)) order[to] = counter++
        if (!frontier.includes(to)) frontier.push(to)
      }
    }
  }

  const path = []
  const pathEdges = []
  if (found) {
    let n = goal
    path.push(n)
    while (n !== start) {
      pathEdges.push(parent[n].edge)
      n = parent[n].from
      path.push(n)
    }
    path.reverse()
    pathEdges.reverse()
  }
  const cost = pathEdges.reduce((s, e) => s + edgeCost(EDGE_BY_ID[e], density), 0)
  return { found, path, pathEdges, cost, expanded: steps.length, steps }
}
