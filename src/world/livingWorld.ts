import { SEASONS } from './realWorld.ts'
import type { Season, WeatherContext } from './realWorld.ts'
import type { MoruSelfState } from './brain/decision.ts'
export type WorldPersonality = { vitality: number; calmness: number; curiosity: number; warmth: number; mystery: number }
export type GrowthStage = 'seed' | 'home' | 'garden' | 'habitat' | 'realm' | 'dreamscape'
export const SKY_EVENTS = ['aurora','shootingStar','meteorShower','giantMoon','crescentMoon','rainbow','doubleRainbow','glowingClouds','starryNight','lightning','petalShower','goldenWind','fireflyNight','magicalSnow'] as const
export type FantasyEvent = typeof SKY_EVENTS[number]
export const livingWorld = {
  brain: { vitality: .6, calmness: .8, curiosity: .6, warmth: .6, mystery: .4 } as WorldPersonality,
  growth: { stage: 'home' as GrowthStage, experience: 0, richness: .35 },
  weather: null as WeatherContext | null,
  windOverride: null as number | null,
  growthOverride: null as GrowthStage | null,
  snowMode: 'light' as 'light' | 'normal' | 'heavy' | 'magical',
  eventOverride: null as 'none' | FantasyEvent | null,
}
const clamp = (v: number) => Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0
export function setWorldPersonality(value: Partial<WorldPersonality>) {
  for (const key of Object.keys(livingWorld.brain) as (keyof WorldPersonality)[]) {
    if (typeof value[key] === 'number') livingWorld.brain[key] = clamp(value[key])
  }
}
// Meaning, not mesh commands. Growth adds small garden accents; the existing world is retained.
export function interpretMoruExperience(mood: MoruSelfState['mood'], seconds: number, visits: number) {
  setWorldPersonality({ vitality: mood === 'playful' ? .85 : mood === 'sleepy' ? .35 : .6,
    calmness: mood === 'sleepy' ? .95 : mood === 'playful' ? .5 : .8,
    curiosity: mood === 'curious' ? .9 : .55, warmth: Math.min(.85, .5 + visits * .015), mystery: mood === 'curious' ? .7 : .4 })
  const experience = Math.max(0, seconds) + Math.max(0, visits - 1) * 120
  livingWorld.growth.experience = experience
  livingWorld.growth.richness = .35 + .65 * (1 - Math.exp(-experience / 7200))
  livingWorld.growth.stage = experience < 600 ? 'home' : experience < 3600 ? 'garden' : experience < 18000 ? 'habitat' : experience < 60000 ? 'realm' : 'dreamscape'
  if (livingWorld.growthOverride) { livingWorld.growth.stage = livingWorld.growthOverride; livingWorld.growth.richness = {seed:.15,home:.35,garden:.55,habitat:.7,realm:.85,dreamscape:1}[livingWorld.growthOverride] }
}
export const SEASON_PALETTES = {
  spring: { grass: '#79ae8b', foliage: '#a2d5ab', flower: '#ffc1dc', sky: '#d1dae7', density: .9, bloom: 1, snow: 0, sun: 1, haze: 1.05 },
  summer: { grass: '#398b79', foliage: '#3baf85', flower: '#eda9d4', sky: '#84c3ef', density: 1, bloom: .8, snow: 0, sun: 1.15, haze: .95 },
  autumn: { grass: '#989367', foliage: '#d18a57', flower: '#eec49b', sky: '#e1b8b1', density: .65, bloom: .45, snow: 0, sun: .92, haze: 1.12 },
  winter: { grass: '#c9d9e4', foliage: '#799eac', flower: '#d0deed', sky: '#b8d4ea', density: .3, bloom: .15, snow: 1, sun: .83, haze: .83 },
} as const
export function seasonalBlend(season: Season, progress: number) {
  const index = SEASONS.indexOf(season), t = Math.max(0, Math.min(1, progress / .7))
  return { from: SEASON_PALETTES[SEASONS[(index + 3) % 4]], to: SEASON_PALETTES[season], blend: t * t * (3 - 2 * t) }
}
export function skyEventAt(date: Date, season: Season, night: number, mystery: number) {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000)
  const seconds = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds()
  const slot = Math.floor(seconds / 180)
  const shootingStar = night > .8 && (day + slot * 7) % 5 === 0 && seconds % 180 < 2
  const aurora = season === 'winter' && night > .8 && day % 4 === 0 && mystery >= .35
  return { shootingStar, aurora }
}

// A stable calendar schedule makes discoveries reproducible without a per-frame lottery.
export function fantasyEventAt(date: Date, season: Season, night: boolean, curiosity = .55): FantasyEvent | null {
  const slot = Math.floor(date.getTime() / 600000)
  if (slot % (curiosity > .75 ? 5 : 7) !== 0) return null
  if (night) return (['starryNight','giantMoon','crescentMoon','meteorShower','glowingClouds','fireflyNight'] as const)[Math.abs(slot) % 6]
  if (season === 'spring') return 'petalShower'
  if (season === 'autumn') return 'goldenWind'
  if (season === 'winter') return 'magicalSnow'
  return 'rainbow'
}

export type MemoryLandmark = { id: string; kind: 'flower' | 'tree' | 'lantern'; x: number; z: number; strength: number }
// Future memory providers can populate semantic landmarks without touching rendering objects.
export const memoryLandmarks: MemoryLandmark[] = []
