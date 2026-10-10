import { curve } from '../lib/fuzzy.js'
import { LinePlot, SERIES_COLORS } from './Ui.jsx'

// Membership functions of one variable with the current crisp value marked.
export function MFPlot({ variable, value, active, title }) {
  const series = Object.entries(variable.sets).map(([label, fn], i) => ({
    pts: curve(fn, variable.range),
    color: SERIES_COLORS[i % 4],
    w: active && active[label] > 0 ? 3.5 : 2,
    opacity: active ? 0.4 + 0.6 * Math.min(1, active[label] * 2) : 1,
  }))
  return (
    <div>
      <div className="field-top" style={{ marginBottom: 4 }}>
        <span className="lbl">{title || variable.label}</span>
        <span className="legend">
          {Object.keys(variable.sets).map((l, i) => (
            <span key={l}><i style={{ background: SERIES_COLORS[i % 4] }} />{l}{active ? ` ${active[l].toFixed(2)}` : ''}</span>
          ))}
        </span>
      </div>
      <div className="svgwrap">
        <LinePlot series={series} xRange={variable.range} yRange={[0, 1]} markers={[{ at: value, label: String(Math.round(value * 10) / 10) }]} width={420} height={150} />
      </div>
    </div>
  )
}

// Aggregated output shape and the centroid, plus the fired rule table.
export function OutputPlot({ system, result, unit }) {
  const out = system.output
  const series = Object.entries(out.sets).map(([label, fn], i) => ({
    pts: curve(fn, out.range),
    color: SERIES_COLORS[i % 4],
    w: 1.5,
    dash: '4 3',
    opacity: 0.7,
  }))
  const fill = { pts: result.xs.map((x, i) => [x, result.agg[i]]), color: '#e8c46a' }
  return (
    <div>
      <div className="field-top" style={{ marginBottom: 4 }}>
        <span className="lbl">Aggregated output and centroid</span>
        <span className="legend">
          {Object.keys(out.sets).map((l, i) => (
            <span key={l}><i style={{ background: SERIES_COLORS[i % 4] }} />{l}</span>
          ))}
        </span>
      </div>
      <div className="svgwrap">
        <LinePlot series={series} fill={fill} xRange={out.range} yRange={[0, 1]} markers={[{ at: result.crisp, label: `${result.crisp.toFixed(1)}${unit}`, dash: '0' }]} width={420} height={160} />
      </div>
    </div>
  )
}

export function RuleTable({ system, result, nameOf }) {
  return (
    <table>
      <thead><tr><th>IF</th><th>THEN</th><th style={{ width: '32%' }}>Strength</th></tr></thead>
      <tbody>
        {result.fired.map((r, i) => (
          <tr key={i} style={{ opacity: r.strength > 0.001 ? 1 : 0.45 }}>
            <td>{Object.entries(r.if).map(([k, v]) => `${nameOf?.[k] || k} ${v}`).join(' and ')}</td>
            <td><b>{r.then}</b></td>
            <td>
              <div className="row tight">
                <div className="bar" style={{ flex: 1 }}><i style={{ width: `${r.strength * 100}%` }} /></div>
                <span className="num note" style={{ minWidth: '3.2ch' }}>{r.strength.toFixed(2)}</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
