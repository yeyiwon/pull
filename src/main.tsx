import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { heroLab } from './environment/heroLab.ts'

// Development retains A/B controls; production uses the approved layout baseline.
if (import.meta.env.DEV) heroLab.select('layout-v3')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
