import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from 'react'
import { engine } from './sim/engine.js'
import { HOSPITAL, DEFAULT_EMERGENCY } from './lib/city.js'
import { fmtClock } from './sim/format.js'

const Ctx = createContext(null)
const SnapCtx = createContext(null)

// Subscribe a component to every simulation update (used by the live dashboard).
export function useSim() {
  useSyncExternalStore(engine.subscribe, engine.getVersion)
  return engine
}

// Only changes when roads are closed/reopened or the weather inputs change.
const staticKey = () => JSON.stringify([engine.blocked, engine.weather])

// Shared city facade used by the experiment pages. Road density and closures come from the
// simulation. Experiment pages see density frozen at the moment they were opened (so their
// animations stay stable) unless the user refreshes; closures are always live.
export function CityProvider({ children }) {
  const [whatIf, setWhatIf] = useState({})
  const [start, setStart] = useState(HOSPITAL)
  const [goal, setGoalState] = useState(DEFAULT_EMERGENCY)
  const [alert, setAlert] = useState('')

  const setGoal = useCallback((g) => {
    setGoalState(g)
    engine.setAmbulanceGoal(g)
  }, [])
  const setEdgeDensity = useCallback((id, v) => setWhatIf((w) => ({ ...w, [id]: v })), [])
  const clearWhatIf = useCallback(() => setWhatIf({}), [])
  const resetCity = useCallback(() => {
    setWhatIf({})
    setStart(HOSPITAL)
    setGoalState(DEFAULT_EMERGENCY)
    setAlert('')
    engine.reset()
  }, [])

  const value = useMemo(
    () => ({ whatIf, setEdgeDensity, clearWhatIf, start, setStart, goal, setGoal, alert, setAlert, resetCity }),
    [whatIf, setEdgeDensity, clearWhatIf, start, goal, setGoal, alert, resetCity]
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCity() {
  const base = useContext(Ctx)
  const snap = useContext(SnapCtx)
  const key = useSyncExternalStore(engine.subscribe, snap ? staticKey : engine.getVersion)
  const liveV = snap ? 0 : key

  const density = useMemo(() => ({ ...(snap ? snap.density : engine.density), ...base.whatIf }), [snap, base.whatIf, liveV]) // eslint-disable-line react-hooks/exhaustive-deps
  const status = useMemo(() => ({ ...engine.blocked }), [snap ? key : engine.version]) // eslint-disable-line react-hooks/exhaustive-deps
  const weather = useMemo(() => ({ ...engine.weather }), [snap ? key : engine.version]) // eslint-disable-line react-hooks/exhaustive-deps

  const setStatus = useCallback((m) => engine.setBlockedMap(m), [])
  const setEdgeStatus = useCallback((id, v) => engine.setBlocked(id, v), [])
  const cycleStatus = useCallback((id) => {
    const cur = engine.blocked[id]
    engine.setBlocked(id, !cur ? 'blocked' : cur === 'blocked' ? 'construction' : null)
  }, [])
  const setWeather = useCallback((w) => engine.setWeather(w), [])

  return { ...base, density, status, weather, setStatus, setEdgeStatus, cycleStatus, setWeather, simTime: snap ? snap.time : engine.time }
}

// Wraps an experiment page: freezes the density it reads and offers a refresh.
export function PageSnapshot({ children }) {
  const take = () => ({ density: { ...engine.density }, time: engine.time })
  const [snap, setSnap] = useState(take)
  return (
    <SnapCtx.Provider value={snap}>
      <div className="snapbar">
        <span>Showing the city as of simulation time <b className="num">{fmtClock(snap.time)}</b>. Density is frozen while you work here; road closures are live.</span>
        <button className="btn ghost sm" onClick={() => setSnap(take())}>Update from live simulation</button>
      </div>
      {children}
    </SnapCtx.Provider>
  )
}
