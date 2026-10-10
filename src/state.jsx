import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { initialDensity, HOSPITAL, DEFAULT_EMERGENCY } from './lib/city.js'

const Ctx = createContext(null)
export const useCity = () => useContext(Ctx)

// Shared city state: every module reads and writes the same roads.
export function CityProvider({ children }) {
  const [density, setDensity] = useState(() => initialDensity())
  const [status, setStatus] = useState({}) // edgeId -> 'blocked' | 'construction'
  const [start, setStart] = useState(HOSPITAL)
  const [goal, setGoal] = useState(DEFAULT_EMERGENCY)
  const [weather, setWeather] = useState({ temp: 29, hum: 55 })
  const [alert, setAlert] = useState('')

  const setEdgeDensity = useCallback((id, v) => setDensity((d) => ({ ...d, [id]: v })), [])
  const cycleStatus = useCallback(
    (id) =>
      setStatus((s) => {
        const n = { ...s }
        const cur = n[id]
        if (!cur) n[id] = 'blocked'
        else if (cur === 'blocked') n[id] = 'construction'
        else delete n[id]
        return n
      }),
    []
  )
  const setEdgeStatus = useCallback(
    (id, v) =>
      setStatus((s) => {
        const n = { ...s }
        if (v) n[id] = v
        else delete n[id]
        return n
      }),
    []
  )
  const resetCity = useCallback(() => {
    setDensity(initialDensity())
    setStatus({})
    setStart(HOSPITAL)
    setGoal(DEFAULT_EMERGENCY)
    setAlert('')
  }, [])

  const value = useMemo(
    () => ({ density, setDensity, setEdgeDensity, status, setStatus, cycleStatus, setEdgeStatus, start, setStart, goal, setGoal, weather, setWeather, alert, setAlert, resetCity }),
    [density, status, start, goal, weather, alert, setEdgeDensity, cycleStatus, setEdgeStatus, resetCity]
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
