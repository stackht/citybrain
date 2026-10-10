// One authoritative traffic simulation: a single clock, a single state object.
// Every dashboard widget and every experiment page reads from this engine.
// The world is deterministic (seeded) and uses synthetic vehicle arrivals.
import { NODES, EDGES, NODE_BY_ID, HOSPITAL, DEFAULT_EMERGENCY, roadName } from '../lib/city.js'
import { search } from '../lib/search.js'
import { makeRng } from '../lib/rng.js'
import { DEDGES, DEDGE, IN_EDGES, MIN_GAP, VEHICLE_TYPES, otherPhase } from './network.js'
import { decideGreen, FIXED_GREEN, YELLOW, MIN_GREEN } from './controller.js'

export const SCENARIOS = {
  morning: { label: 'Morning rush · 07:30', start: 7.5 * 3600, demand: 45 },
  evening: { label: 'Evening dusk · 17:30', start: 17.5 * 3600, demand: 50 },
  night: { label: 'Night · 22:00', start: 22 * 3600, demand: 12 },
}

export const STEP = 0.5 // simulated seconds advanced per physics step
const MAX_VEHICLES = 240
const ACC = 2.5
const DEC = 8
const BRAKE = 4
const PREEMPT_DIST = 170

export class SimEngine {
  constructor() {
    this.listeners = new Set()
    this.version = 0
    this.running = false
    this.speed = 2 // simulated seconds per wall-clock second
    this.mode = 'fuzzy' // 'fixed' | 'fuzzy' | 'rules'
    this.scenario = 'morning'
    this.config = { updateMs: 50 }
    this.weather = { temp: 29, hum: 55 }
    this.useForecast = false
    this.forecastFactor = 1
    this.ambGoal = DEFAULT_EMERGENCY
    this.raf = 0
    this.wallNow = Date.now()
    this.subscribe = this.subscribe.bind(this)
    this.getVersion = () => this.version
    this.frame = this.frame.bind(this)
    this.reset()
    if (typeof window !== 'undefined') {
      // wall clock heartbeat, only so the clock readout moves while the simulation is paused
      setInterval(() => {
        if (!this.running) this.emit()
      }, 1000)
    }
  }

  // ---------- subscription ----------
  subscribe(cb) {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }
  emit() {
    this.version++
    this.wallNow = Date.now()
    this.listeners.forEach((l) => l())
  }

  // ---------- lifecycle ----------
  reset() {
    this.pause(false)
    const sc = SCENARIOS[this.scenario]
    this.rng = makeRng(2025)
    this.time = sc.start
    this.tick = 0
    this.vehicles = []
    this.nextId = 1
    this.blocked = {}
    this.demand = sc.demand
    this.acc = 0
    this.events = []
    this.history = []
    this.ambulance = null
    this.rerouteCount = 0
    this.preemptSeen = new Set()
    this.lastRerouteLog = 0
    this.sec = 0
    this.lastSample = sc.start
    this.density = Object.fromEntries(EDGES.map((e) => [e.id, 0]))
    this.byEdge = {}
    this.signals = {}
    NODES.forEach((n, i) => {
      this.signals[n.id] = { node: n.id, phase: i % 2 ? 'NS' : 'EW', state: 'green', t: (i * 7) % FIXED_GREEN, greenLen: FIXED_GREEN, manual: null, preempt: null, decision: null }
    })
    this.resetStats()
    this.metrics = this.emptyMetrics()
    // deterministic warm-up so the first frame already has traffic, then rewind the clock
    this.quiet = true
    for (let i = 0; i < 240; i++) this.step(STEP)
    this.quiet = false
    this.time = sc.start
    this.tick = 0
    this.events = []
    this.history = []
    this.resetStats()
    this.vehicles.forEach((v) => {
      v.wait = 0
      v.born = this.time
    })
    this.lastSample = this.time
    this.measure()
    this.sample()
    this.log('system', `Simulation reset: ${sc.label}. Simulated traffic, no live feed.`)
    this.emit()
  }

  resetStats() {
    this.stats = { completed: 0, recent: [], spawned: 0, rejected: 0 }
  }

  emptyMetrics() {
    return { active: 0, avgSpeed: 0, congestion: 0, avgWait: 0, incidents: 0, stopped: 0 }
  }

  start() {
    if (this.running) return
    this.running = true
    this.last = performance.now()
    this.lastEmit = 0
    this.log('system', 'Simulation started')
    this.emit()
    this.raf = requestAnimationFrame(this.frame)
  }
  pause(announce = true) {
    if (!this.running) return
    this.running = false
    cancelAnimationFrame(this.raf)
    if (announce) {
      this.log('system', 'Simulation paused')
      this.emit()
    }
  }
  frame(now) {
    if (!this.running) return
    const wallDt = Math.min(0.25, (now - this.last) / 1000)
    this.last = now
    this.clockAcc = (this.clockAcc || 0) + wallDt * this.speed
    let n = 0
    while (this.clockAcc >= STEP && n < 80) {
      this.step(STEP)
      this.clockAcc -= STEP
      n++
    }
    if (now - this.lastEmit >= this.config.updateMs) {
      this.lastEmit = now
      this.emit()
    }
    this.raf = requestAnimationFrame(this.frame)
  }

  // ---------- logging ----------
  log(type, text) {
    if (this.quiet) return
    this.events.unshift({ id: this.events.length ? this.events[0].id + 1 : 1, t: this.time, type, text })
    if (this.events.length > 120) this.events.length = 120
  }

  // ---------- physics step ----------
  step(dt) {
    this.tick++
    this.time += dt
    this.spawn(dt)
    this.rebuildIndex()
    this.updatePreempt()
    for (const sig of Object.values(this.signals)) this.stepSignal(sig, dt)
    this.moveVehicles(dt)
    this.sec += dt
    if (this.sec >= 1) {
      this.sec -= 1
      this.measure()
    }
    if (this.time - this.lastSample >= 5) {
      this.lastSample = this.time
      this.sample()
    }
  }

  rebuildIndex() {
    this.byEdge = {}
    for (const v of this.vehicles) (this.byEdge[v.edge] ||= []).push(v)
  }

  // ---------- demand ----------
  spawn(dt) {
    const rate = this.demand * (this.useForecast ? this.forecastFactor : 1)
    this.acc += (rate / 60) * dt
    while (this.acc >= 1) {
      this.acc -= 1
      this.spawnOne()
    }
  }

  pickType() {
    const r = this.rng()
    return r < 0.72 ? 'car' : r < 0.8 ? 'bike' : r < 0.9 ? 'bus' : 'truck'
  }

  makeFeatures(type) {
    const r = this.rng
    if (type === 'bike') return { len: 1.7 + r() * 0.5, wt: 0.1 + r() * 0.15 }
    if (type === 'bus') return { len: 9 + r() * 3, wt: 10 + r() * 8 }
    if (type === 'truck') return { len: 7 + r() * 6, wt: 8 + r() * 20 }
    if (type === 'ambulance') return { len: 5.5, wt: 3 }
    return { len: 3.4 + r() * 1.8, wt: 0.9 + r() * 1.3 }
  }

  makeVehicle(type, route, emerg = false) {
    const T = VEHICLE_TYPES[type]
    const id = this.nextId++
    const edge = `${route[0]}>${route[1]}`
    return { id, type, len: T.len, vmax: T.vmax, route, ri: 0, edge, pos: 0, speed: 0, wait: 0, stopRun: 0, emerg, feat: this.makeFeatures(type), dest: route[route.length - 1], origin: route[0], born: this.time, lane: id % DEDGE[edge].lanes, step: -1 }
  }

  entryFree(key, len = 4.5) {
    const list = this.byEdge[key]
    if (!list || !list.length) return true
    let min = Infinity
    for (const v of list) if (v.pos < min) min = v.pos
    return min >= len + MIN_GAP + 1
  }

  spawnOne() {
    if (this.vehicles.length >= MAX_VEHICLES) {
      this.stats.rejected++
      return null
    }
    const a = NODES[Math.floor(this.rng() * NODES.length)].id
    let b = a
    while (b === a) b = NODES[Math.floor(this.rng() * NODES.length)].id
    const r = search('astar', a, b, this.density, this.blocked)
    if (!r.found || r.path.length < 3) return null
    const type = this.pickType()
    const key = `${r.path[0]}>${r.path[1]}`
    if (!this.entryFree(key, VEHICLE_TYPES[type].len)) {
      this.stats.rejected++
      return null
    }
    const v = this.makeVehicle(type, r.path)
    v.step = this.tick
    this.vehicles.push(v)
    ;(this.byEdge[key] ||= []).push(v)
    this.stats.spawned++
    return v
  }

  // ---------- signals ----------
  approachStats(node, group) {
    let veh = 0
    let cap = 0
    let queue = 0
    let waitSum = 0
    for (const d of IN_EDGES[node]) {
      if (d.group !== group) continue
      cap += d.cap
      const list = this.byEdge[d.key] || []
      veh += list.length
      for (const v of list) {
        if (v.speed < 1 && d.length - v.pos < 80) {
          queue++
          waitSum += v.stopRun
        }
      }
    }
    return { density: cap ? (100 * veh) / cap : 0, queue, wait: queue ? waitSum / queue : 0 }
  }

  updatePreempt() {
    for (const s of Object.values(this.signals)) s.preempt = null
    for (const v of this.vehicles) {
      if (!v.emerg) continue
      const E = DEDGE[v.edge]
      if (E.length - v.pos < PREEMPT_DIST) {
        const sig = this.signals[E.to]
        sig.preempt = E.group
        const key = `${v.id}:${E.to}`
        if (!this.preemptSeen) this.preemptSeen = new Set()
        if (!this.preemptSeen.has(key)) {
          this.preemptSeen.add(key)
          this.log('emergency', `Emergency priority: ${NODE_BY_ID[E.to].name} signal switching to ${E.group} green for the ambulance`)
        }
      }
    }
  }

  goYellow(sig) {
    sig.state = 'yellow'
    sig.t = 0
  }

  stepSignal(sig, dt) {
    sig.t += dt
    if (sig.state === 'yellow') {
      if (sig.t >= YELLOW) {
        sig.phase = otherPhase(sig.phase)
        sig.state = 'green'
        sig.t = 0
        const st = this.approachStats(sig.node, sig.phase)
        const dec = decideGreen(this.mode, st.density, st.wait)
        sig.greenLen = dec.applied
        sig.decision = { ...dec, phase: sig.phase, queue: st.queue, at: this.time }
      }
      return
    }
    const want = sig.preempt || sig.manual
    if (want) {
      if (sig.phase === want) sig.t = Math.min(sig.t, sig.greenLen - 1)
      else if (sig.t >= 3) this.goYellow(sig)
      return
    }
    const opp = otherPhase(sig.phase)
    const over = sig.t >= sig.greenLen
    const early = this.mode !== 'fixed' && sig.t >= MIN_GREEN && this.approachStats(sig.node, sig.phase).queue === 0 && this.approachStats(sig.node, opp).queue > 0
    if (over || early) this.goYellow(sig)
  }

  // ---------- vehicle movement ----------
  reroute(v) {
    const node = v.route[v.ri + 1]
    const r = search('astar', node, v.dest, this.density, this.blocked)
    if (!r.found) return false
    v.route = [...v.route.slice(0, v.ri + 1), ...r.path]
    if (v.emerg) {
      this.log('emergency', `Ambulance rerouted around a closed road, ${r.path.length - 1} segments remain`)
    } else this.rerouteCount++
    return true
  }

  moveVehicles(dt) {
    const removed = new Set()
    for (const E of DEDGES) {
      const list = this.byEdge[E.key]
      if (!list || !list.length) continue
      list.sort((a, b) => b.pos - a.pos)
      const lastInLane = {}
      for (const v of [...list]) {
        if (v.step === this.tick) continue
        v.step = this.tick
        this.moveOne(v, E, lastInLane, removed, dt)
      }
    }
    if (removed.size) this.vehicles = this.vehicles.filter((v) => !removed.has(v.id))
  }

  moveOne(v, E, lastInLane, removed, dt) {
    let limit = Infinity
    if (!v.emerg) {
      const ld = lastInLane[v.lane]
      if (ld) limit = ld.pos - ld.len - MIN_GAP
    }
    const isLast = v.ri + 1 >= v.route.length - 1
    let canCross = true
    let nextKey = null
    if (!isLast) {
      if (this.blocked[DEDGE[`${v.route[v.ri + 1]}>${v.route[v.ri + 2]}`].edge]) {
        if (!this.reroute(v)) canCross = false
      }
      nextKey = `${v.route[v.ri + 1]}>${v.route[v.ri + 2]}`
      const sig = this.signals[E.to]
      const green = sig.state === 'green' && sig.phase === E.group
      if (canCross && !green) canCross = false
      if (canCross && !v.emerg && !this.entryFree(nextKey, v.len)) canCross = false
    }
    if (!canCross) limit = Math.min(limit, E.length - 0.5)

    let allowed = v.vmax
    if (limit !== Infinity) {
      const gap = limit - v.pos
      allowed = gap <= 0.3 ? 0 : Math.min(v.vmax, Math.sqrt(2 * BRAKE * (gap - 0.3)))
    }
    const acc = v.emerg ? 4 : ACC
    v.speed = v.speed < allowed ? Math.min(allowed, v.speed + acc * dt) : Math.max(allowed, v.speed - DEC * dt)
    let np = v.pos + v.speed * dt
    if (limit !== Infinity) np = Math.max(v.pos, Math.min(np, limit))

    if (np >= E.length && canCross) {
      if (isLast) {
        removed.add(v.id)
        this.finish(v)
        return
      }
      v.ri++
      v.edge = nextKey
      v.pos = Math.max(0.1, np - E.length)
      v.lane = v.id % DEDGE[nextKey].lanes
      ;(this.byEdge[nextKey] ||= []).push(v)
      return
    }
    v.pos = np
    if (v.speed < 0.5) {
      v.wait += dt
      v.stopRun += dt
    } else v.stopRun = 0
    lastInLane[v.lane] = { pos: v.pos, len: v.len }
  }

  finish(v) {
    this.stats.completed++
    this.stats.recent.push(v.wait)
    if (this.stats.recent.length > 40) this.stats.recent.shift()
    if (v.emerg && this.ambulance) {
      const secs = Math.round(this.time - this.ambulance.t0)
      this.ambulance.status = 'arrived'
      this.ambulance.seconds = secs
      this.log('emergency', `Ambulance reached ${NODE_BY_ID[v.dest].name} in ${secs} s of simulated time`)
    }
  }

  // ---------- metrics ----------
  measure() {
    const counts = {}
    for (const v of this.vehicles) counts[v.edge] = (counts[v.edge] || 0) + 1
    let congested = 0
    for (const e of EDGES) {
      const ab = DEDGE[`${e.a}>${e.b}`]
      const ba = DEDGE[`${e.b}>${e.a}`]
      const raw = (100 * ((counts[ab.key] || 0) + (counts[ba.key] || 0))) / (ab.cap + ba.cap)
      this.density[e.id] = Math.min(100, Math.round(this.density[e.id] * 0.5 + raw * 0.5))
      if (this.density[e.id] >= 85) congested++
    }
    const n = this.vehicles.length
    let sp = 0
    let stopped = 0
    let free = 0
    let waitNow = 0
    for (const v of this.vehicles) {
      sp += v.speed
      free += v.vmax
      waitNow += v.wait
      if (v.speed < 1) stopped++
    }
    const avgSpeed = n ? (sp / n) * 3.6 : 0
    const freeSpeed = n ? (free / n) * 3.6 : 1
    const stoppedFrac = n ? stopped / n : 0
    const occ = EDGES.reduce((s, e) => s + this.density[e.id], 0) / (EDGES.length * 100)
    const speedLoss = n ? Math.max(0, 1 - avgSpeed / freeSpeed) : 0
    const congestion = Math.round(100 * Math.max(0, Math.min(1, 0.35 * speedLoss + 0.25 * stoppedFrac * Math.min(1, n / 30) + 0.4 * Math.min(1, occ * 2.5))))
    const recent = this.stats.recent
    const avgWait = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : n ? waitNow / n : 0
    const amb = this.vehicles.some((v) => v.emerg) ? 1 : 0
    this.metrics = { active: n, avgSpeed, congestion, avgWait, incidents: Object.keys(this.blocked).length + amb + congested, stopped }
    if (this.rerouteCount > 0 && this.time - this.lastRerouteLog >= 10) {
      this.log('reroute', `${this.rerouteCount} vehicle${this.rerouteCount > 1 ? 's' : ''} rerouted around closed roads`)
      this.rerouteCount = 0
      this.lastRerouteLog = this.time
    }
  }

  sample() {
    const m = this.metrics
    this.history.push({ t: this.time, ci: m.congestion, speed: m.avgSpeed, active: m.active, wait: m.avgWait })
    if (this.history.length > 240) this.history.shift()
  }

  // ---------- user actions ----------
  setSpeed(s) {
    this.speed = s
    this.emit()
  }
  setMode(mode) {
    this.mode = mode
    this.log('system', `Signal control: ${{ fixed: 'fixed timing (30 s)', fuzzy: 'AI adaptive (fuzzy controller)', rules: 'AI adaptive (Prolog-style rules)' }[mode]}. Takes effect from each intersection's next phase.`)
    this.emit()
  }
  setScenario(sc) {
    this.scenario = sc
    this.reset()
  }
  setDemand(n) {
    this.demand = n
    this.emit()
  }
  setWeather(w) {
    this.weather = w
    this.emit()
  }
  setForecast(on, factor) {
    this.useForecast = on
    this.forecastFactor = factor
    this.emit()
  }
  addVehicles(n) {
    let added = 0
    for (let i = 0; i < n * 3 && added < n; i++) if (this.spawnOne()) added++
    this.log('system', `Added ${added} vehicle${added === 1 ? '' : 's'}`)
    this.measure()
    this.emit()
  }
  removeVehicles(n) {
    let removed = 0
    for (let i = this.vehicles.length - 1; i >= 0 && removed < n; i--) {
      if (!this.vehicles[i].emerg) {
        this.vehicles.splice(i, 1)
        removed++
      }
    }
    this.log('system', `Removed ${removed} vehicle${removed === 1 ? '' : 's'}`)
    this.rebuildIndex()
    this.measure()
    this.emit()
  }
  setBlocked(edgeId, type) {
    const was = this.blocked[edgeId]
    if (type) this.blocked[edgeId] = type
    else delete this.blocked[edgeId]
    if (was !== type) {
      this.log(type ? 'incident' : 'system', type ? `Road ${roadName(edgeId)} ${type === 'blocked' ? 'blocked' : 'closed for construction'}` : `Road ${roadName(edgeId)} reopened`)
      const amb = this.vehicles.find((v) => v.emerg)
      if (amb && type) {
        const ahead = amb.route.slice(amb.ri + 1)
        for (let i = 0; i < ahead.length - 1; i++) {
          const k = `${ahead[i]}>${ahead[i + 1]}`
          if (this.blocked[DEDGE[k].edge]) {
            this.reroute(amb)
            break
          }
        }
      }
    }
    this.measure()
    this.emit()
  }
  toggleBlock(edgeId) {
    const cur = this.blocked[edgeId]
    this.setBlocked(edgeId, cur ? null : 'blocked')
  }
  setBlockedMap(map) {
    for (const id of Object.keys(this.blocked)) if (!map[id]) this.setBlocked(id, null)
    for (const [id, t] of Object.entries(map)) if (this.blocked[id] !== t) this.setBlocked(id, t)
  }
  setManual(node, group) {
    this.signals[node].manual = group
    this.log('system', group ? `Manual override: ${NODE_BY_ID[node].name} held on ${group} green` : `Manual override cleared at ${NODE_BY_ID[node].name}`)
    this.emit()
  }
  setAmbulanceGoal(g) {
    this.ambGoal = g
    this.emit()
  }
  dispatchAmbulance(goal = this.ambGoal, origin = HOSPITAL) {
    if (this.vehicles.some((v) => v.emerg)) {
      this.log('system', 'An ambulance is already en route')
      this.emit()
      return false
    }
    const r = search('astar', origin, goal, this.density, this.blocked)
    if (!r.found) {
      this.log('critical', 'No ambulance route available: every path is closed')
      this.emit()
      return false
    }
    const v = this.makeVehicle('ambulance', r.path, true)
    v.step = this.tick
    this.vehicles.push(v)
    ;(this.byEdge[v.edge] ||= []).push(v)
    this.ambulance = { id: v.id, goal, origin, t0: this.time, status: 'enroute', cost: r.cost }
    this.log('emergency', `Ambulance dispatched: ${NODE_BY_ID[origin].name} → ${NODE_BY_ID[goal].name} via A* (${r.path.length - 1} segments)`)
    this.measure()
    this.emit()
    return true
  }
  ambulanceVehicle() {
    return this.vehicles.find((v) => v.emerg) || null
  }
  ambulanceRoute() {
    const v = this.ambulanceVehicle()
    return v ? v.route.slice(v.ri) : []
  }
  hour() {
    return (this.time / 3600) % 24
  }
}

export const engine = new SimEngine()
