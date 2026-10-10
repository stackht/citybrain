import { useEffect, useState } from 'react'
import { CityProvider } from './state.jsx'
import { APP_NAME } from './config.js'
import { GATES } from './modules.js'
import Icon from './components/Icon.jsx'
import Concourse from './pages/Concourse.jsx'
import RouteSearch from './pages/RouteSearch.jsx'
import SignalRules from './pages/SignalRules.jsx'
import Ambulance from './pages/Ambulance.jsx'
import Cyber from './pages/Cyber.jsx'
import FuzzySignal from './pages/FuzzySignal.jsx'
import StreetLight from './pages/StreetLight.jsx'
import NeuroFuzzy from './pages/NeuroFuzzy.jsx'
import Learning from './pages/Learning.jsx'
import Language from './pages/Language.jsx'
import Scenario from './pages/Scenario.jsx'

const PAGES = {
  route: RouteSearch,
  rules: SignalRules,
  ambulance: Ambulance,
  cyber: Cyber,
  fuzzysignal: FuzzySignal,
  streetlight: StreetLight,
  neurofuzzy: NeuroFuzzy,
  learning: Learning,
  language: Language,
  scenario: Scenario,
}

const fromHash = () => {
  const h = window.location.hash.replace('#/', '').replace('#', '')
  return h in PAGES ? h : 'home'
}

export default function App() {
  const [page, setPage] = useState(fromHash)
  const [howto, setHowto] = useState(false)

  useEffect(() => {
    const on = () => {
      setPage(fromHash())
      setHowto(false)
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  // "How it works" lives in a side drawer; Esc closes it.
  useEffect(() => {
    document.body.classList.toggle('howto-open', howto)
    if (!howto) return undefined
    const k = (e) => e.key === 'Escape' && setHowto(false)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [howto])

  const go = (id) => {
    window.location.hash = id === 'home' ? '#/' : `#/${id}`
  }

  useEffect(() => {
    document.title = page === 'home' ? APP_NAME : `${GATES.find((g) => g.id === page)?.label ?? 'Emergency'} · ${APP_NAME}`
  }, [page])

  const Page = PAGES[page]

  return (
    <CityProvider>
      <nav className="rail" aria-label="Modules">
        <button className="rail-brand" onClick={() => go('home')} aria-label={`${APP_NAME}: concourse`} aria-current={page === 'home' ? 'page' : undefined}>
          <Icon name="city" size={22} />
          <span className="tip">{APP_NAME}</span>
        </button>
        <div className="rail-route">
          {GATES.map((g) => (
            <button key={g.id} className="rail-btn" onClick={() => go(g.id)} aria-current={page === g.id ? 'page' : undefined} aria-label={`Gate ${g.gate}: ${g.label}`}>
              <b className={g.wide ? 'wide' : ''}>{g.gate}</b>
              <span className="tip">{g.label}</span>
            </button>
          ))}
          <button className="rail-btn star" onClick={() => go('scenario')} aria-current={page === 'scenario' ? 'page' : undefined} aria-label="Emergency scenario">
            <b>★</b>
            <span className="tip">Emergency</span>
          </button>
        </div>
      </nav>

      <main key={page}>{Page ? <Page /> : <Concourse go={go} />}</main>

      {page !== 'home' && (
        <>
          <button className="howto-toggle btn" onClick={() => setHowto((h) => !h)} aria-expanded={howto}>
            {howto ? 'Close' : 'How it works'}
          </button>
          <div className="howto-veil" onClick={() => setHowto(false)} />
        </>
      )}
    </CityProvider>
  )
}
