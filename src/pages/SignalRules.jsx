import { useState } from 'react'
import { useCity } from '../state.jsx'
import { CORRIDORS } from '../lib/city.js'
import { PROLOG_SOURCE, solveSignal, DURATIONS, THRESHOLDS } from '../lib/rules.js'
import { GateHead, Panel, Howto, Pill, Slider } from '../components/Ui.jsx'
import Icon from '../components/Icon.jsx'

function highlight(src) {
  return src.split('\n').map((line, i) => {
    if (line.trim().startsWith('%')) return <div key={i} className="c">{line}</div>
    const parts = line.split(':-')
    return (
      <div key={i}>
        {parts.length > 1 ? <>{parts[0]}<span className="k">:-</span>{parts[1]}</> : line}
      </div>
    )
  })
}

export default function SignalRules() {
  const { density, setEdgeDensity } = useCity()
  const [sel, setSel] = useState('main_road')
  const [copied, setCopied] = useState(false)

  const corridor = CORRIDORS.find((c) => c.key === sel)
  const v = density[corridor.edge]
  const res = solveSignal(sel, v)

  const facts = CORRIDORS.map((c) => `traffic_density(${c.key}, ${density[c.edge]}).`).join('\n')
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(facts)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="page">
      <GateHead gate="2·3" wide icon="rules" title="Signal advisor in Prolog rules">
        Facts hold the traffic density of each road. Logical rules classify it as low, medium or high and recommend a short, medium or long signal. This runs the same clauses as the .pl file.
      </GateHead>

      <div className="layout after">
        <div className="stack">
          <Panel title="Every road, one query" tag="signal_duration(Road, Len, Sec)">
            <table>
              <thead>
                <tr><th>Road</th><th className="r">Vehicles / min</th><th>Density</th><th>Signal</th><th className="r">Green</th></tr>
              </thead>
              <tbody>
                {CORRIDORS.map((c) => {
                  const r = solveSignal(c.key, density[c.edge])
                  return (
                    <tr key={c.key} className={'click' + (c.key === sel ? ' sel' : '')} onClick={() => setSel(c.key)}>
                      <td><button className="btn ghost sm" style={{ border: 0, padding: 0, background: 'none', boxShadow: 'none', color: 'inherit', fontWeight: 700 }} onClick={() => setSel(c.key)}>{c.label}</button></td>
                      <td className="r num">{density[c.edge]}</td>
                      <td><Pill level={r.level} /></td>
                      <td>{r.length}</td>
                      <td className="r num"><b>{r.seconds}</b> s</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Panel>

          <Panel title={`Why? Proof for ${corridor.label}`} tag="trace">
            <div style={{ marginBottom: 14 }}>
              <Slider label={`traffic_density(${sel}, V)`} value={v} min={0} max={100} unit=" veh/min" onChange={(n) => setEdgeDensity(corridor.edge, n)} hint={`low < ${THRESHOLDS.medium}, medium ${THRESHOLDS.medium}–${THRESHOLDS.high - 1}, high ≥ ${THRESHOLDS.high}`} />
            </div>
            <div className="metrics" style={{ marginBottom: 14 }}>
              <div className="metric"><b>{res.seconds}</b><span>seconds green ({res.length})</span></div>
              <div className="metric"><b style={{ textTransform: 'capitalize' }}>{res.level}</b><span>density class</span></div>
            </div>
            <div className="trace" aria-label="Prolog trace">
              {res.trace.map((t, i) => (
                <div key={i} className={t.kind}>
                  {'  '.repeat(t.depth)}{{ call: 'Call: ', exit: 'Exit: ', fail: 'Fail: ', try: '      ' }[t.kind]}{t.text}
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="stack">
          <Panel title="traffic_signal.pl" tag="SWI-Prolog">
            <div className="code" tabIndex={0}>{highlight(PROLOG_SOURCE)}</div>
            <div className="row" style={{ marginTop: 12 }}>
              <a className="btn" href="./traffic_signal.pl" download="traffic_signal.pl"><Icon name="download" size={18} />Download .pl</a>
              <button className="btn ghost" onClick={copy}><Icon name={copied ? 'check' : 'copy'} size={18} />{copied ? 'Copied' : 'Copy live facts'}</button>
            </div>
            <p className="note" style={{ marginTop: 8 }}>“Copy live facts” exports the densities currently on the sliders as Prolog facts. Signal lengths: short {DURATIONS.short} s, medium {DURATIONS.medium} s, long {DURATIONS.long} s.</p>
          </Panel>
          <Howto>
            <p><strong>Facts</strong> state what is true: <span className="mono">traffic_density(main_road, 72).</span></p>
            <p><strong>Rules</strong> say what follows: <span className="mono">density_level(R, high) :- traffic_density(R, V), V &gt;= 60.</span> Prolog tries clauses top to bottom and backtracks when a test fails, shown in the trace as Fail lines.</p>
            <p>Run it yourself: <span className="mono">swipl -s traffic_signal.pl</span> then <span className="mono">?- report.</span></p>
          </Howto>
        </div>
      </div>
    </div>
  )
}
