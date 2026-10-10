import { useEffect, useMemo, useRef, useState } from 'react'
import {
  makeVehicles, newPerceptron, perceptronEpoch, perceptronOut, LEN_MAX, WT_MAX,
  makeTraffic, newCompetitive, competitiveEpoch, winnerOf, describeUnit,
} from '../lib/neural.js'
import { GateHead, Panel, Howto, Seg, Slider } from '../components/Ui.jsx'
import Icon from '../components/Icon.jsx'

const VEH = makeVehicles()
const TRAFFIC = makeTraffic()
const UNIT_COLORS = ['#5ab2ff', '#ff9a2e', '#35c98b', '#d58bff']

function Scatter({ w = 560, h = 340, children, xLabel, yLabel, xt, yt }) {
  return (
    <div className="svgwrap">
      <svg viewBox={`0 0 ${w} ${h}`} className="plot" role="img" aria-label={`${yLabel} against ${xLabel}`}>
        <rect x="48" y="10" width={w - 60} height={h - 46} fill="#14161a" />
        {xt.map(([v, px]) => <g key={px}><line className="grid" x1={px} x2={px} y1="10" y2={h - 36} /><text x={px} y={h - 20} textAnchor="middle">{v}</text></g>)}
        {yt.map(([v, py]) => <g key={py}><line className="grid" x1="48" x2={w - 12} y1={py} y2={py} /><text x="42" y={py + 4} textAnchor="end">{v}</text></g>)}
        <text x={w - 12} y={h - 4} textAnchor="end" style={{ fill: '#aeb0b5' }}>{xLabel}</text>
        <text x="48" y="8" style={{ fill: '#aeb0b5' }}>{yLabel}</text>
        {children}
      </svg>
    </div>
  )
}

function PerceptronLab() {
  const [p, setP] = useState(() => newPerceptron())
  const [hist, setHist] = useState([])
  const [eta, setEta] = useState(0.2)
  const [auto, setAuto] = useState(false)
  const [len, setLen] = useState(10)
  const [wt, setWt] = useState(14)

  const train = () => {
    const r = perceptronEpoch(p, VEH, eta)
    setP(r.model)
    setHist((h) => [...h, r.errors])
  }
  const reset = () => { setAuto(false); setP(newPerceptron()); setHist([]) }
  const last = hist[hist.length - 1]
  useEffect(() => {
    if (!auto) return undefined
    if (last === 0 || hist.length > 60) { setAuto(false); return undefined }
    const id = setTimeout(train, 450)
    return () => clearTimeout(id)
  }, [auto, hist]) // eslint-disable-line react-hooks/exhaustive-deps

  const W = 560, Hh = 340
  const px = (l) => 48 + (l / LEN_MAX) * (W - 60)
  const py = (wv) => 10 + (1 - wv / WT_MAX) * (Hh - 46)
  // boundary w0*x + w1*y + b = 0 over normalised x,y in [0,1]
  const line = (() => {
    const [w0, w1] = p.w
    const pts = []
    if (Math.abs(w1) > 1e-6) {
      for (const x of [0, 1]) pts.push([x, -(w0 * x + p.b) / w1])
    } else if (Math.abs(w0) > 1e-6) {
      for (const y of [0, 1]) pts.push([-(w1 * y + p.b) / w0, y])
    }
    return pts.map(([x, y]) => [48 + x * (W - 60), 10 + (1 - y) * (Hh - 46)])
  })()

  const query = [len / LEN_MAX, wt / WT_MAX]
  const net = p.w[0] * query[0] + p.w[1] * query[1] + p.b
  const yq = perceptronOut(p, query)

  return (
    <div className="layout">
      <div className="stack">
        <Panel title="Vehicle classifier" tag="Perceptron rule · synthetic vehicles">
          <Scatter xLabel="Length (m)" yLabel="Weight (t)" xt={[0, 4, 8, 12].map((v) => [v, px(v)])} yt={[0, 10, 20, 30].map((v) => [v, py(v)])}>
            <path d={`M${line.map(([a, b]) => `${a.toFixed(1)} ${b.toFixed(1)}`).join('L')}`} stroke="#e8c46a" strokeWidth="3" fill="none" clipPath="url(#clipP)" />
            <clipPath id="clipP"><rect x="48" y="10" width={W - 60} height={Hh - 46} /></clipPath>
            {VEH.map((v, i) => {
              const wrong = perceptronOut(p, v.x) !== v.label
              return v.label ? (
                <rect key={i} x={px(v.len) - 5} y={py(v.wt) - 5} width="10" height="10" fill="#ff9a2e" stroke={wrong ? '#fff' : '#101010'} strokeWidth={wrong ? 2.5 : 1} />
              ) : (
                <circle key={i} cx={px(v.len)} cy={py(v.wt)} r="5.5" fill="#5ab2ff" stroke={wrong ? '#fff' : '#101010'} strokeWidth={wrong ? 2.5 : 1} />
              )
            })}
            <g transform={`translate(${px(len)} ${py(wt)})`}>
              <path d="M-9 0H9M0 -9V9" stroke={yq ? '#ff9a2e' : '#5ab2ff'} strokeWidth="5" />
              <path d="M-9 0H9M0 -9V9" stroke="#fff" strokeWidth="1.5" />
            </g>
          </Scatter>
          <div className="legend" style={{ marginTop: 10 }}>
            <span><i style={{ background: '#5ab2ff', borderRadius: 7 }} />car</span>
            <span><i style={{ background: '#ff9a2e' }} />bus / truck</span>
            <span><i style={{ background: 'transparent', boxShadow: 'inset 0 0 0 2px #fff' }} />misclassified (white ring)</span>
            <span><i style={{ background: '#e8c46a' }} />decision line</span>
          </div>
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn" onClick={train}><Icon name="step" size={18} />Train 1 epoch</button>
            {auto ? <button className="btn ghost" onClick={() => setAuto(false)}><Icon name="pause" size={18} />Stop</button> : <button className="btn ghost" onClick={() => setAuto(true)}><Icon name="play" size={18} />Auto-train</button>}
            <button className="btn ghost" onClick={reset}><Icon name="reset" size={18} />Reset</button>
            <div style={{ minWidth: 200, flex: 1 }}><Slider label="Learning rate η" value={eta} min={0.02} max={1} step={0.01} onChange={setEta} /></div>
          </div>
        </Panel>
      </div>
      <div className="stack">
        <Panel title="Training status" tag={`epoch ${p.epoch}`}>
          <div className="metrics" style={{ marginBottom: 10 }}>
            <div className="metric"><b>{last ?? '-'}</b><span>errors last epoch</span></div>
            <div className="metric"><b>{VEH.length}</b><span>vehicles</span></div>
          </div>
          {hist.length > 0 && <p className="note num">Errors per epoch: {hist.join(', ')}</p>}
          {last === 0 && <p style={{ fontWeight: 800, color: 'var(--low)', marginTop: 6 }}>Converged: every vehicle classified correctly.</p>}
          <span className="formula">w = [{p.w.map((v) => v.toFixed(2)).join(', ')}], b = {p.b.toFixed(2)}</span>
        </Panel>
        <Panel title="Try a vehicle">
          <Slider label="Length" value={len} min={3} max={14} step={0.1} unit=" m" onChange={setLen} />
          <Slider label="Weight" value={wt} min={0.5} max={30} step={0.5} unit=" t" onChange={setWt} />
          <p style={{ fontWeight: 800, fontSize: '1.2rem', marginTop: 6 }}>{yq ? 'Heavy vehicle (bus / truck)' : 'Car'}</p>
          <span className="formula">net = w·x + b = {net.toFixed(2)} → {net >= 0 ? '≥ 0 → 1' : '< 0 → 0'}</span>
        </Panel>
        <Howto>
          <p>A perceptron draws one straight line. For each sample it computes <strong>y = 1 if w·x + b ≥ 0</strong>. If the guess is wrong, the rule nudges the line:</p>
          <span className="formula">w ← w + η (target − y) x</span>
          <p>Correct guesses change nothing, so training stops changing once the classes are separated. It works here because cars and heavy vehicles are linearly separable.</p>
        </Howto>
      </div>
    </div>
  )
}

function CompetitiveLab() {
  const [m, setM] = useState(() => newCompetitive(TRAFFIC, 4))
  const [eta, setEta] = useState(0.12)
  const [auto, setAuto] = useState(false)
  const [showTrail, setShowTrail] = useState(true)

  const train = () => setM((x) => competitiveEpoch(x, TRAFFIC, eta))
  const reset = () => { setAuto(false); setM(newCompetitive(TRAFFIC, 4)) }
  const epochRef = useRef(0)
  epochRef.current = m.epoch
  useEffect(() => {
    if (!auto) return undefined
    if (m.epoch >= 40) { setAuto(false); return undefined }
    const id = setTimeout(train, 350)
    return () => clearTimeout(id)
  }, [auto, m.epoch]) // eslint-disable-line react-hooks/exhaustive-deps

  const W = 560, Hh = 340
  const px = (hr) => 48 + (hr / 24) * (W - 60)
  const py = (v) => 10 + (1 - v / 100) * (Hh - 46)
  const assign = useMemo(() => TRAFFIC.map((p) => winnerOf(m.units, p.x)), [m])

  return (
    <div className="layout">
      <div className="stack">
        <Panel title="Traffic-pattern discovery" tag="competitive learning · synthetic counts">
          <Scatter xLabel="Hour of day" yLabel="Vehicles / min" xt={[0, 6, 12, 18, 24].map((v) => [v, px(v)])} yt={[0, 25, 50, 75, 100].map((v) => [v, py(v)])}>
            {TRAFFIC.map((p, i) => (
              <circle key={i} cx={px(p.hour)} cy={py(p.vol)} r="4" fill={m.epoch ? UNIT_COLORS[assign[i]] : '#8d9096'} opacity="0.75" />
            ))}
            {showTrail && m.trail.map((t, k) => (
              <path key={k} d={`M${t.map(([a, b]) => `${px(a * 24).toFixed(1)} ${py(b * 100).toFixed(1)}`).join('L')}`} fill="none" stroke={UNIT_COLORS[k]} strokeWidth="2" strokeDasharray="3 3" />
            ))}
            {m.units.map((u, k) => (
              <g key={k} transform={`translate(${px(u[0] * 24)} ${py(u[1] * 100)})`}>
                <rect x="-11" y="-11" width="22" height="22" rx="4" fill={UNIT_COLORS[k]} stroke="#101010" strokeWidth="3" />
                <text textAnchor="middle" dy="4" fontSize="12" fontWeight="800" style={{ fill: '#101010' }}>{k + 1}</text>
              </g>
            ))}
          </Scatter>
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn" onClick={train}><Icon name="step" size={18} />Train 1 epoch</button>
            {auto ? <button className="btn ghost" onClick={() => setAuto(false)}><Icon name="pause" size={18} />Stop</button> : <button className="btn ghost" onClick={() => setAuto(true)}><Icon name="play" size={18} />Auto-train</button>}
            <button className="btn ghost" onClick={reset}><Icon name="reset" size={18} />Reset</button>
            <button className="btn ghost" aria-pressed={showTrail} onClick={() => setShowTrail((s) => !s)}>{showTrail ? 'Hide' : 'Show'} paths</button>
            <div style={{ minWidth: 200, flex: 1 }}><Slider label="Learning rate η" value={eta} min={0.01} max={0.5} step={0.01} onChange={setEta} /></div>
          </div>
        </Panel>
      </div>
      <div className="stack">
        <Panel title="Discovered patterns" tag={`epoch ${m.epoch}`}>
          <table>
            <thead><tr><th>Unit</th><th>Typical hour</th><th className="r">Volume</th><th className="r">Wins</th></tr></thead>
            <tbody>
              {m.units.map((u, k) => {
                const d = describeUnit(u)
                const count = assign.filter((a) => a === k).length
                return (
                  <tr key={k}>
                    <td><span className="pill" style={{ background: UNIT_COLORS[k] }}>{k + 1}</span></td>
                    <td className="num">{d.clock}</td>
                    <td className="r num">{d.vol} <span className="note">{d.band}</span></td>
                    <td className="r num">{count}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="note" style={{ marginTop: 8 }}>Nobody told the network “morning rush” or “night lull”. The units settle in the dense groups on their own.</p>
        </Panel>
        <Howto>
          <p>Unsupervised: there are no labels. Four units start in the middle. For every sample, the unit whose weights are <strong>closest wins</strong>, and only the winner moves toward the sample:</p>
          <span className="formula">w_win ← w_win + η (x − w_win)</span>
          <p>Over epochs each unit claims one group of similar traffic. If one unit never wins, it stays stuck: reset and try another learning rate.</p>
        </Howto>
      </div>
    </div>
  )
}

export default function Learning() {
  const [tab, setTab] = useState('perceptron')
  return (
    <div className="page">
      <GateHead gate="9" icon="perceptron" title="Vehicle classes and traffic patterns">
        Supervised learning sorts vehicles with the Perceptron rule. Unsupervised learning finds traffic patterns with the competitive rule, with no labels at all.
      </GateHead>
      <div className="row" style={{ marginBottom: 24 }}>
        <Seg label="Learning type" value={tab} onChange={setTab} options={[{ value: 'perceptron', label: 'Supervised: Perceptron' }, { value: 'competitive', label: 'Unsupervised: Competitive' }]} />
      </div>
      {tab === 'perceptron' ? <PerceptronLab /> : <CompetitiveLab />}
    </div>
  )
}
