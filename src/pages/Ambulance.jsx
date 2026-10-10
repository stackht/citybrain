import { useEffect, useMemo, useState } from 'react'
import { useCity } from '../state.jsx'
import { NODES, NODE_BY_ID, EDGES, heuristic, toMinutes, roadName } from '../lib/city.js'
import { search } from '../lib/search.js'
import { makeRng } from '../lib/rng.js'
import CityMap from '../components/CityMap.jsx'
import Icon from '../components/Icon.jsx'
import usePlayer from '../components/usePlayer.js'
import { GateHead, Panel, Howto, nodeSelect } from '../components/Ui.jsx'

export default function Ambulance() {
  const { density, status, setStatus, setEdgeStatus, cycleStatus, start, setStart, goal, setGoal } = useCity()

  const r = useMemo(() => search('astar', start, goal, density, status), [start, goal, density, status])
  const clear = useMemo(() => search('astar', start, goal, density, {}), [start, goal, density])
  const player = usePlayer(r.steps.length - 1, 380)
  useEffect(() => { player.finish() }, [r]) // eslint-disable-line react-hooks/exhaustive-deps

  const step = r.steps[player.idx] || r.steps[0]
  const done = player.idx >= r.steps.length - 1
  const closed = Object.keys(status).length
  const detour = r.found && clear.found ? r.cost - clear.cost : 0

  const scatter = () => {
    const rng = makeRng(Date.now() % 1000)
    const next = {}
    const pool = EDGES.filter((e) => !e.id.includes(start) && !e.id.includes(goal))
    for (let i = 0; i < 5; i++) {
      const e = pool[Math.floor(rng() * pool.length)]
      next[e.id] = rng() > 0.5 ? 'blocked' : 'construction'
    }
    setStatus(next)
  }

  const open = step.frontier
    .map((id) => ({ id, g: step.g[id], h: heuristic(id, goal) }))
    .sort((a, b) => a.g + a.h - (b.g + b.h))
    .slice(0, 6)

  return (
    <div className="page">
      <GateHead gate="4" icon="ambulance" title="Ambulance route with A*">
        Hospital to emergency scene, avoiding blocked roads and construction zones. Click any road to close it and the route recomputes.
      </GateHead>

      <div className="layout">
        <div className="stack">
          <Panel title="Obstacle map" tag="click a road to cycle open → blocked → construction">
            <div className="row" style={{ marginBottom: 14 }}>
              <div style={{ minWidth: 200, flex: 1 }}>{nodeSelect(NODES, start, setStart, 'Hospital')}</div>
              <div style={{ minWidth: 200, flex: 1 }}>{nodeSelect(NODES, goal, setGoal, 'Emergency location')}</div>
            </div>
            <CityMap
              density={density}
              status={status}
              explored={step.explored}
              frontier={step.frontier}
              current={step.current}
              pathEdges={done && r.found ? r.pathEdges : []}
              start={start}
              goal={goal}
              onEdge={cycleStatus}
              onNode={(id) => setGoal(id)}
            />
            <div className="row" style={{ marginTop: 14 }}>
              {player.playing ? (
                <button className="btn" onClick={player.pause}><Icon name="pause" size={18} />Pause</button>
              ) : (
                <button className="btn" onClick={() => { player.reset(); setTimeout(player.play, 30) }}><Icon name="play" size={18} />Replay search</button>
              )}
              <button className="btn ghost" onClick={player.step} disabled={done}><Icon name="step" size={18} />Step</button>
              <button className="btn ghost" onClick={scatter}>Random obstacles</button>
              <button className="btn ghost" onClick={() => setStatus({})} disabled={!closed}>Clear all</button>
            </div>
          </Panel>

          <Panel title="Open list at this step" tag={`expansion ${player.idx + 1} / ${r.steps.length}`}>
            {open.length ? (
              <table>
                <thead><tr><th>Junction</th><th className="r">g(n) cost so far</th><th className="r">h(n) straight line</th><th className="r">f = g + h</th></tr></thead>
                <tbody>
                  {open.map((o, i) => (
                    <tr key={o.id} className={i === 0 ? 'sel' : ''}>
                      <td>{NODE_BY_ID[o.id].name}</td>
                      <td className="r num">{toMinutes(o.g)}</td>
                      <td className="r num">{toMinutes(o.h)}</td>
                      <td className="r num"><b>{toMinutes(o.g + o.h)}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty">{done ? 'Search finished.' : 'Frontier is empty.'}</div>
            )}
            <p className="note" style={{ marginTop: 8 }}>The top row has the lowest f and is expanded next. Costs are minutes.</p>
          </Panel>
        </div>

        <div className="stack">
          <Panel title="Dispatch" tag="A*">
            {r.found ? (
              <>
                <div className="metrics" style={{ marginBottom: 14 }}>
                  <div className="metric"><b>{toMinutes(r.cost)}</b><span>minutes</span></div>
                  <div className="metric"><b>{r.pathEdges.length}</b><span>segments</span></div>
                  <div className="metric"><b>{r.expanded}</b><span>expanded</span></div>
                </div>
                <p style={{ fontWeight: 700, marginBottom: 6 }}>{r.path.map((id) => NODE_BY_ID[id].short).join(' → ')}</p>
                <p className="note">
                  {closed === 0
                    ? 'No closures. This is the fastest route through current traffic.'
                    : detour > 0.5
                      ? `Closures add ${toMinutes(detour)} min compared with the open map.`
                      : 'Closures do not affect the best route.'}
                </p>
              </>
            ) : (
              <div className="empty"><Icon name="alert" /> <br />Every route is closed. Reopen a road.</div>
            )}
          </Panel>

          <Panel title="Closed roads" tag={`${closed}`}>
            {closed ? (
              <table>
                <tbody>
                  {Object.entries(status).map(([id, s]) => (
                    <tr key={id}>
                      <td>{roadName(id)}</td>
                      <td><span className={'pill ' + (s === 'blocked' ? 'high' : 'medium')}>{s}</span></td>
                      <td className="r"><button className="btn ghost sm" onClick={() => setEdgeStatus(id, null)}>Reopen</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="note">All roads are open.</p>
            )}
          </Panel>

          <Howto>
            <p>A* ranks every open junction by <strong>f(n) = g(n) + h(n)</strong>. g is the real cost so far (distance stretched by traffic); h is the straight-line distance still to go.</p>
            <p>Straight-line distance never exceeds the real driving cost, so h is <strong>admissible</strong> and A* returns the optimal route while opening fewer junctions than uniform-cost search.</p>
            <p>Blocked and construction roads are removed from the action list entirely, so the ambulance never considers them.</p>
          </Howto>
        </div>
      </div>
    </div>
  )
}
