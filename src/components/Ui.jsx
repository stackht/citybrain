import Icon from './Icon.jsx'

export function GateHead({ icon, title, tech, children }) {
  return (
    <header className="gatehead fadein">
      <div className="gatehead-ic"><Icon name={icon} size={30} /></div>
      <div>
        <h1>{title}</h1>
        <p>{children}</p>
      </div>
      {tech && <span className="tag gatehead-tech" title="Technique behind this feature">{tech}</span>}
    </header>
  )
}

export function Slider({ label, value, min, max, step = 1, unit, onChange, hint }) {
  return (
    <div className="field">
      <div className="field-top">
        <label>{label}</label>
        <span className="val">{Math.round(value * 100) / 100}<small>{unit}</small></span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
      {hint && <span className="note">{hint}</span>}
    </div>
  )
}

export function Seg({ value, options, onChange, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  )
}

export function Panel({ title, tag, children, className = '' }) {
  return (
    <section className={'panel ' + className}>
      {(title || tag) && (
        <div className="panel-head">
          {title && <h2>{title}</h2>}
          {tag && <span className="tag">{tag}</span>}
        </div>
      )}
      {children}
    </section>
  )
}

export function Howto({ title = 'How it works', children }) {
  return (
    <aside className="howto">
      <h3>{title}</h3>
      {children}
    </aside>
  )
}

export function Pill({ level, children }) {
  return <span className={'pill ' + level}>{children ?? level}</span>
}

export function nodeSelect(nodes, value, onChange, label) {
  return (
    <div className="field">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {nodes.map((n) => (
          <option key={n.id} value={n.id}>{n.name}</option>
        ))}
      </select>
    </div>
  )
}

// Line plot of one or more series, used for membership functions and loss curves.
export function LinePlot({ series, xRange, yRange = [0, 1], width = 420, height = 170, markers = [], xLabel, fill = null, yTicks = 3, logY = false }) {
  const pad = { l: 36, r: 12, t: 12, b: 28 }
  const W = width - pad.l - pad.r
  const H = height - pad.t - pad.b
  const x = (v) => pad.l + ((v - xRange[0]) / (xRange[1] - xRange[0])) * W
  const yf = (v) => {
    const t = logY ? (Math.log(Math.max(v, 1e-9)) - Math.log(yRange[0])) / (Math.log(yRange[1]) - Math.log(yRange[0])) : (v - yRange[0]) / (yRange[1] - yRange[0])
    return pad.t + (1 - Math.max(0, Math.min(1, t))) * H
  }
  const d = (pts) => pts.map(([a, b], i) => `${i ? 'L' : 'M'}${x(a).toFixed(1)} ${yf(b).toFixed(1)}`).join('')
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => yRange[0] + ((yRange[1] - yRange[0]) * i) / yTicks)
  const xt = Array.from({ length: 5 }, (_, i) => xRange[0] + ((xRange[1] - xRange[0]) * i) / 4)
  return (
    <svg className="plot" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={xLabel || 'plot'}>
      {ticks.map((t) => (
        <g key={t}>
          <line className="grid" x1={pad.l} x2={width - pad.r} y1={yf(t)} y2={yf(t)} />
          <text x={pad.l - 6} y={yf(t) + 4} textAnchor="end">{logY ? t.toPrecision(2) : Math.round(t * 100) / 100}</text>
        </g>
      ))}
      {xt.map((t) => (
        <text key={t} x={x(t)} y={height - 8} textAnchor="middle">{Math.round(t)}</text>
      ))}
      <line className="axis" x1={pad.l} x2={width - pad.r} y1={pad.t + H} y2={pad.t + H} />
      {fill && <path d={d(fill.pts) + `L${x(fill.pts[fill.pts.length - 1][0])} ${yf(yRange[0])}L${x(fill.pts[0][0])} ${yf(yRange[0])}Z`} fill={fill.color} opacity="0.35" />}
      {series.map((s, i) => (
        <path key={i} d={d(s.pts)} fill="none" stroke={s.color} strokeWidth={s.w || 2.5} strokeDasharray={s.dash} strokeLinejoin="round" opacity={s.opacity ?? 1} />
      ))}
      {markers.map((m, i) => (
        <g key={i}>
          <line x1={x(m.at)} x2={x(m.at)} y1={pad.t} y2={pad.t + H} stroke={m.color || '#e8c46a'} strokeWidth="2" strokeDasharray={m.dash || '4 3'} />
          {m.label && <text x={x(m.at) + 4} y={pad.t + 10} fill={m.color || '#e8c46a'} style={{ fill: m.color || '#e8c46a' }}>{m.label}</text>}
        </g>
      ))}
      {xLabel && <text x={width - pad.r} y={height - 8} textAnchor="end" style={{ fill: '#8d9096' }}>{xLabel}</text>}
    </svg>
  )
}

export const SERIES_COLORS = ['#5ab2ff', '#35c98b', '#ff9a2e', '#d58bff']
