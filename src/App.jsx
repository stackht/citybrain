import { Fragment, useEffect, useState } from 'react'
import { CityProvider, PageSnapshot } from './state.jsx'
import { APP_NAME } from './config.js'
import { FEATURES, featureOf } from './modules.js'
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
import About from './pages/About.jsx'
import Dashboard from './dashboard/Dashboard.jsx'

const MODULES = [...FEATURES].sort((a, b) => a.ps[0] - b.ps[0])

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
  about: About,
}

const fromHash = () => {
  const h = window.location.hash.replace('#/', '').replace('#', '')
  return h in PAGES || h === 'intro' ? h : 'home'
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
    const name = featureOf(page)?.label ?? { scenario: 'Emergency drill', about: 'About', intro: 'Project intro', home: 'Command centre' }[page]
    document.title = name && page !== 'home' ? `${name} · ${APP_NAME}` : `${APP_NAME}: command centre`
  }, [page])

  const Page = PAGES[page]
  const hasHowto = page !== 'home' && page !== 'about' && page !== 'intro'

  return (
    <CityProvider>
      <nav className="rail" aria-label="Control centre">
        <button className="rail-brand" onClick={() => go('home')} aria-label={`${APP_NAME}: command centre`} aria-current={page === 'home' ? 'page' : undefined}>
          <Icon name="city" size={22} />
          <span className="rail-title"><b>{APP_NAME}</b><small>Command centre</small></span>
          <span className="tip">Command centre</span>
        </button>
        <div className="rail-section">AI modules</div>
        <div className="rail-route">
          {MODULES.map((f) => (
            <button key={f.id} className="rail-btn" onClick={() => go(f.id)} aria-current={page === f.id ? 'page' : undefined} aria-label={f.label}>
              <Icon name={f.icon} size={20} />
              <span className="rail-label">{f.label}<small>PS {f.ps.join('·')}</small></span>
              <span className="tip">{f.label}</span>
            </button>
          ))}
          <button className="rail-btn" onClick={() => go('scenario')} aria-current={page === 'scenario' ? 'page' : undefined} aria-label="Emergency drill">
            <Icon name="alert" size={20} />
            <span className="rail-label">Emergency drill<small>all modules</small></span>
            <span className="tip">Emergency drill</span>
          </button>
        </div>
        <div className="rail-foot">
          <button className="rail-btn" onClick={() => go('intro')} aria-current={page === 'intro' ? 'page' : undefined} aria-label="Project intro">
            <Icon name="route" size={20} />
            <span className="rail-label">Project intro</span>
            <span className="tip">Project intro</span>
          </button>
          <button className="rail-btn about" onClick={() => go('about')} aria-current={page === 'about' ? 'page' : undefined} aria-label="About this project">
            <Icon name="info" size={20} />
            <span className="rail-label">About</span>
            <span className="tip">About</span>
          </button>
        </div>
      </nav>

      <main key={page}>
        {page === 'home' ? <Dashboard /> : page === 'intro' ? <PageSnapshot><Concourse go={go} /></PageSnapshot> : page === 'about' ? <About /> : <PageSnapshot><Page /></PageSnapshot>}
      </main>

      {hasHowto && (
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
