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
import { weatherPreview } from './weatherPresentation.ts'
import { cinematicHooks } from '../graphics/cinematicHooks.ts'
import { DAY_PREVIEWS, CLOCK_DISPLAY, refreshWorldTime, worldTime } from './worldTime.ts'
function visitPreview(player:Player,location:string) {
      const point=location==='door'?homeWorldPoint(DOOR.x,6):location==='inside'?homeWorldPoint(1,0):location==='stream'?{x:streamCenter(3),z:3}:location==='bridge'?{x:streamCenter(BRIDGE.z),z:BRIDGE.z}:{x:0,z:1}
      const p=player;p.keys.clear();p.touchX=0;p.touchZ=0;p.jumpRequested=false;p.verticalVelocity=0;p.isGrounded=true;p.groundY=surfaceHeight(point.x,point.z);p.position.set(point.x,p.groundY,point.z)
}
const seasonLabels:Record<string,string>={spring:'Spring',summer:'Summer',autumn:'Autumn',winter:'Winter'}
const seasonIcons:Record<string,string>={spring:'🌸',summer:'🌿',autumn:'🍂',winter:'❄️'}
function label() {
  const { hour, phase } = worldTime.current
  const date = worldTime.realWorld.date.toLocaleDateString('en-US', { month: CLOCK_DISPLAY.dateFormat, day: 'numeric' })
  return `${date.toUpperCase()} · ${worldTime.realWorld.season.toUpperCase()}\n${String(CLOCK_DISPLAY.hour12 ? Math.floor(hour) % 12 || 12 : Math.floor(hour)).padStart(2, '0')}:${String(Math.floor(hour * 60) % 60).padStart(2, '0')}${CLOCK_DISPLAY.hour12 ? (hour < 12 ? ' AM' : ' PM') : ''} · ${phase}`
}
export default function WorldClock({ player, mode='status' }: { player: RefObject<Player>; mode?:'status'|'panel'|'debug' }) {
  const [text, setText] = useState(label)
  useEffect(() => {
    const tick = () => { refreshWorldTime(); setText(label()) }
    tick(); const id = window.setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  if (!CLOCK_DISPLAY.visible) return null
  if(mode==='status'){
    const date=worldTime.canonical.date
    const dateLabel=date.toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'})
    const clockLabel=date.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false})
    return <div className="world-status-time"><span className="status-season"><span aria-hidden="true">{seasonIcons[worldTime.canonical.season]}</span> {seasonLabels[worldTime.canonical.season]}</span><time dateTime={date.toISOString()}>{dateLabel} <span className="status-clock"><svg className="clock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={date.getHours()>=6&&date.getHours()<18?'낮':'밤'}>{date.getHours()>=6&&date.getHours()<18?<><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4L19 5"/></>:<path d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z"/>}</svg> {clockLabel}</span></time></div>
  }
  if(mode==='panel')return <section className="world-menu">
    <p className="section-label">시간</p><div className="time-choices">{[['Real Time',null],...DAY_PREVIEWS].map(([name,hour])=><button key={name} aria-pressed={worldTime.override===hour} onClick={()=>{worldTime.override=hour as number|null;refreshWorldTime();setText(label())}}>{name}<span aria-hidden="true">{worldTime.override===hour?'●':'○'}</span></button>)}</div>
    <p className="section-label">계절</p><div className="season-choices">{['REAL TIME',...SEASONS].map(s=><button key={s} data-season={s} aria-pressed={s==='REAL TIME'?worldTime.seasonOverride===null:worldTime.seasonOverride?.season===s} onClick={()=>{worldTime.seasonOverride=s==='REAL TIME'?null:{season:s as Season,progress:.65};refreshWorldTime();setText(label())}}><span aria-hidden="true">{seasonIcons[s]}</span>{s==='REAL TIME'?'Real Season':seasonLabels[s]}</button>)}</div>
    <p className="section-label">날씨</p><div className="weather-choices">{['auto','clear','cloudy','rain','snow','fog'].map(w=><button key={w} aria-pressed={w==='auto'?weatherPreview.type===null:weatherPreview.type===w} onClick={()=>{weatherPreview.type=w==='auto'?null:w as WeatherContext['type'];setText(label()+w)}}>{{auto:'자연스럽게',clear:'맑음',cloudy:'흐림',rain:'비',snow:'눈',fog:'안개'}[w]}</button>)}</div>
    {weatherPreview.type==='snow'&&<><p className="section-label">눈의 양</p><div className="weather-choices">{(['light','normal','heavy'] as const).map(mode=><button key={mode} aria-pressed={livingWorld.snowMode===mode} onClick={()=>{livingWorld.snowMode=mode;setText(label()+mode)}}>{{light:'살짝',normal:'보통',heavy:'함박눈'}[mode]}</button>)}</div></>}
    <p className="section-label">밤하늘</p><div className="weather-choices">{([['자연스럽게',null],['별똥별','shootingStar'],['유성우','meteorShower']] as const).map(([title,event])=><button key={title} aria-pressed={livingWorld.eventOverride===event} onClick={()=>{livingWorld.eventOverride=event;setText(label()+title)}}>{title}</button>)}</div><p className="sheet-intro">밤에 하늘을 올려다보세요.</p>
    <p className="section-label">바람</p><div className="weather-choices wind-choices">{([['자동',null],['약하게',.1],['보통',.3],['강하게',.6]] as const).map(([title,value])=><button key={title} aria-pressed={livingWorld.windOverride===value} onClick={()=>{livingWorld.windOverride=value;setText(label()+title)}}>{title}</button>)}</div>
    <p className="sheet-intro">잠깐 다른 빛으로 바라보기.<br/>현재 시간 · 현재 계절을 선택하면 원래대로 돌아와요.</p>
  </section>
  return <aside className="world-clock"><time>{text}</time>
    {import.meta.env.DEV && <details className="world-preview"><summary>World preview</summary><select aria-label="Time preview" value={worldTime.override??'REAL'} onChange={e => {
      worldTime.override = e.target.value === 'REAL' ? null : Number(e.target.value)
      refreshWorldTime(); setText(label())
    }}>
      <option value="REAL">Real time</option>
      {DAY_PREVIEWS.map(([name, hour]) => <option key={name} value={hour}>{name}</option>)}
    </select>
    <label><input type="checkbox" aria-label="Arc Night Reveal" checked={cinematicHooks.arcAwakening>0} onChange={e=>{cinematicHooks.arcAwakening=e.target.checked?1:0;setText(label()+String(e.target.checked))}}/>Arc Night Reveal · Night only</label>
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
    <select aria-label="Weather preview" value={weatherPreview.type??'auto'} onChange={e=>{weatherPreview.type=e.target.value==='auto'?null:e.target.value as WeatherContext['type'];setText(label()+e.target.value)}}>
      <option value="auto">Weather: none</option>{['clear','partlyCloudy','cloudy','rain','snow','fog','storm'].map(w=><option key={w}>{w}</option>)}
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
