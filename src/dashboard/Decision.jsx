import { useMemo } from 'react'
import { NODES, NODE_BY_ID, roadName } from '../lib/city.js'
import { ALGOS } from '../lib/search.js'
import { conditionOf } from '../lib/anfis.js'
import { forecastAll, classifyVehicle, patternCluster } from '../lib/models.js'
import { buildModel, generate, CORPUS } from '../lib/ngram.js'
import { analyse, DEFAULT_SERVERS } from '../lib/minimax.js'
import { YELLOW } from '../sim/controller.js'
import { fmtClock } from '../sim/format.js'
import { Pill, Slider } from '../components/Ui.jsx'
import { ambientAt, lampBrightness } from './SimMap.jsx'

function Sec({ title, ps, open, children }) {
  return (
    <details className="dsec" open={open}>
      <summary><span>{title}</span><span className="tag">{ps}</span></summary>
      <div className="dsec-body">{children}</div>
    </details>
  )
}

const lvl = (v) => (v < 30 ? 'low' : v < 60 ? 'medium' : 'high')

const nodeOptions = NODES.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)

// ---------- PS 2, 3, 6: signal decision at the selected intersection ----------
function SignalSection({ sim, node, setNode }) {
  const sig = sim.signals[node]
  const d = sig.decision
  const ns = sim.approachStats(node, 'NS')
  const ew = sim.approachStats(node, 'EW')
  const score = (s) => s.queue + s.wait / 10 + s.density / 20
  const winner = score(ns) === score(ew) ? null : score(ns) > score(ew) ? 'NS' : 'EW'
  const remaining = sig.state === 'green' ? Math.max(0, sig.greenLen - sig.t) : Math.max(0, YELLOW - sig.t)
  const busiest = useMemo(
    () => NODES.map((n) => ({ id: n.id, q: sim.approachStats(n.id, 'NS').queue + sim.approachStats(n.id, 'EW').queue })).sort((a, b) => b.q - a.q).slice(0, 3),
    [sim.version] // eslint-disable-line react-hooks/exhaustive-deps
  )
  return (
    <>
      <div className="field">
        <label>Intersection</label>
        <select value={node} onChange={(e) => setNode(e.target.value)} aria-label="Intersection">{nodeOptions}</select>
      </div>
      <div className="row tight" style={{ margin: '8px 0' }}>
        <span className="lbl">Busiest now</span>
        {busiest.map((b) => <button key={b.id} className="btn ghost sm" onClick={() => setNode(b.id)}>{NODE_BY_ID[b.id].short} · {b.q} queued</button>)}
      </div>
      <div className="sigstate">
        <div className={'lamp ' + (sig.state === 'yellow' ? 'y' : 'g')}><i /></div>
        <div>
          <b>{sig.phase} {sig.state}{sig.manual ? ' (manual hold)' : ''}{sig.preempt ? ' (emergency priority)' : ''}</b>
          <div className="note num">{Math.ceil(remaining)} s remaining · green length {Math.round(sig.greenLen)} s · mode {sim.mode}</div>
        </div>
      </div>
      <table>
        <thead><tr><th>Approach</th><th className="r">Queue</th><th className="r">Road full</th><th className="r">Avg wait</th></tr></thead>
        <tbody>
          {[['NS', ns], ['EW', ew]].map(([g, s]) => (
            <tr key={g} className={winner === g ? 'sel' : ''}>
              <td>{g} {sig.phase === g && sig.state === 'green' ? '· green' : ''}</td>
              <td className="r num">{s.queue}</td>
              <td className="r num"><Pill level={lvl(s.density)}>{Math.round(s.density)}%</Pill></td>
              <td className="r num">{Math.round(s.wait)} s</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note" style={{ margin: '8px 0' }}>
        <b>Priority recommendation (PS 3):</b> {winner ? `${winner} approaches should get priority (longer queues and waits).` : 'Both approaches are balanced.'}
      </p>
      {d && (
        <div className="decision">
          <div className="row tight"><span className="lbl">Last decision for {d.phase}</span><span className="note num">at {fmtClock(d.at)}</span></div>
          <table>
            <tbody>
              <tr><td>Inputs</td><td className="r num">road {Math.round(d.density)}% full · wait {Math.round(d.waiting)} s</td></tr>
              <tr><td>Fuzzy controller (PS 6)</td><td className="r num"><b>{d.fuzzySeconds} s</b></td></tr>
              <tr><td>Rule base (PS 2): <Pill level={d.ruleLevel} /></td><td className="r num"><b>{d.ruleSeconds} s</b></td></tr>
              <tr><td>Applied ({sim.mode})</td><td className="r num"><b>{d.applied} s</b></td></tr>
            </tbody>
          </table>
          {d.topRules.length > 0 && (
            <ul className="rules">
              {d.topRules.map((r, i) => <li key={i}><span>{r.text}</span><span className="num">{r.strength.toFixed(2)}</span></li>)}
            </ul>
          )}
        </div>
      )}
      <div className="row tight" style={{ marginTop: 10 }}>
        <span className="lbl">Manual override</span>
        <button className="btn ghost sm chipbtn" aria-pressed={sig.manual === 'NS'} onClick={() => sim.setManual(node, 'NS')}>Hold NS green</button>
        <button className="btn ghost sm chipbtn" aria-pressed={sig.manual === 'EW'} onClick={() => sim.setManual(node, 'EW')}>Hold EW green</button>
        <button className="btn ghost sm" disabled={!sig.manual} onClick={() => sim.setManual(node, null)}>Auto</button>
      </div>
      <p className="note" style={{ marginTop: 8 }}>The rule base mirrors <code>prolog/traffic_signal.pl</code> as a JavaScript port. It is not a running SWI-Prolog process; run the .pl file separately to see real Prolog.</p>
    </>
  )
}

// ---------- PS 1: route planner ----------
function RouteSection({ plan }) {
  const { from, to, algo, setFrom, setTo, setAlgo, result } = plan
  return (
    <>
      <div className="row">
        <div className="field" style={{ flex: 1, minWidth: 130 }}><label>From</label><select value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Route origin">{nodeOptions}</select></div>
        <div className="field" style={{ flex: 1, minWidth: 130 }}><label>To</label><select value={to} onChange={(e) => setTo(e.target.value)} aria-label="Route destination">{nodeOptions}</select></div>
      </div>
      <div className="field" style={{ marginTop: 8 }}>
        <label>Search algorithm</label>
        <select value={algo} onChange={(e) => setAlgo(e.target.value)} aria-label="Search algorithm">{Object.entries(ALGOS).map(([k, a]) => <option key={k} value={k}>{a.label}</option>)}</select>
      </div>
      {result.found ? (
        <>
          <div className="metrics" style={{ margin: '10px 0 6px' }}>
            <div className="metric"><b>{Math.round(result.cost / 12)}</b><span>est. seconds</span></div>
            <div className="metric"><b>{result.pathEdges.length}</b><span>segments</span></div>
            <div className="metric"><b>{result.expanded}</b><span>expanded</span></div>
          </div>
          <p className="note">{result.path.map((id) => NODE_BY_ID[id].short).join(' → ')} · drawn on the map. Cost uses live road load and skips closed roads.</p>
        </>
      ) : (
        <div className="empty">No open route between these intersections.</div>
      )}
    </>
  )
}

// ---------- PS 4: ambulance ----------
function AmbulanceSection({ sim }) {
  const amb = sim.ambulance
  const v = sim.ambulanceVehicle()
  const closed = Object.entries(sim.blocked)
  return (
    <>
      <div className="field">
        <label>Emergency location</label>
        <select value={sim.ambGoal} onChange={(e) => sim.setAmbulanceGoal(e.target.value)} aria-label="Emergency location">{nodeOptions}</select>
      </div>
      <div className="row" style={{ margin: '10px 0' }}>
        <button className="btn" disabled={!!v} onClick={() => sim.dispatchAmbulance()}>{v ? 'Ambulance en route' : 'Dispatch ambulance'}</button>
        <span className="note">from {NODE_BY_ID.n0.name}, A* around closed roads</span>
      </div>
      {amb && (
        <p className="alertline" style={{ fontSize: '1.2rem' }}>
          {amb.status === 'enroute' && v ? `En route: ${v.route.length - 1 - v.ri} segments left, ${fmtClock(sim.time - amb.t0 + 0).slice(3)} elapsed. Signals ahead are switched to green.` : amb.status === 'arrived' ? `Arrived in ${amb.seconds} s of simulated time.` : ''}
        </p>
      )}
      <div className="row tight" style={{ marginTop: 6 }}>
        <span className="lbl">Closed roads</span>
        {closed.length ? closed.map(([id, t]) => <button key={id} className="btn ghost sm" onClick={() => sim.setBlocked(id, null)} title="Click to reopen">{roadName(id)} ({t}) ✕</button>) : <span className="note">none. Use the Block tool or select a road and press Block.</span>}
      </div>
    </>
  )
}

// ---------- PS 8: forecast ----------
function ForecastSection({ sim }) {
  const w = sim.weather
  const f = useMemo(() => forecastAll(w.temp, w.hum), [w.temp, w.hum])
  return (
    <>
      <Slider label="Temperature" value={w.temp} min={5} max={45} unit=" °C" onChange={(v) => sim.setWeather({ ...w, temp: v })} />
      <Slider label="Humidity" value={w.hum} min={20} max={100} unit=" %" onChange={(v) => sim.setWeather({ ...w, hum: v })} />
      <table>
        <thead><tr><th>Component</th><th className="r">Congestion index</th></tr></thead>
        <tbody>
          <tr><td>Fuzzy rules only</td><td className="r num">{f.fuzzy.toFixed(0)}</td></tr>
          <tr><td>Neural network only</td><td className="r num">{f.neural.toFixed(0)}</td></tr>
          <tr className="sel"><td><b>Combined (neuro-fuzzy)</b></td><td className="r num"><b>{f.combined.toFixed(0)} · {conditionOf(f.combined)}</b></td></tr>
        </tbody>
      </table>
      <label className="check" style={{ marginTop: 8 }}>
        <input type="checkbox" checked={sim.useForecast} onChange={(e) => sim.setForecast(e.target.checked, f.factor)} />
        Scale traffic demand by the combined forecast (×{f.factor.toFixed(2)})
      </label>
      <p className="note" style={{ marginTop: 6 }}>Trained on synthetic weather and traffic samples, not real measurements.</p>
    </>
  )
}

// ---------- PS 7: street lights ----------
function LightSection({ sim }) {
  const L = useMemo(() => lampBrightness(sim), [sim.version]) // eslint-disable-line react-hooks/exhaustive-deps
  const vals = Object.values(L.byEdge)
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length
  const ambient = ambientAt(sim.hour())
  return (
    <>
      <div className="metrics">
        <div className="metric"><b>{ambient}</b><span>ambient light %</span></div>
        <div className="metric"><b>{Math.round(mean)}</b><span>avg lamp brightness %</span></div>
        <div className="metric"><b>{Math.round(100 - mean)}</b><span>energy saved %</span></div>
      </div>
      <p className="note" style={{ marginTop: 8 }}>Ambient light follows the simulated clock (dark before 06:00 and after 18:00); activity is the vehicles on each road. Turn on the “Street lights” layer to see the glow. This controller is independent of the traffic signals.</p>
    </>
  )
}

// ---------- PS 9: vehicle classes and traffic pattern ----------
function LearningSection({ sim }) {
  const stats = useMemo(() => {
    let tp = 0, tn = 0, fp = 0, fn = 0
    for (const v of sim.vehicles) {
      if (v.emerg) continue
      const actual = v.type === 'bus' || v.type === 'truck'
      const pred = classifyVehicle(v.feat) === 'heavy'
      if (actual && pred) tp++
      else if (!actual && !pred) tn++
      else if (!actual && pred) fp++
      else fn++
    }
    return { tp, tn, fp, fn, n: tp + tn + fp + fn }
  }, [sim.version]) // eslint-disable-line react-hooks/exhaustive-deps
  const demand = Math.round(sim.demand * (sim.useForecast ? sim.forecastFactor : 1))
  const pat = patternCluster(sim.hour(), demand)
  return (
    <>
      <table>
        <thead><tr><th>Perceptron says</th><th className="r">Heavy</th><th className="r">Light</th></tr></thead>
        <tbody>
          <tr><td>Actually heavy</td><td className="r num">{stats.tp}</td><td className="r num">{stats.fn}</td></tr>
          <tr><td>Actually light</td><td className="r num">{stats.fp}</td><td className="r num">{stats.tn}</td></tr>
        </tbody>
      </table>
      <p className="note" style={{ margin: '6px 0 10px' }}>Accuracy on the {stats.n} vehicles now on the road: <b>{stats.n ? Math.round(((stats.tp + stats.tn) / stats.n) * 100) : 0}%</b> (length and weight features, heavy = bus or truck).</p>
      <p><b>Traffic pattern (competitive learning):</b> at {fmtClock(sim.time).slice(0, 5)} with demand {demand}/min the current point belongs to cluster {pat.k + 1}, which learned around <b>{pat.current.clock}</b> with <b>{pat.current.band}</b> volume.</p>
      <div className="row tight" style={{ marginTop: 6 }}>
        {pat.units.map((u, i) => <span key={i} className={'tag' + (i === pat.k ? ' on' : '')}>cluster {i + 1}: ~{u.clock}, {u.band}</span>)}
      </div>
    </>
  )
}

// ---------- PS 10: alerts ----------
let bi = null
let tri = null
function alertText(sim, density) {
  bi ||= buildModel(CORPUS, 2)
  tri ||= buildModel(CORPUS, 3)
  const closed = Object.keys(sim.blocked).length
  const seedText = sim.vehicles.some((v) => v.emerg) ? 'the ambulance' : closed ? 'construction work' : sim.metrics.congestion >= 45 ? 'heavy congestion' : sim.metrics.congestion >= 20 ? 'traffic density' : 'road conditions'
  const seed = Math.floor(sim.time / 20)
  return { seedText, bigram: generate(bi, seedText, { temperature: 0.6, seed, maxWords: 14 }).text, trigram: generate(tri, seedText, { temperature: 0.6, seed, maxWords: 16 }).text, density }
}
function AlertSection({ sim }) {
  const a = useMemo(() => alertText(sim), [Math.floor(sim.time / 20), Object.keys(sim.blocked).join(), sim.metrics.congestion >= 45, sim.metrics.congestion >= 20, sim.ambulance?.status]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <p className="note">Seed chosen from the simulation: “{a.seedText}”.</p>
      <p className="lbl" style={{ marginTop: 8 }}>Bigram micro model (1 word of context)</p>
      <p className="alertline" style={{ fontSize: '1.2rem' }}>{a.bigram}</p>
      <p className="lbl" style={{ marginTop: 8 }}>Trigram small model (2 words of context)</p>
      <p className="alertline" style={{ fontSize: '1.2rem' }}>{a.trigram}</p>
      <p className="note" style={{ marginTop: 6 }}>Text is sampled from a small predefined corpus. It is not live external intelligence, and the models only see the seed words, not the exact road.</p>
    </>
  )
}

// ---------- PS 5: security game ----------
function SecuritySection() {
  const r = useMemo(() => analyse({ servers: DEFAULT_SERVERS.map((s) => ({ ...s })), res: 3 }, 4), [])
  return (
    <>
      <p>With 3 security resources and a 4-ply look-ahead, the defender's best move is <b>{r.best.text}</b> (utility <b className="num">{r.best.value.toFixed(1)}</b>). Alpha-beta searched {r.stats.nodes} of {r.fullNodes} states.</p>
      <p className="note" style={{ margin: '6px 0 8px' }}>This is a separate game-theory simulation. It is not detecting real attacks on this application.</p>
      <a className="btn ghost sm" href="#/cyber">Open the security simulation</a>
    </>
  )
}

export default function Decision({ sim, node, setNode, plan }) {
  return (
    <aside className="decision-panel" aria-label="AI decisions">
      <div className="dp-head"><h2>AI decisions</h2><span className="tag">live</span></div>
      <Sec title="Signal control" ps="PS 2 · 3 · 6" open><SignalSection sim={sim} node={node} setNode={setNode} /></Sec>
      <Sec title="Ambulance dispatch" ps="PS 4" open><AmbulanceSection sim={sim} /></Sec>
      <Sec title="Route planner" ps="PS 1"><RouteSection plan={plan} /></Sec>
      <Sec title="Congestion forecast" ps="PS 8"><ForecastSection sim={sim} /></Sec>
      <Sec title="Street lighting" ps="PS 7"><LightSection sim={sim} /></Sec>
      <Sec title="Vehicles and patterns" ps="PS 9"><LearningSection sim={sim} /></Sec>
      <Sec title="Traffic alerts" ps="PS 10"><AlertSection sim={sim} /></Sec>
      <Sec title="Security game" ps="PS 5"><SecuritySection /></Sec>
    </aside>
  )
}
