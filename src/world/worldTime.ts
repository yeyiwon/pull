import { createRealWorldContext, phaseAt } from './realWorld.ts'
import type { Season } from './realWorld.ts'
export const TIME_PROFILES = [
  { hour: 0, top: '#02040d', horizon: '#080d1a', light: '#8297c8', fog: '#070c16', intensity: .22, ambient: .16, glow: 3 },
  { hour: 4, top: '#02040d', horizon: '#080d1a', light: '#8297c8', fog: '#070c16', intensity: .22, ambient: .16, glow: 3 },
  { hour: 5, top: '#7864ba', horizon: '#e3a5c1', light: '#f4d0df', fog: '#baafcc', intensity: .85, ambient: 1, glow: 1.5 },
  { hour: 7, top: '#70bddd', horizon: '#ffe3c8', light: '#fff1ce', fog: '#c4dce3', intensity: 1.15, ambient: 1.25, glow: .85 },
  { hour: 11, top: '#3787ce', horizon: '#a8dfed', light: '#fff5df', fog: '#b8dbe8', intensity: 1.45, ambient: 1.35, glow: .65 },
  { hour: 16, top: '#7799b9', horizon: '#f2cf97', light: '#ffe0a6', fog: '#c4beb1', intensity: 1.3, ambient: 1.05, glow: .8 },
  { hour: 17, top: '#596d9b', horizon: '#e2baa0', light: '#ffd3b5', fog: '#acb4c4', intensity: 1.1, ambient: 1.15, glow: 1 },
  { hour: 18, top: '#62698d', horizon: '#e7a582', light: '#ffc48d', fog: '#b5a3ac', intensity: 1.05, ambient: .85, glow: 1.2 },
  { hour: 19, top: '#343d69', horizon: '#bd91a0', light: '#d2b8f5', fog: '#898aa6', intensity: .8, ambient: .95, glow: 1.55 },
  { hour: 20, top: '#152348', horizon: '#687995', light: '#aabfe6', fog: '#34465e', intensity: .65, ambient: .65, glow: 1.7 },
  { hour: 21, top: '#060a1b', horizon: '#11182b', light: '#91a6d4', fog: '#0c1424', intensity: .34, ambient: .25, glow: 2.4 },
  { hour: 24, top: '#02040d', horizon: '#080d1a', light: '#8297c8', fog: '#070c16', intensity: .22, ambient: .16, glow: 3 },
] as const
export function sampleTime(hour: number) {
  const h = ((hour % 24) + 24) % 24
  const index = Math.max(0, TIME_PROFILES.findIndex((p, i) => i < TIME_PROFILES.length - 1 && h >= p.hour && h < TIME_PROFILES[i + 1].hour))
  const from = TIME_PROFILES[index], to = TIME_PROFILES[index + 1]
  const t = (h - from.hour) / (to.hour - from.hour)
  const angle = (h - 6) / 24 * Math.PI * 2
  const sunY = Math.sin(angle)
  const day = Math.max(0, Math.min(1, (sunY + .12) / .24))
  return { hour: h, phase: phaseAt(h), from, to, blend: t * t * (3 - 2 * t), sunX: -Math.cos(angle), sunY, daylight: day }
}
const initialDate = new Date()
export const worldTime = {
  canonical: createRealWorldContext(initialDate),
  presentation: sampleTime(initialDate.getHours()+initialDate.getMinutes()/60),
  current: sampleTime(initialDate.getHours() + initialDate.getMinutes() / 60),
  realWorld: createRealWorldContext(initialDate),
  override: null as number | null,
  seasonOverride: null as { season: Season; progress: number } | null,
}
export function refreshWorldTime(date = new Date()) {
  worldTime.canonical = createRealWorldContext(date)
  worldTime.realWorld = createRealWorldContext(date, worldTime.seasonOverride)
  worldTime.current = sampleTime(worldTime.override ?? date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600)
}

export const CLOCK_DISPLAY = { visible: true, hour12: false, dateFormat: 'short' as 'short' | 'long' }

export { phaseAt, PHASE_STARTS } from './realWorld.ts'
export type { DayPhase } from './realWorld.ts'

// Render time is isolated from wall-clock observation and never persisted as elapsed life.
export function advancePresentation(delta:number) {
  const from=worldTime.presentation.hour,to=worldTime.current.hour
  const shortest=((to-from+36)%24)-12
  worldTime.presentation=sampleTime(from+shortest*(1-Math.exp(-Math.min(Math.max(delta,0),.1)*1.5)))
}
export const DAY_PREVIEWS=[['Morning',8],['Day',13],['Golden Hour',16.5],['Sunset',18],['Blue Hour',20],['Night',0]] as const
