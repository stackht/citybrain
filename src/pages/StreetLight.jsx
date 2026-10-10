import { useMemo, useState } from 'react'
import { LIGHT_SYSTEM, infer } from '../lib/fuzzy.js'
import { GateHead, Panel, Howto, Slider } from '../components/Ui.jsx'
import { MFPlot, OutputPlot, RuleTable } from '../components/FuzzyView.jsx'

function Scene({ ambient, activity, brightness }) {
  const b = brightness / 100
  const sky = Math.round(10 + (ambient / 100) * 130)
  const lamps = [90, 250, 410, 570, 730]
  const people = Math.round(activity / 20)
  return (
    <div className="svgwrap">
      <svg viewBox="0 0 820 260" role="img" aria-label="Street at night with lamps">
        <defs>
          {lamps.map((x) => (
            <radialGradient key={x} id={`glow${x}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffe9a0" stopOpacity={0.9 * b} />
              <stop offset="100%" stopColor="#ffe9a0" stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>
        <rect width="820" height="260" fill={`rgb(${sky * 0.55}, ${sky * 0.7}, ${sky * 1.1 + 20})`} />
        <rect y="170" width="820" height="90" fill="#26282c" />
        <rect y="160" width="820" height="14" fill="#3a3d42" />
        <path d="M0 215H820" stroke="#aaa" strokeOpacity="0.5" strokeWidth="3" strokeDasharray="30 22" />
        {lamps.map((x) => (
          <g key={x}>
            <ellipse cx={x} cy={170} rx={30 + 70 * b} ry={12 + 22 * b} fill={`url(#glow${x})`} />
            <circle cx={x} cy={70} r={30 + 90 * b} fill={`url(#glow${x})`} />
            <rect x={x - 3} y="72" width="6" height="90" fill="#1a1b1e" />
            <rect x={x - 3} y="70" width="22" height="5" fill="#1a1b1e" />
            <circle cx={x + 17} cy="80" r="8" fill={b > 0.05 ? '#fff3c4' : '#4a4d52'} opacity={0.35 + 0.65 * b} />
          </g>
        ))}
        {Array.from({ length: people }).map((_, i) => (
          <g key={i} transform={`translate(${60 + i * 150 + (i % 2) * 40} 150)`}>
            <circle cy="-16" r="6" fill="#0b0b0d" />
            <rect x="-5" y="-10" width="10" height="22" rx="3" fill="#0b0b0d" />
          </g>
        ))}
      </svg>
    </div>
  )
}

export default function StreetLight() {
  const [ambient, setAmbient] = useState(14)
  const [activity, setActivity] = useState(60)
  const res = useMemo(() => infer(LIGHT_SYSTEM, { ambient, activity }), [ambient, activity])
  const b = Math.round(res.crisp)

  return (
    <div className="page">
      <GateHead tech="Fuzzy inference" icon="bulb" title="Street lighting">
        Lamps dim when the street is bright or empty, and rise when it is dark and people or vehicles are about. Less energy, same safety.
      </GateHead>

      <div className="layout">
        <div className="stack">
          <Panel title="Street" tag="simulated">
            <Scene ambient={ambient} activity={activity} brightness={b} />
            <div className="row" style={{ marginTop: 16, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 220 }}><Slider label="Ambient light" value={ambient} min={0} max={100} unit=" lux" onChange={setAmbient} hint="0 is night, 100 is full daylight" /></div>
              <div style={{ flex: 1, minWidth: 220 }}><Slider label="Pedestrian / vehicle activity" value={activity} min={0} max={100} unit=" /min" onChange={setActivity} /></div>
            </div>
          </Panel>
          <Panel title="Fuzzification" tag="membership degrees">
            <div className="stack">
              <MFPlot variable={LIGHT_SYSTEM.inputs.ambient} value={ambient} active={res.fuzzified.ambient} />
              <MFPlot variable={LIGHT_SYSTEM.inputs.activity} value={activity} active={res.fuzzified.activity} />
            </div>
          </Panel>
          <Panel title="Rule base" tag="9 rules">
            <RuleTable system={LIGHT_SYSTEM} result={res} nameOf={{ ambient: 'light', activity: 'activity' }} />
          </Panel>
          <Panel title="Defuzzified output" tag="centroid">
            <OutputPlot system={LIGHT_SYSTEM} result={res} unit="%" />
          </Panel>
        </div>

        <div className="stack" style={{ position: 'sticky', top: 104 }}>
          <div className="callout">
            <p style={{ fontWeight: 800 }}>Lamp brightness</p>
            <h2 style={{ fontSize: 'clamp(3.4rem, 7vw, 5.4rem)', lineHeight: 0.9 }} className="num">{b}<span style={{ fontSize: '0.4em', marginLeft: 6 }}>%</span></h2>
            <p>{b < 10 ? 'Lamps off: daylight is enough.' : b < 40 ? 'Low glow: nobody needs more.' : b < 75 ? 'Medium: some traffic after dark.' : 'Full brightness: dark and busy.'}</p>
          </div>
          <Panel title="Energy saved vs always-on">
            <div className="metric"><b>{100 - b}%</b><span>of full-power lighting not used right now</span></div>
          </Panel>
          <Howto>
            <p>Two inputs, one output, nine rules. Example: <strong>IF ambient is dark AND activity is busy THEN brightness is high</strong>.</p>
            <p>Drag ambient light to 90: even with a crowd the lamps stay low because the rule base trusts daylight first. Drag it to 5 with activity 0: lamps hold a low safety glow instead of going fully dark.</p>
          </Howto>
        </div>
      </div>
    </div>
  )
}
