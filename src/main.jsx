import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import '@fontsource/cormorant-garamond/400-italic.css'
import '@fontsource/cormorant-garamond/500-italic.css'
import '@fontsource/cormorant-garamond/600-italic.css'
import './styles.css'
import './cinema.css'
import './layout.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
