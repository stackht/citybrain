import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { engine } from './sim/engine.js'
import '@fontsource/cormorant-garamond/400-italic.css'
import '@fontsource/cormorant-garamond/500-italic.css'
import '@fontsource/cormorant-garamond/600-italic.css'
import './styles.css'
import './cinema.css'
import './layout.css'
import './dashboard.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// Test hook: open the site with ?debug to inspect the simulation from the console.
if (new URLSearchParams(window.location.search).has("debug")) window.__sim = engine
