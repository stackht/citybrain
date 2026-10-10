import { useMemo, useRef } from 'react'
import { useCity } from '../state.jsx'
import { CORRIDORS } from '../lib/city.js'
import { solveSignal } from '../lib/rules.js'
import { makeAlert } from '../lib/alerts.js'
import { APP_NAME, APP_TAGLINE } from '../config.js'
import { GATES } from '../modules.js'
import CityMap from '../components/CityMap.jsx'
import Icon from '../components/Icon.jsx'
import { Pill } from '../components/Ui.jsx'

export default function Concourse({ go }) {
  const { density, status, alert, resetCity } = useCity()
  const ranked = useMemo(
    () => CORRIDORS.map((c) => ({ ...c, v: density[c.edge], r: solveSignal(c.key, density[c.edge]) })).sort((a, b) => b.v - a.v).slice(0, 3),
    [density]
  )
  const generated = useMemo(() => makeAlert(density), [density])
  const closed = Object.keys(status).length
  const heroRef = useRef(null)

  // The city lies on a tilted plane; the cursor leans it a few degrees.
  const onMove = (e) => {
    const el = heroRef.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty('--rx', `${(58 - y * 6).toFixed(2)}deg`)
    el.style.setProperty('--rz', `${(-22 + x * 7).toFixed(2)}deg`)
  }

  return (
    <div className="home">
      <section className="hero3d" ref={heroRef} onMouseMove={onMove}>
        <div className="hero3d-stage" aria-hidden="false">
          <div className="hero3d-plane">
            <CityMap density={density} status={status} vehicles labels={false} start="n0" goal={null} />
          </div>
        </div>

        <div className="hero3d-copy">
          <h1 className="concourse-title">{APP_NAME}</h1>
          <p>{APP_TAGLINE} One synthetic city, read by every practical in this project. Follow the route below, or run them all at once.</p>
          <div className="row">
            <button className="btn" onClick={() => document.getElementById('journey')?.scrollIntoView({ behavior: 'smooth' })}>Begin the journey <Icon name="arrow" size={16} /></button>
            <button className="btn ghost" onClick={() => go('scenario')}>Run the emergency</button>
          </div>
        </div>

        <aside className="hero3d-hud" aria-label="Live city status">
          <div className="hud-title">Live now{closed ? ` · ${closed} closed` : ''}</div>
          {ranked.map((c) => (
            <div className="hud-row" key={c.key}>
              <span>{c.label}</span>
              <Pill level={c.r.level} />
              <b>{c.r.seconds}s</b>
            </div>
          ))}
          <p className="hud-alert">{alert || generated.text}</p>
          {(closed > 0 || alert) && <button className="btn ghost sm" onClick={resetCity}><Icon name="reset" size={14} />Reset the city</button>}
        </aside>
        <div className="scroll-cue" aria-hidden="true">Scroll</div>
      </section>

      <section id="journey" className="journey" aria-label="The ten practicals">
        <div className="journey-line" aria-hidden="true" />
        {GATES.map((g, i) => (
          <article className={'stop ' + (i % 2 ? 'right' : 'left')} key={g.id}>
            <div className="stop-num" aria-hidden="true">{g.gate}</div>
            <div className="stop-body">
              <div className="stop-ic"><Icon name={g.icon} size={34} stroke={1.5} /></div>
              <h2>{g.label}</h2>
              <p className="stop-ps">{g.ps}</p>
              <p className="note">{g.method}</p>
              <button className="btn" onClick={() => go(g.id)}>Enter gate {g.gate} <Icon name="arrow" size={16} /></button>
            </div>
          </article>
        ))}
        <article className="stop finale">
          <div className="stop-body">
            <h2>All at once</h2>
            <p className="stop-ps">A storm, an accident, an ambulance and an attack. Every gate fires in one chain.</p>
            <button className="btn" onClick={() => go('scenario')}>Run the emergency <Icon name="arrow" size={16} /></button>
          </div>
        </article>
      </section>
    </div>
  )
}
