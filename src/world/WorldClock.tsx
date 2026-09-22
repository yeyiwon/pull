import type { RefObject } from 'react'
import type { Player } from './locomotion.ts'
import { homeWorldPoint, DOOR } from './homeSpace.ts'
import { surfaceHeight, streamCenter, BRIDGE } from './terrain.ts'
import { useEffect, useState } from 'react'
import { SEASONS } from './realWorld.ts'
import type { Season } from './realWorld.ts'
import { livingWorld, SKY_EVENTS } from './livingWorld.ts'
import type { FantasyEvent, GrowthStage } from './livingWorld.ts'
import type { WeatherContext } from './realWorld.ts'
import { CLOCK_DISPLAY, refreshWorldTime, worldTime } from './worldTime.ts'
function visitPreview(player:Player,location:string) {
      const point=location==='door'?homeWorldPoint(DOOR.x,6):location==='inside'?homeWorldPoint(1,0):location==='stream'?{x:streamCenter(3),z:3}:location==='bridge'?{x:streamCenter(BRIDGE.z),z:BRIDGE.z}:{x:0,z:1}
      const p=player;p.keys.clear();p.touchX=0;p.touchZ=0;p.jumpRequested=false;p.verticalVelocity=0;p.isGrounded=true;p.groundY=surfaceHeight(point.x,point.z);p.position.set(point.x,p.groundY,point.z)
}
function label() {
  const { hour, phase } = worldTime.current
  const date = worldTime.realWorld.date.toLocaleDateString('en-US', { month: CLOCK_DISPLAY.dateFormat, day: 'numeric' })
  return `${date.toUpperCase()} · ${worldTime.realWorld.season.toUpperCase()}\n${String(CLOCK_DISPLAY.hour12 ? Math.floor(hour) % 12 || 12 : Math.floor(hour)).padStart(2, '0')}:${String(Math.floor(hour * 60) % 60).padStart(2, '0')}${CLOCK_DISPLAY.hour12 ? (hour < 12 ? ' AM' : ' PM') : ''} · ${phase}`
}
export default function WorldClock({ player }: { player: RefObject<Player> }) {
  const [text, setText] = useState(label)
  useEffect(() => {
    const tick = () => { refreshWorldTime(); setText(label()) }
    tick(); const id = window.setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  if (!CLOCK_DISPLAY.visible) return null
  return <aside className="world-clock"><time>{text}</time>
    {import.meta.env.DEV && <details className="world-preview"><summary>World preview</summary><select aria-label="Time preview" defaultValue="REAL" onChange={e => {
      worldTime.override = e.target.value === 'REAL' ? null : Number(e.target.value)
      refreshWorldTime(); setText(label())
    }}>
      <option value="REAL">Real time</option>
      {[['Dawn', 6], ['Morning', 8], ['Day', 13], ['Sunset', 18], ['Evening', 20], ['Night', 0]].map(([name, hour]) => <option key={name} value={hour}>{name}</option>)}
    </select>
    <select aria-label="Season preview" defaultValue="REAL" onChange={e => {
      worldTime.seasonOverride = e.target.value === 'REAL' ? null : { season: e.target.value as Season, progress: .65 }
      refreshWorldTime(); setText(label())
    }}><option value="REAL">Real season</option>{SEASONS.map(s => <option key={s} value={s}>{s}</option>)}</select>
    <label>Season progress<input aria-label="Season progress" type="range" min="0" max="1" step=".01" defaultValue=".65" onChange={e => {
      worldTime.seasonOverride = { season: worldTime.realWorld.season, progress: Number(e.target.value) }; refreshWorldTime(); setText(label())
    }} /></label>
    <select aria-label="Sky event preview" defaultValue="auto" onChange={e => {
      livingWorld.eventOverride = e.target.value === 'auto' ? null : e.target.value as 'none' | FantasyEvent
    }}><option value="auto">Rare events: auto</option><option value="none">None</option>{SKY_EVENTS.map(event=><option key={event} value={event}>{event}</option>)}</select>
    <select aria-label="Weather preview" defaultValue="auto" onChange={e=>{livingWorld.weather=e.target.value==='auto'?null:{type:e.target.value as WeatherContext['type']}}}>
      <option value="auto">Weather: none</option>{['clear','cloudy','rain','snow','fog','storm'].map(w=><option key={w}>{w}</option>)}
    </select>
    <select aria-label="Snowfall preview" defaultValue="light" onChange={e=>{livingWorld.snowMode=e.target.value as typeof livingWorld.snowMode}}>{['light','normal','heavy','magical'].map(s=><option key={s}>{s}</option>)}</select>
    <label>Wind<input aria-label="Wind preview" type="range" min="0" max="1" step=".05" defaultValue=".2" onChange={e=>{livingWorld.windOverride=Number(e.target.value)}}/></label>
    <select aria-label="Growth preview" defaultValue="auto" onChange={e=>{livingWorld.growthOverride=e.target.value==='auto'?null:e.target.value as GrowthStage}}><option value="auto">Growth: memory</option>{['seed','home','garden','habitat','realm','dreamscape'].map(s=><option key={s}>{s}</option>)}</select>
    <select aria-label="Visit preview" defaultValue="spawn" onChange={e=>{
      visitPreview(player.current,e.target.value)
    }}><option value="spawn">Visit: start</option><option value="door">Home entrance</option><option value="inside">Inside home</option><option value="stream">Shallow water</option><option value="bridge">Bridge</option></select>
    </details>}
  </aside>
}
