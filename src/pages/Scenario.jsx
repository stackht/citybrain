import { useEffect, useMemo, useRef, useState } from 'react'
import { useCity } from '../state.jsx'
import { CORRIDORS, NODE_BY_ID, EDGE_BY_ID, toMinutes, roadName } from '../lib/city.js'
import { search } from '../lib/search.js'
import { solveSignal } from '../lib/rules.js'
import { predict, conditionOf, trainedModel } from '../lib/anfis.js'
import { SIGNAL_SYSTEM, infer } from '../lib/fuzzy.js'
import { makeAlert } from '../lib/alerts.js'
import { DEFAULT_SERVERS, analyse, apply, attackerBest, describe } from '../lib/minimax.js'
import CityMap from '../components/CityMap.jsx'
import Icon from '../components/Icon.jsx'
import { GateHead, Panel, Howto, Pill, Slider } from '../components/Ui.jsx'

const STEPS = ['Forecast', 'Signal rules', 'Ambulance route', 'Accident and reroute', 'Fuzzy green light', 'Alert', 'Cyber attack']

export default function Scenario() {
  const { density, weather, setWeather, start, goal, setStatus, setAlert } = useCity()
  const [stage, setStage] = useState(0) // number of completed steps
  const [running, setRunning] = useState(false)
  const applied = useRef(false)

  // The whole chain is derived; stepping just reveals more of it.
  const chain = useMemo(() => {
    const model = trainedModel()
    const f = predict(model, weather.temp, weather.hum)
    const factor = 0.7 + (f.value / 100) * 0.9
    const eff = Object.fromEntries(Object.entries(density).map(([k, v]) => [k, Math.min(100, Math.round(v * factor))]))

    const signals = CORRIDORS.map((c) => ({ ...c, v: eff[c.edge], r: solveSignal(c.key, eff[c.edge]) })).sort((a, b) => b.v - a.v)

    const route1 = search('astar', start, goal, eff, {})
    const accidentEdge = route1.pathEdges[Math.floor(route1.pathEdges.length / 2)]
    const status = accidentEdge ? { [accidentEdge]: 'blocked' } : {}
    const route2 = search('astar', start, goal, eff, status)

    const hot = (route2.found ? route2.pathEdges : route1.pathEdges).reduce((best, e) => (eff[e] > (eff[best] ?? -1) ? e : best), null)
    const fz = hot ? infer(SIGNAL_SYSTEM, { density: eff[hot], waiting: 70 }) : null

    const al = makeAlert(eff, 7)

    const servers = DEFAULT_SERVERS.map((s) => ({ ...s }))
    const s0 = { servers, res: 3 }
    const atk = attackerBest(s0, 3)
    const an = analyse(apply(s0, atk.action), 4)

    return { f, factor, eff, signals, route1, accidentEdge, status, route2, hot, fz, al, atk, an, s0 }
  }, [density, weather, start, goal])

  // Push the story into the shared city so other gates show it.
  useEffect(() => {
    if (stage >= 4) {
      setStatus(chain.status)
      applied.current = true
    } else if (applied.current) {
      setStatus({})
      applied.current = false
    }
    if (stage >= 6) setAlert(chain.al.text)
  }, [stage, chain]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!running) return undefined
    if (stage >= STEPS.length) { setRunning(false); return undefined }
    const id = setTimeout(() => setStage((s) => s + 1), 1300)
    return () => clearTimeout(id)
  }, [running, stage])

  const run = () => { setStage(0); setRunning(true); setTimeout(() => setStage(1), 250) }
  const cls = (n) => 'link' + (stage >= n ? ' fadein' : ' idle')
  const path = stage >= 4 && chain.route2.found ? chain.route2.pathEdges : stage >= 3 ? chain.route1.pathEdges : []
  const closedStatus = stage >= 4 ? chain.status : {}

  return (
    <div className="page">
      <GateHead gate="★" icon="city" title="Emergency scenario: all gates at once">
        A storm hits, roads fill up, and an ambulance must cross the city. Each link in the chain is one of the practicals, feeding the next.
      </GateHead>

      <div className="layout">
        <div className="stack">
          <Panel title="City during the emergency" tag="synthetic">
            <CityMap density={chain.eff} status={closedStatus} pathEdges={path} start={start} goal={goal} labels edgeLabels={false} />
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn" onClick={run} disabled={running}><Icon name="play" size={18} />{stage ? 'Run again' : 'Run the chain'}</button>
              <button className="btn ghost" onClick={() => setStage((s) => Math.min(STEPS.length, s + 1))} disabled={running || stage >= STEPS.length}><Icon name="step" size={18} />Next link</button>
              <button className="btn ghost" onClick={() => { setStage(0); setRunning(false) }}><Icon name="reset" size={18} />Reset</button>
              <span className="note num">{stage} of {STEPS.length}</span>
            </div>
          </Panel>

          <div className="chain">
            <div className={cls(1)}>
              <div className="link-n">1</div>
              <div className="link-b">
                <h3>{STEPS[0]} · neuro-fuzzy</h3>
                {stage >= 1 && <p className="res">{weather.temp}°C and {weather.hum}% humidity → congestion index <b>{Math.round(chain.f.value)}</b> ({conditionOf(chain.f.value)}). Road densities scale by ×{chain.factor.toFixed(2)}.</p>}
              </div>
            </div>
            <div className="link-gap"><i /></div>
            <div className={cls(2)}>
              <div className="link-n">2</div>
              <div className="link-b">
                <h3>{STEPS[1]} · Prolog</h3>
                {stage >= 2 && (
                  <p className="res">
                    {chain.signals.slice(0, 3).map((s) => (
                      <span key={s.key} style={{ marginRight: 14, whiteSpace: 'nowrap' }}>{s.label} <Pill level={s.r.level} /> <b>{s.r.seconds}s</b></span>
                    ))}
                  </p>
                )}
              </div>
            </div>
            <div className="link-gap"><i /></div>
            <div className={cls(3)}>
              <div className="link-n">3</div>
              <div className="link-b">
                <h3>{STEPS[2]} · A*</h3>
                {stage >= 3 && <p className="res">{NODE_BY_ID[start].name} → {NODE_BY_ID[goal].name}: <b>{toMinutes(chain.route1.cost)} min</b> via {chain.route1.path.map((id) => NODE_BY_ID[id].short).join(' → ')}.</p>}
              </div>
            </div>
            <div className="link-gap"><i /></div>
            <div className={cls(4)}>
              <div className="link-n">4</div>
              <div className="link-b">
                <h3>{STEPS[3]} · A* again</h3>
                {stage >= 4 && chain.accidentEdge && (
                  <p className="res">
                    Accident closes {roadName(chain.accidentEdge)}. {chain.route2.found
                      ? <>New route: <b>{toMinutes(chain.route2.cost)} min</b> (+{toMinutes(chain.route2.cost - chain.route1.cost)}) via {chain.route2.path.map((id) => NODE_BY_ID[id].short).join(' → ')}.</>
                      : 'No route remains.'}
                  </p>
                )}
              </div>
            </div>
            <div className="link-gap"><i /></div>
            <div className={cls(5)}>
              <div className="link-n">5</div>
              <div className="link-b">
                <h3>{STEPS[4]} · fuzzy controller</h3>
                {stage >= 5 && chain.fz && <p className="res">Busiest junction on the route ({roadName(chain.hot)}, {chain.eff[chain.hot]} veh/min, waiting 70 s) gets <b>{Math.round(chain.fz.crisp)} s</b> of green for the ambulance's approach.</p>}
              </div>
            </div>
            <div className="link-gap"><i /></div>
            <div className={cls(6)}>
              <div className="link-n">6</div>
              <div className="link-b">
                <h3>{STEPS[5]} · trigram SLM</h3>
                {stage >= 6 && <p className="res">“{chain.al.text}”</p>}
              </div>
            </div>
            <div className="link-gap"><i /></div>
            <div className={cls(7)}>
              <div className="link-n">7</div>
              <div className="link-b">
                <h3>{STEPS[6]} · Minimax</h3>
                {stage >= 7 && (
                  <p className="res">
                    The attacker goes for <b>{chain.atk.text.replace('Attack ', '')}</b> first. The defender's best answer is <b>{chain.an.best.text}</b> (value {chain.an.best.value.toFixed(1)}), searched with {chain.an.stats.nodes} states instead of {chain.an.fullNodes}.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="stack" style={{ position: 'sticky', top: 104 }}>
          <Panel title="Storm settings" tag="forecast inputs">
            <Slider label="Temperature" value={weather.temp} min={5} max={45} unit=" °C" onChange={(v) => setWeather({ ...weather, temp: v })} />
            <Slider label="Humidity" value={weather.hum} min={20} max={100} unit=" %" onChange={(v) => setWeather({ ...weather, hum: v })} />
            <p className="note">Higher humidity and heat push the forecast up, so every road gets busier and the route changes.</p>
          </Panel>
          <Howto title="Why a chain?">
            <p>Each gate is a separate technique, but a real traffic system needs them together: <strong>learning</strong> predicts load, <strong>rules and fuzzy logic</strong> set the signals, <strong>search</strong> plans routes, <strong>language models</strong> tell people, and <strong>game search</strong> protects the system behind it.</p>
            <p>Running the chain also writes the accident and the alert to the shared city, so the other gates show them. Use “Reset the city” on the concourse to clear it.</p>
          </Howto>
        </div>
      </div>
    </div>
  )
}
