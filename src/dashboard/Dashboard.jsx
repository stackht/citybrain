import { useMemo, useState } from 'react'
import { useSim, useCity } from '../state.jsx'
import { search } from '../lib/search.js'
import { TopBar, Kpis, Controls, Charts, EventFeed } from './parts.jsx'
import SimMap from './SimMap.jsx'
import Decision from './Decision.jsx'

export default function Dashboard() {
  const sim = useSim()
  const { start, goal } = useCity()
  const [tool, setTool] = useState('select')
  const [layers, setLayers] = useState({ density: true, signals: true, routes: true, lights: false, labels: false })
  const [node, setNode] = useState('n5')
  const [edge, setEdge] = useState(null)
  const [from, setFrom] = useState(start)
  const [to, setTo] = useState(goal)
  const [algo, setAlgo] = useState('astar')

  // Route planner (PS 1): recomputed from the shared density and closures about once a second.
  const result = useMemo(() => search(algo, from, to, sim.density, sim.blocked), [algo, from, to, Math.floor(sim.time), Object.keys(sim.blocked).join()]) // eslint-disable-line react-hooks/exhaustive-deps

  const onEdge = (id) => {
    setEdge(id)
    if (tool === 'block') sim.toggleBlock(id)
  }

  return (
    <div className="dash">
      <TopBar sim={sim} />
      <Kpis sim={sim} />
      <div className="dash-main">
        <div className="dash-center">
          <SimMap sim={sim} engine={sim} tool={tool} layers={layers} selectedNode={node} selectedEdge={edge} route={result.found ? result.path : null} onNode={setNode} onEdge={onEdge} />
          <Controls sim={sim} tool={tool} setTool={setTool} layers={layers} setLayers={setLayers} selectedEdge={edge} />
          <Charts sim={sim} />
        </div>
        <div className="dash-right">
          <Decision sim={sim} node={node} setNode={setNode} plan={{ from, to, algo, setFrom, setTo, setAlgo, result }} />
          <EventFeed sim={sim} />
        </div>
      </div>
    </div>
  )
}
