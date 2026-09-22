import { createRealWorldContext, phaseAt } from './realWorld.ts'
import type { Season } from './realWorld.ts'
export const TIME_PROFILES = [
  { hour: 0, top: '#080f2c', horizon: '#222b4e', light: '#b8c9ff', fog: '#172840', intensity: .65, ambient: .55, glow: 1.9 },
  { hour: 4, top: '#080f2c', horizon: '#222b4e', light: '#b8c9ff', fog: '#172840', intensity: .65, ambient: .55, glow: 1.9 },
  { hour: 5, top: '#7864ba', horizon: '#e3a5c1', light: '#f4d0df', fog: '#baafcc', intensity: .85, ambient: 1, glow: 1.5 },
  { hour: 7, top: '#70bddd', horizon: '#ffe3c8', light: '#fff1ce', fog: '#c4dce3', intensity: 1.15, ambient: 1.25, glow: .85 },
  { hour: 11, top: '#3787ce', horizon: '#a8dfed', light: '#fff5df', fog: '#b8dbe8', intensity: 1.45, ambient: 1.35, glow: .65 },
  { hour: 17, top: '#766ac5', horizon: '#efb6c2', light: '#ffd3b5', fog: '#c5b4d4', intensity: 1.1, ambient: 1.15, glow: 1 },
  { hour: 19, top: '#574b9e', horizon: '#df92b3', light: '#d2b8f5', fog: '#a498c4', intensity: .8, ambient: .95, glow: 1.55 },
  { hour: 21, top: '#080f2c', horizon: '#222b4e', light: '#b8c9ff', fog: '#172840', intensity: .65, ambient: .55, glow: 1.9 },
  { hour: 24, top: '#080f2c', horizon: '#222b4e', light: '#b8c9ff', fog: '#172840', intensity: .65, ambient: .55, glow: 1.9 },
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
  current: sampleTime(initialDate.getHours() + initialDate.getMinutes() / 60),
  realWorld: createRealWorldContext(initialDate),
  override: null as number | null,
  seasonOverride: null as { season: Season; progress: number } | null,
}
export function refreshWorldTime(date = new Date()) {
  worldTime.realWorld = createRealWorldContext(date, worldTime.seasonOverride)
  worldTime.current = sampleTime(worldTime.override ?? date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600)
}

export const CLOCK_DISPLAY = { visible: true, hour12: false, dateFormat: 'short' as 'short' | 'long' }

export { phaseAt, PHASE_STARTS } from './realWorld.ts'
export type { DayPhase } from './realWorld.ts'
