export type DayPhase = 'DAWN' | 'MORNING' | 'DAY' | 'SUNSET' | 'EVENING' | 'NIGHT'
export const PHASE_STARTS: readonly { hour: number; phase: DayPhase }[] = [
  { hour: 0, phase: 'NIGHT' }, { hour: 5, phase: 'DAWN' }, { hour: 7, phase: 'MORNING' },
  { hour: 11, phase: 'DAY' }, { hour: 17, phase: 'SUNSET' }, { hour: 19, phase: 'EVENING' }, { hour: 21, phase: 'NIGHT' },
]
export function phaseAt(hour: number): DayPhase {
  const h = ((hour % 24) + 24) % 24
  return [...PHASE_STARTS].reverse().find(p => h >= p.hour)!.phase
}
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export type WeatherContext = {
  type: 'clear' | 'partlyCloudy' | 'cloudy' | 'rain' | 'snow' | 'fog' | 'storm'
  temperature?: number; humidity?: number; windSpeed?: number
}
export interface WeatherProvider { read(): Promise<WeatherContext | null> }
export const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter']
export function seasonAt(date: Date, hemisphere: 'north' | 'south' = 'north') {
  const month = date.getMonth(), year = date.getFullYear()
  const index = Math.floor(((month + 10) % 12) / 3)
  const startMonth = [2, 5, 8, 11][index]
  const startYear = month < 2 ? year - 1 : year
  // UTC calendar-day arithmetic avoids an hour jump from local daylight saving changes.
  const start = Date.UTC(startYear, startMonth, 1), end = Date.UTC(startYear, startMonth + 3, 1)
  const day = Date.UTC(year, month, date.getDate())
  return { season: SEASONS[(index + (hemisphere === 'south' ? 2 : 0)) % 4], seasonProgress: Math.max(0, Math.min(1, (day - start) / (end - start))) }
}
export function createRealWorldContext(date: Date, override?: { season: Season; progress: number } | null) {
  const seasonal = override ? { season: override.season, seasonProgress: Math.max(0, Math.min(1, override.progress)) } : seasonAt(date)
  return { date, year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(), hour: date.getHours(), minute: date.getMinutes(), timeOfDay: phaseAt(date.getHours() + date.getMinutes() / 60), ...seasonal }
}
