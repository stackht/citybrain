import { engine, SCENARIOS } from '../sim/engine.js'
import { fmtClock, fmtWall } from '../sim/format.js'
import { NODES, NODE_BY_ID, roadName } from '../lib/city.js'
import Icon from '../components/Icon.jsx'
import { LinePlot, Seg, Slider } from '../components/Ui.jsx'

// ---------- top bar: status, clocks, run controls ----------
export function TopBar({ sim }) {
  return (
    <header className="topbar">
      <div className="topbar-status">
        <span className="chip sim" title="This application runs a deterministic sample city with synthetic vehicle arrivals. No external live traffic feed is connected.">
          <i /> Simulated data
        </span>
        <span className="chip ok"><i /> System {sim.running ? 'running' : 'ready'}</span>
      </div>
      <div className="clocks">
        <div title="Simulation time: advances only while the simulation runs"><span>Simulation time</span><b className="num">{fmtClock(sim.time)}</b></div>
        <div title="Your computer's clock: not related to the simulation"><span>Wall clock</span><b className="num">{fmtWall(sim.wallNow)}</b></div>
      </div>
      <div className="runctl">
        {sim.running ? (
          <button className="btn" onClick={() => sim.pause()}><Icon name="pause" size={16} />Pause</button>
        ) : (
          <button className="btn" onClick={() => sim.start()}><Icon name="play" size={16} />{sim.tick > 0 && sim.time > SCENARIOS[sim.scenario].start ? 'Resume' : 'Start'}</button>
        )}
        <button className="btn ghost" onClick={() => sim.reset()}><Icon name="reset" size={16} />Reset</button>
        <Seg label="Simulation speed" value={sim.speed} onChange={(v) => sim.setSpeed(v)} options={[1, 2, 4, 8].map((v) => ({ value: v, label: `${v}×` }))} />
        <Seg label="Signal control mode" value={sim.mode} onChange={(m) => sim.setMode(m)} options={[{ value: 'fixed', label: 'Fixed 30 s' }, { value: 'fuzzy', label: 'AI · fuzzy' }, { value: 'rules', label: 'AI · rules' }]} />
      </div>
    </header>
  )
}

// ---------- KPI cards ----------
export function Kpis({ sim }) {
  const m = sim.metrics
  const level = m.congestion < 25 ? 'low' : m.congestion < 55 ? 'medium' : 'high'
  const cards = [
    { k: 'Active vehicles', v: m.active, u: '', hint: 'Vehicles currently on the road network' },
    { k: 'Average speed', v: m.avgSpeed.toFixed(0), u: 'km/h', hint: 'Mean speed of all moving and queued vehicles' },
    { k: 'Congestion index', v: m.congestion, u: '/100', hint: 'Blend of speed loss, stopped vehicles and how full the roads are', level },
    { k: 'Average waiting', v: m.avgWait.toFixed(0), u: 's', hint: 'Mean stopped time per trip, over recent completed trips' },
    { k: 'Active incidents', v: m.incidents, u: '', hint: 'Closed roads + emergency vehicles + roads over 85% full', level: m.incidents ? 'medium' : 'low' },
  ]
  return (
    <div className="kpis">
      {cards.map((c) => (
        <div className={'kpi' + (c.level ? ' ' + c.level : '')} key={c.k} title={c.hint}>
          <span>{c.k}</span>
          <b className="num">{c.v}<small>{c.u}</small></b>
        </div>
      ))}
    </div>
  )
}

// ---------- controls under the map ----------
export function Controls({ sim, tool, setTool, layers, setLayers, selectedEdge }) {
  const blockedIds = Object.keys(sim.blocked)
  const toggleLayer = (k) => setLayers((l) => ({ ...l, [k]: !l[k] }))
  return (
    <div className="controls panel">
      <div className="controls-grid">
        <div className="field">
          <Slider label="Traffic demand (vehicles per minute entering)" value={sim.demand} min={0} max={100} unit=" /min" onChange={(v) => sim.setDemand(v)} hint={sim.useForecast ? `Forecast scaling on: effective ${(sim.demand * sim.forecastFactor).toFixed(0)}/min` : undefined} />
          <div className="row tight">
            <button className="btn ghost sm" onClick={() => sim.addVehicles(10)}>+ 10 vehicles</button>
            <button className="btn ghost sm" onClick={() => sim.removeVehicles(10)}>− 10 vehicles</button>
          </div>
        </div>
        <div className="field">
          <span className="lbl">Map tool</span>
          <Seg label="Map tool" value={tool} onChange={setTool} options={[{ value: 'select', label: 'Select' }, { value: 'block', label: 'Block roads' }]} />
          <div className="row tight">
            <button className="btn ghost sm" disabled={!selectedEdge} onClick={() => selectedEdge && sim.toggleBlock(selectedEdge)}>
              {selectedEdge ? (sim.blocked[selectedEdge] ? `Unblock ${roadName(selectedEdge)}` : `Block ${roadName(selectedEdge)}`) : 'Select a road'}
            </button>
            <button className="btn ghost sm" disabled={!blockedIds.length} onClick={() => sim.setBlockedMap({})}>Clear {blockedIds.length || ''} closures</button>
          </div>
        </div>
        <div className="field">
          <span className="lbl">Scenario (applies on reset)</span>
          <select value={sim.scenario} onChange={(e) => sim.setScenario(e.target.value)} aria-label="Scenario">
            {Object.entries(SCENARIOS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
          <label className="check"><input type="checkbox" checked={layers.labels} onChange={() => toggleLayer('labels')} /> Names</label>
        </div>
        <div className="field">
          <span className="lbl">Map layers</span>
          <div className="row tight">
            {[['density', 'Density'], ['signals', 'Signals'], ['routes', 'Routes'], ['lights', 'Street lights']].map(([k, label]) => (
              <button key={k} className="btn ghost sm chipbtn" aria-pressed={layers[k]} onClick={() => toggleLayer(k)}>{label}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------- charts from the shared history ----------
export function Charts({ sim }) {
  const h = sim.history
  const t0 = h.length ? h[0].t : 0
  const xs = (key) => h.map((p) => [(p.t - t0) / 60, p[key]])
  const xr = [0, Math.max(2, h.length ? (h[h.length - 1].t - t0) / 60 : 2)]
  const chart = (title, key, yr, color, unit) => (
    <div className="chart">
      <div className="field-top"><span className="lbl">{title}</span><span className="val">{h.length ? Math.round(h[h.length - 1][key]) : '-'}<small>{unit}</small></span></div>
      <div className="svgwrap">
        <LinePlot series={[{ pts: xs(key).length > 1 ? xs(key) : [[0, 0], [1, 0]], color }]} xRange={xr} yRange={yr} width={360} height={140} yTicks={2} xLabel="sim min" />
      </div>
    </div>
  )
  return (
    <div className="charts">
      {chart('Congestion index', 'ci', [0, 100], '#ff7a59', '/100')}
      {chart('Average speed', 'speed', [0, 50], '#35c98b', ' km/h')}
      {chart('Active vehicles', 'active', [0, Math.max(60, ...h.map((p) => p.active))], '#4fd1ff', '')}
      {chart('Average waiting', 'wait', [0, Math.max(30, ...h.map((p) => p.wait))], '#ffb02e', ' s')}
    </div>
  )
}

// ---------- event feed ----------
const TYPE_LABEL = { system: 'System', incident: 'Incident', emergency: 'Emergency', reroute: 'Reroute', critical: 'Critical', ai: 'AI' }
export function EventFeed({ sim }) {
  return (
    <div className="panel eventfeed">
      <div className="panel-head"><h2>Event feed</h2><span className="tag">{sim.events.length} events</span></div>
      <ol>
        {sim.events.slice(0, 14).map((e) => (
          <li key={e.id} className={'ev ' + e.type}>
            <span className="num ev-t">{fmtClock(e.t)}</span>
            <span className="ev-k">{TYPE_LABEL[e.type] || e.type}</span>
            <span className="ev-x">{e.text}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export const nodeName = (id) => NODE_BY_ID[id]?.name ?? id
export const allNodes = NODES
export { engine }
