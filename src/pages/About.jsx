import { APP_NAME } from '../config.js'
import { FEATURES, SOURCE_PS, featureOf } from '../modules.js'
import { Panel } from '../components/Ui.jsx'

export default function About() {
  return (
    <div className="page">
      <header className="gatehead fadein" style={{ display: 'block' }}>
        <h1>About {APP_NAME}</h1>
        <p style={{ maxWidth: '72ch' }}>One system, many features. Each feature is a different AI technique, but they share one city, so the output of one becomes the input of the next.</p>
      </header>

      <div className="stack">
        <Panel title="The problem">
          <p className="alertline" style={{ maxWidth: '60ch' }}>
            Build an AI traffic command centre for a city: forecast congestion, recognise vehicles and patterns, plan routes and ambulance dispatch, set signal timings and street lighting, write alerts for people, and defend the control servers from attack.
          </p>
        </Panel>

        <Panel title="How the ten source statements map to features" tag="for examiners">
          <table>
            <thead><tr><th>#</th><th>Source problem statement</th><th>Feature</th><th>Technique</th></tr></thead>
            <tbody>
              {SOURCE_PS.map((p) => {
                const f = featureOf(p.feature)
                return (
                  <tr key={p.n}>
                    <td className="num">{p.n}</td>
                    <td>{p.text}</td>
                    <td><a href={`#/${f.id}`} style={{ color: 'var(--gold)', fontWeight: 700 }}>{f.label}</a></td>
                    <td className="note">{f.tech}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="note" style={{ marginTop: 10 }}>Statements 2 and 3 are the same Prolog task (one road, then many roads), so they share the Signal advisor.</p>
        </Panel>

        <Panel title="How the features feed each other">
          <ol style={{ margin: 0, paddingLeft: '1.2em', display: 'grid', gap: 8, maxWidth: '70ch' }}>
            <li>The <b>Congestion forecast</b> turns the weather into a traffic multiplier for every road.</li>
            <li>The <b>Signal advisor</b> and <b>Adaptive signals</b> turn road density into green times.</li>
            <li>The <b>Route planner</b> and <b>Ambulance dispatch</b> use the same densities as travel cost, and skip closed roads.</li>
            <li>The <b>Alert desk</b> writes a message about the busiest road.</li>
            <li>The <b>Cyber shield</b> protects the servers that run all of the above.</li>
          </ol>
          <p className="note" style={{ marginTop: 10 }}>The Emergency drill runs this whole chain on one screen. All {FEATURES.length} features use synthetic data and run in the browser with no backend.</p>
        </Panel>
      </div>
    </div>
  )
}
