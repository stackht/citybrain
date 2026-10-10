import { useEffect, useMemo, useRef, useState } from 'react'
import { SIGNAL_SYSTEM, infer } from '../lib/fuzzy.js'
import { GateHead, Panel, Howto, Slider } from '../components/Ui.jsx'
import { MFPlot, OutputPlot, RuleTable } from '../components/FuzzyView.jsx'
import Icon from '../components/Icon.jsx'

const RED_TIME = 30

// A single approach to a junction. Time runs 6x so a cycle is watchable.
function Junction({ green, density }) {
  const [t, setT] = useState(0)
  const [queue, setQueue] = useState(8)
  const q = useRef(8)
  const frac = useRef(0)
  const cycle = green + RED_TIME

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    const id = setInterval(() => {
      setT((x) => (x + 0.6) % cycle)
      frac.current += (density / 60) * 0.6 // arrivals this tick
      while (frac.current >= 1) { q.current += 1; frac.current -= 1 }
    }, 100)
    return () => clearInterval(id)
  }, [cycle, density])

  const isGreen = t < green
  useEffect(() => {
    if (!isGreen) return undefined
    const id = setInterval(() => { q.current = Math.max(0, q.current - 1); setQueue(q.current) }, 220)
    return () => clearInterval(id)
  }, [isGreen])
  useEffect(() => { setQueue(q.current) }, [t])
  q.current = Math.min(q.current, 24)

  const remaining = Math.ceil(isGreen ? green - t : cycle - t)
  return (
    <div className="svgwrap">
      <svg viewBox="0 0 420 200" role="img" aria-label="Junction approach with queue">
        <rect x="0" y="80" width="420" height="52" fill="#2a2d32" />
        <path d="M0 106H420" stroke="#6b6f78" strokeWidth="2" strokeDasharray="14 12" />
        <rect x="262" y="80" width="6" height="52" fill="#f3f2ec" />
        {Array.from({ length: Math.min(queue, 14) }).map((_, i) => (
          <rect key={i} x={248 - i * 18} y="88" width="14" height="14" rx="3" fill={i % 3 === 0 ? '#5ab2ff' : '#d9d8d2'} stroke="#101010" strokeWidth="1.5" />
        ))}
        <g transform="translate(300 24)">
          <rect width="36" height="88" rx="5" fill="#0c0c0e" stroke="#3b3f46" strokeWidth="2" />
          <circle cx="18" cy="22" r="11" fill={isGreen ? '#2a2d32' : '#ff5252'} />
          <circle cx="18" cy="66" r="11" fill={isGreen ? '#35c98b' : '#2a2d32'} />
        </g>
        <text x="358" y="72" fontSize="40" fontWeight="800" fill={isGreen ? '#35c98b' : '#ff5252'} style={{ fontVariantNumeric: 'tabular-nums' }}>{remaining}</text>
        <text x="358" y="90" fontSize="12" fontWeight="700" fill="#aeb0b5">{isGreen ? 'green s' : 'red s'}</text>
        <text x="12" y="160" fontSize="13" fontWeight="700" fill="#aeb0b5">Queue: {queue} vehicles waiting</text>
        <text x="12" y="180" fontSize="12" fill="#8d9096">Green {green.toFixed(0)} s, red {RED_TIME} s (time runs 6x)</text>
      </svg>
    </div>
  )
}

export default function FuzzySignal() {
  const [density, setDensity] = useState(68)
  const [waiting, setWaiting] = useState(75)
  const res = useMemo(() => infer(SIGNAL_SYSTEM, { density, waiting }), [density, waiting])
  const green = Math.round(res.crisp)

  return (
    <div className="page">
      <GateHead gate="6" icon="signal" title="Adaptive green light, fuzzy controller">
        Traffic density and waiting time go in. A fuzzy controller decides how long the light stays green so queues shrink instead of following a fixed timer.
      </GateHead>

      <div className="layout">
        <div className="stack">
          <Panel title="Inputs" tag="live">
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 220 }}><Slider label="Traffic density" value={density} min={0} max={100} unit=" veh/min" onChange={setDensity} /></div>
              <div style={{ flex: 1, minWidth: 220 }}><Slider label="Waiting time" value={waiting} min={0} max={120} unit=" s" onChange={setWaiting} /></div>
            </div>
          </Panel>

          <Panel title="Step 1: fuzzify" tag="membership degrees">
            <div className="stack">
              <MFPlot variable={SIGNAL_SYSTEM.inputs.density} value={density} active={res.fuzzified.density} />
              <MFPlot variable={SIGNAL_SYSTEM.inputs.waiting} value={waiting} active={res.fuzzified.waiting} />
            </div>
          </Panel>

          <Panel title="Step 2: fire the rules" tag="min for AND">
            <RuleTable system={SIGNAL_SYSTEM} result={res} nameOf={{ density: 'density', waiting: 'wait' }} />
          </Panel>

          <Panel title="Step 3: defuzzify" tag="centroid">
            <OutputPlot system={SIGNAL_SYSTEM} result={res} unit=" s" />
          </Panel>
        </div>

        <div className="stack" style={{ position: 'sticky', top: 104 }}>
          <div className="callout">
            <p style={{ fontWeight: 800 }}>Green light duration</p>
            <h2 style={{ fontSize: 'clamp(3.4rem, 7vw, 5.4rem)', lineHeight: 0.9 }} className="num">{green}<span style={{ fontSize: '0.4em', marginLeft: 8 }}>seconds</span></h2>
            <p>{green < 28 ? 'Short green: roads are quiet.' : green < 46 ? 'Medium green: balanced demand.' : 'Long green: clear the queue.'}</p>
          </div>
          <Junction green={green} density={density} />
          <Howto>
            <p>A <strong>Mamdani</strong> controller works in four moves. <strong>Fuzzify</strong>: turn each number into degrees of “low / medium / high”. <strong>Infer</strong>: every rule fires as strongly as its weakest input. <strong>Aggregate</strong>: stack the clipped output shapes. <strong>Defuzzify</strong>: the centroid of that shape is the answer.</p>
            <p>Try density 20 and waiting 110: waiting time pushes the light longer even on a quiet road, something a crisp threshold cannot do smoothly.</p>
          </Howto>
        </div>
      </div>
    </div>
  )
}
