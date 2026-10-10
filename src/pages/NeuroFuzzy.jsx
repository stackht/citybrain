import { useEffect, useMemo, useRef, useState } from 'react'
import { makeData, newModel, trainEpoch, mse, predict, memberships, conditionOf, T_RANGE, H_RANGE, SET_NAMES } from '../lib/anfis.js'
import { GateHead, Panel, Howto, Slider, LinePlot, SERIES_COLORS } from '../components/Ui.jsx'
import Icon from '../components/Icon.jsx'

const DATA = makeData()
const heat = (v) => {
  // 0 -> green, 50 -> orange, 100 -> red
  const t = Math.max(0, Math.min(1, v / 100))
  const h = 150 - t * 150
  return `hsl(${h} 70% ${34 + t * 8}%)`
}

export default function NeuroFuzzy() {
  const initial = useRef(newModel()).current
  const [model, setModel] = useState(initial)
  const [losses, setLosses] = useState(() => [mse(initial, DATA)])
  const [auto, setAuto] = useState(false)
  const [T, setT] = useState(34)
  const [H, setH] = useState(78)

  const train = (n = 1) => {
    setModel((m) => {
      let x = m
      const ls = []
      for (let i = 0; i < n; i++) {
        x = trainEpoch(x, DATA, 0.006)
        ls.push(mse(x, DATA))
      }
      setLosses((l) => [...l, ...ls])
      return x
    })
  }
  const reset = () => {
    setAuto(false)
    setModel(initial)
    setLosses([mse(initial, DATA)])
  }
  useEffect(() => {
    if (!auto) return undefined
    if (model.epoch >= 120) {
      setAuto(false)
      return undefined
    }
    const id = setTimeout(() => train(1), 90)
    return () => clearTimeout(id)
  }, [auto, model.epoch]) // eslint-disable-line react-hooks/exhaustive-deps

  const p = useMemo(() => predict(model, T, H), [model, T, H])
  const cond = conditionOf(p.value)
  const lossNow = losses[losses.length - 1]

  const mfT = useMemo(() => memberships(model, 0), [model])
  const mfH = useMemo(() => memberships(model, 1), [model])
  const mf0T = useMemo(() => memberships(initial, 0), [initial])
  const mf0H = useMemo(() => memberships(initial, 1), [initial])

  const grid = useMemo(() => {
    const cells = []
    const nx = 28
    const ny = 18
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        const t = T_RANGE[0] + ((i + 0.5) / nx) * (T_RANGE[1] - T_RANGE[0])
        const h = H_RANGE[0] + ((j + 0.5) / ny) * (H_RANGE[1] - H_RANGE[0])
        cells.push({ i, j, v: predict(model, t, h).value })
      }
    }
    return { cells, nx, ny }
  }, [model])

  const W = 560
  const Ht = 340
  const pad = { l: 44, r: 10, t: 10, b: 34 }
  const gx = (t) => pad.l + ((t - T_RANGE[0]) / (T_RANGE[1] - T_RANGE[0])) * (W - pad.l - pad.r)
  const gy = (h) => pad.t + (1 - (h - H_RANGE[0]) / (H_RANGE[1] - H_RANGE[0])) * (Ht - pad.t - pad.b)
  const cw = (W - pad.l - pad.r) / grid.nx
  const ch = (Ht - pad.t - pad.b) / grid.ny

  return (
    <div className="page">
      <GateHead gate="8" icon="brain" title="Neuro-fuzzy traffic prediction">
        Temperature and humidity predict how congested the roads will be. A fuzzy rule base supplies the reasoning, a neural training loop learns its parameters from data.
      </GateHead>

      <div className="layout">
        <div className="stack">
          <Panel title="Prediction map" tag="synthetic training data">
            <div className="svgwrap">
              <svg viewBox={`0 0 ${W} ${Ht}`} className="plot" role="img" aria-label="Predicted congestion by temperature and humidity">
                {grid.cells.map((c) => (
                  <rect key={c.i + '-' + c.j} x={pad.l + c.i * cw} y={pad.t + (grid.ny - 1 - c.j) * ch} width={cw + 0.5} height={ch + 0.5} fill={heat(c.v)} />
                ))}
                {DATA.map((d, k) => (
                  <circle key={k} cx={gx(d.T)} cy={gy(d.H)} r="2.6" fill={heat(d.y)} stroke="#f3f2ec" strokeWidth="1" opacity="0.9" />
                ))}
                <line x1={gx(T)} x2={gx(T)} y1={pad.t} y2={Ht - pad.b} stroke="#e8c46a" strokeWidth="2" strokeDasharray="5 4" />
                <line x1={pad.l} x2={W - pad.r} y1={gy(H)} y2={gy(H)} stroke="#e8c46a" strokeWidth="2" strokeDasharray="5 4" />
                <circle cx={gx(T)} cy={gy(H)} r="8" fill="#e8c46a" stroke="#101010" strokeWidth="3" />
                {[10, 20, 30, 40].map((t) => <text key={t} x={gx(t)} y={Ht - 16} textAnchor="middle">{t}°C</text>)}
                {[30, 50, 70, 90].map((h) => <text key={h} x={pad.l - 6} y={gy(h) + 4} textAnchor="end">{h}%</text>)}
                <text x={W - pad.r} y={Ht - 2} textAnchor="end" style={{ fill: '#aeb0b5' }}>Temperature →   Humidity ↑</text>
              </svg>
            </div>
            <div className="legend" style={{ marginTop: 10 }}>
              <span><i style={{ background: heat(10) }} />light</span>
              <span><i style={{ background: heat(50) }} />moderate</span>
              <span><i style={{ background: heat(90) }} />heavy</span>
              <span className="note">Dots are the 150 synthetic training samples. Background is what the model predicts.</span>
            </div>
            <div className="row" style={{ marginTop: 16, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 220 }}><Slider label="Temperature" value={T} min={5} max={45} unit=" °C" onChange={setT} /></div>
              <div style={{ flex: 1, minWidth: 220 }}><Slider label="Humidity" value={H} min={20} max={100} unit=" %" onChange={setH} /></div>
            </div>
          </Panel>

          <Panel title="Learned membership functions" tag="dashed = before training">
            <div className="stack">
              {[[0, 'Temperature', T_RANGE, mfT, mf0T, T], [1, 'Humidity', H_RANGE, mfH, mf0H, H]].map(([i, name, range, now, before, val]) => (
                <div key={name}>
                  <div className="field-top" style={{ marginBottom: 4 }}>
                    <span className="lbl">{name}</span>
                    <span className="legend">{SET_NAMES[i].map((l, k) => <span key={l}><i style={{ background: SERIES_COLORS[k] }} />{l}</span>)}</span>
                  </div>
                  <div className="svgwrap">
                    <LinePlot
                      series={[...before.map((pts, k) => ({ pts, color: SERIES_COLORS[k], dash: '3 4', w: 1.5, opacity: 0.5 })), ...now.map((pts, k) => ({ pts, color: SERIES_COLORS[k] }))]}
                      xRange={range}
                      yRange={[0, 1]}
                      markers={[{ at: val }]}
                      width={420}
                      height={140}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="stack" style={{ position: 'sticky', top: 104 }}>
          <div className="callout">
            <p style={{ fontWeight: 800 }}>Predicted congestion index</p>
            <h2 style={{ fontSize: 'clamp(3.4rem, 7vw, 5.4rem)', lineHeight: 0.9 }} className="num">{Math.round(p.value)}<span style={{ fontSize: '0.4em', marginLeft: 6 }}>/ 100</span></h2>
            <p style={{ fontSize: '1.2rem', fontWeight: 800 }}>{cond} traffic expected</p>
          </div>

          <Panel title="Training" tag={`epoch ${model.epoch}`}>
            <div className="row" style={{ marginBottom: 12 }}>
              <button className="btn" onClick={() => train(1)}><Icon name="step" size={18} />Train 1</button>
              <button className="btn ghost" onClick={() => train(10)}>Train 10</button>
              {auto ? <button className="btn ghost" onClick={() => setAuto(false)}><Icon name="pause" size={18} />Stop</button> : <button className="btn ghost" onClick={() => setAuto(true)}><Icon name="play" size={18} />Auto</button>}
              <button className="btn ghost" onClick={reset}><Icon name="reset" size={18} />Reset</button>
            </div>
            <div className="metric" style={{ marginBottom: 8 }}><b>{lossNow.toFixed(1)}</b><span>mean squared error {losses.length > 1 ? `(started at ${losses[0].toFixed(0)})` : '(untrained)'}</span></div>
            <div className="svgwrap">
              <LinePlot series={[{ pts: losses.map((l, i) => [i, l]), color: '#e8c46a' }]} xRange={[0, Math.max(10, losses.length - 1)]} yRange={[0, Math.ceil(Math.max(...losses) / 10) * 10]} yTicks={4} width={420} height={150} />
            </div>
          </Panel>

          <Panel title="Rules at this input" tag="Sugeno">
            <table>
              <tbody>
                {p.w.map((w, k) => {
                  const rel = w / p.W
                  return (
                    <tr key={k} style={{ opacity: rel > 0.02 ? 1 : 0.4 }}>
                      <td>{SET_NAMES[0][Math.floor(k / 3)]} & {SET_NAMES[1][k % 3]}</td>
                      <td className="r num">{p.f[k].toFixed(0)}</td>
                      <td style={{ width: '34%' }}><div className="bar"><i style={{ width: `${rel * 100}%` }} /></div></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="note" style={{ marginTop: 8 }}>Each rule predicts a value; the bars are how much each is trusted.</p>
          </Panel>

          <Howto>
            <p><strong>Fuzzy side:</strong> 3 temperature sets × 3 humidity sets give 9 IF-THEN rules. Each rule outputs a linear function of the inputs (Takagi-Sugeno).</p>
            <p><strong>Neural side:</strong> every training epoch runs <strong>hybrid learning</strong>: least squares fits the rule outputs, then gradient descent nudges the membership curves' centres and widths to cut the error.</p>
            <p>Press Auto and watch the curves slide to the places where the data changes: that is what the network learned.</p>
          </Howto>
        </div>
      </div>
    </div>
  )
}
