import { useEffect, useState } from 'react'
import { refreshWorldTime, worldTime } from './worldTime.ts'
function label() {
  const { hour, phase } = worldTime.current
  return `${String(Math.floor(hour)).padStart(2, '0')}:${String(Math.floor(hour * 60) % 60).padStart(2, '0')} · ${phase}`
}
export default function WorldClock() {
  const [text, setText] = useState(label)
  useEffect(() => {
    const tick = () => { refreshWorldTime(); setText(label()) }
    tick(); const id = window.setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return <aside className="world-clock"><time>{text}</time>
    {import.meta.env.DEV && <select aria-label="Time preview" defaultValue="REAL" onChange={e => {
      worldTime.override = e.target.value === 'REAL' ? null : Number(e.target.value)
      refreshWorldTime(); setText(label())
    }}>
      <option value="REAL">Real time</option>
      {[['Dawn', 6], ['Morning', 8], ['Day', 13], ['Sunset', 18], ['Evening', 20], ['Night', 0]].map(([name, hour]) => <option key={name} value={hour}>{name}</option>)}
    </select>}
  </aside>
}
