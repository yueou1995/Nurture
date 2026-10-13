import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/gaegu/latin-400.css'
import '@fontsource/gaegu/latin-700.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
