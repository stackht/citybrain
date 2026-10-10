import { useEffect, useMemo } from 'react'
import { useCity } from '../state.jsx'
import { NODES, NODE_BY_ID, EDGE_BY_ID, EDGES, toMinutes } from '../lib/city.js'
import { ALGOS, search } from '../lib/search.js'
import CityMap from '../components/CityMap.jsx'
import Icon from '../components/Icon.jsx'
import usePlayer from '../components/usePlayer.js'
import { GateHead, Panel, Howto, Seg, nodeSelect } from '../components/Ui.jsx'
import { useState } from 'react'

export default function RouteSearch() {
  const { density, start, setStart, goal, setGoal } = useCity()
  const [algo, setAlgo] = useState('ucs')

  const results = useMemo(() => Object.fromEntries(Object.keys(ALGOS).map((a) => [a, search(a, start, goal, density, {})])), [start, goal, density])
  const r = results[algo]
  const player = usePlayer(r.steps.length - 1)
  useEffect(() => player.finish(), [algo, start, goal, density]) // eslint-disable-line react-hooks/exhaustive-deps

  const step = r.steps[player.idx] || r.steps[0]
  const done = player.idx >= r.steps.length - 1
  const optimal = Math.min(...Object.values(results).map((x) => x.cost))

  return (
    <div className="page">
      <GateHead gate="1" icon="route" title="Route search: states, actions, path costs">
        Autonomous vehicle navigation as an AI search problem. Pick where the car starts and where it must go, then watch four search strategies explore the city.
      </GateHead>

      <div className="layout">
        <div className="stack">
          <Panel title="City state space" tag="synthetic city">
            <div className="row" style={{ marginBottom: 14 }}>
              <div style={{ minWidth: 200, flex: 1 }}>{nodeSelect(NODES, start, setStart, 'Initial state (start)')}</div>
              <div style={{ minWidth: 200, flex: 1 }}>{nodeSelect(NODES, goal, setGoal, 'Goal state (destination)')}</div>
            </div>
            <CityMap
              density={density}
              explored={step.explored}
              frontier={step.frontier}
              current={step.current}
              pathEdges={done && r.found ? r.pathEdges : []}
              start={start}
              goal={goal}
              nodeNote={Object.fromEntries(Object.entries(step.g).filter(([id]) => step.frontier.includes(id) || id === step.current).map(([id, v]) => [id, toMinutes(v)]))}
              onNode={(id) => setGoal(id)}
            />
            <div className="legend" style={{ marginTop: 12 }}>
              <span><i style={{ background: '#101010', boxShadow: 'inset 0 0 0 3px #5ab2ff' }} />explored</span>
              <span><i style={{ background: 'transparent', boxShadow: 'inset 0 0 0 2px #e8c46a' }} />on the frontier</span>
              <span><i style={{ background: '#e8c46a' }} />chosen path</span>
              <span><i style={{ background: '#35c98b' }} />low</span>
              <span><i style={{ background: '#ff9a2e' }} />medium</span>
              <span><i style={{ background: '#ff5252' }} />high traffic</span>
              <span className="note">Numbers above a junction are g(n) in minutes. Click a junction to set the goal.</span>
            </div>
          </Panel>

          <Panel title="Strategy">
            <div className="row" style={{ marginBottom: 12 }}>
              <Seg label="Search algorithm" value={algo} onChange={setAlgo} options={Object.entries(ALGOS).map(([value, a]) => ({ value, label: a.label }))} />
            </div>
            <p className="note" style={{ marginBottom: 14 }}>{ALGOS[algo].blurb}</p>
            <div className="row">
              {player.playing ? (
                <button className="btn" onClick={player.pause}><Icon name="pause" size={18} />Pause</button>
              ) : (
                <button className="btn" onClick={player.play}><Icon name="play" size={18} />Play</button>
              )}
              <button className="btn ghost" onClick={player.step} disabled={done}><Icon name="step" size={18} />Step</button>
              <button className="btn ghost" onClick={player.finish}>Skip to end</button>
              <button className="btn ghost" onClick={player.reset}><Icon name="reset" size={18} />Reset</button>
              <span className="note num">Expansion {player.idx + 1} of {r.steps.length}</span>
            </div>
          </Panel>
        </div>

        <div className="stack">
          <Panel title="Problem definition">
            <table>
              <tbody>
                <tr><th scope="row">States</th><td>16 junctions</td></tr>
                <tr><th scope="row">Initial</th><td>{NODE_BY_ID[start].name}</td></tr>
                <tr><th scope="row">Goal</th><td>{NODE_BY_ID[goal].name}</td></tr>
                <tr><th scope="row">Actions</th><td>Drive along any of the {EDGES.length} roads</td></tr>
                <tr><th scope="row">Step cost</th><td>length × (1 + density / 50)</td></tr>
              </tbody>
            </table>
          </Panel>

          <Panel title="Result" tag={ALGOS[algo].label}>
            {r.found ? (
              <>
                <div className="metrics" style={{ marginBottom: 12 }}>
                  <div className="metric"><b>{toMinutes(r.cost)}</b><span>minutes</span></div>
                  <div className="metric"><b>{r.pathEdges.length}</b><span>road segments</span></div>
                  <div className="metric"><b>{r.expanded}</b><span>nodes expanded</span></div>
                </div>
                <p className="note">{r.path.map((id) => NODE_BY_ID[id].name).join(' → ')}</p>
              </>
            ) : (
              <div className="empty">No route between these junctions.</div>
            )}
          </Panel>

          <Panel title="All four, same trip">
            <table>
              <thead><tr><th>Algorithm</th><th className="r">Minutes</th><th className="r">Expanded</th></tr></thead>
              <tbody>
                {Object.entries(results).map(([k, x]) => (
                  <tr key={k} className={k === algo ? 'sel' : ''}>
                    <td>{ALGOS[k].label}{Math.abs(x.cost - optimal) < 0.01 && x.found ? ' ✓' : ''}</td>
                    <td className="r num">{x.found ? toMinutes(x.cost) : '-'}</td>
                    <td className="r num">{x.expanded}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="note" style={{ marginTop: 8 }}>✓ marks an optimal cost. Greedy often expands the fewest nodes but can miss the cheapest road.</p>
          </Panel>

          <Howto>
            <p>An AI search problem has <strong>states</strong> (where the car can be), <strong>actions</strong> (roads it can take) and a <strong>path cost</strong> (here: travel time, stretched by traffic density).</p>
            <p>The <strong>frontier</strong> holds junctions waiting to be explored. Each strategy only differs in which frontier junction it opens next: oldest (BFS), cheapest so far (UCS), closest to the goal (Greedy), or cheapest guess for the whole trip (A*).</p>
          </Howto>
        </div>
      </div>
    </div>
  )
}
