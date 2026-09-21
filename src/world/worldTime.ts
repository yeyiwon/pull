export type DayPhase = 'DAWN' | 'MORNING' | 'DAY' | 'SUNSET' | 'EVENING' | 'NIGHT'
export const TIME_PROFILES = [
  { hour: 0, top: '#263c87', horizon: '#9280c7', light: '#b8c9ff', fog: '#797eae', intensity: .8, ambient: .85, glow: 1.9 },
  { hour: 5, top: '#7864ba', horizon: '#e3a5c1', light: '#f4d0df', fog: '#baafcc', intensity: .85, ambient: 1, glow: 1.5 },
  { hour: 7, top: '#70bddd', horizon: '#ffe3c8', light: '#fff1ce', fog: '#c4dce3', intensity: 1.15, ambient: 1.25, glow: .85 },
  { hour: 10, top: '#3787ce', horizon: '#a8dfed', light: '#fff5df', fog: '#b8dbe8', intensity: 1.45, ambient: 1.35, glow: .65 },
  { hour: 17, top: '#766ac5', horizon: '#efb6c2', light: '#ffd3b5', fog: '#c5b4d4', intensity: 1.1, ambient: 1.15, glow: 1 },
  { hour: 19, top: '#574b9e', horizon: '#df92b3', light: '#d2b8f5', fog: '#a498c4', intensity: .8, ambient: .95, glow: 1.55 },
  { hour: 21, top: '#263c87', horizon: '#9280c7', light: '#b8c9ff', fog: '#797eae', intensity: .8, ambient: .85, glow: 1.9 },
  { hour: 24, top: '#263c87', horizon: '#9280c7', light: '#b8c9ff', fog: '#797eae', intensity: .8, ambient: .85, glow: 1.9 },
] as const
export function phaseAt(hour: number): DayPhase {
  return hour < 5 || hour >= 21 ? 'NIGHT' : hour < 7 ? 'DAWN' : hour < 10 ? 'MORNING' : hour < 17 ? 'DAY' : hour < 19 ? 'SUNSET' : 'EVENING'
}
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
function localHour() { const d = new Date(); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600 }
export const worldTime = { current: sampleTime(localHour()), override: null as number | null }
export function refreshWorldTime() { worldTime.current = sampleTime(worldTime.override ?? localHour()) }
