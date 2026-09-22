import { Color, MathUtils, Vector3 } from 'three'
import { presentedWeather, WEATHER_LOOK } from './weatherPresentation.ts'
import { worldTime } from './worldTime.ts'
import { livingWorld, seasonalBlend, skyEventAt, fantasyEventAt } from './livingWorld.ts'
import type { FantasyEvent } from './livingWorld.ts'

// One smoothed interpretation shared by all renderers. No renderer reads the device clock.
export const environmentState = {
  grass: new Color('#8c9c79'), foliage: new Color('#8fad83'), flower: new Color('#edb9cb'), skyTint: new Color('#c4cede'),
  skyTop: new Color('#080f2c'), skyHorizon: new Color('#222b4e'), moonDirection: new Vector3(0,.28,-.8).normalize(),
  wind: .2, cloudiness: 0, rain: 0, wetness: 0, weatherSnow: 0, snowAmount: .3, leafFall: 0,
  meteorShower: 0, moonSize: 1, crescent: 0, rainbow: 0, lightning: 0, starRichness: 1, cloudGlow: 0, shower: 0,
  density: .8, bloom: .7, snow: 0, sunlight: 1, haze: 1, night: 0, aurora: 0, meteor: 0,
  fireflies: 0, warmth: .6, richness: .35,
}
const target = { grass: new Color(), foliage: new Color(), flower: new Color(), sky: new Color(), temp: new Color(), snowColor: new Color("#d8e5eb") }
let cachedSeason = '', cachedProgress = -1
let eventDate: Date | null = null, eventSeason = '', eventNight = false, eventMystery = false
let scheduled: FantasyEvent | null = null
let events = { aurora: false, shootingStar: false }
let snow = 0, density = .8, bloom = .7, sun = 1, haze = 1
export function updateEnvironmentState(delta: number) {
  const real = worldTime.realWorld, brain = livingWorld.brain
  if (cachedSeason !== real.season || cachedProgress !== real.seasonProgress) {
    cachedSeason = real.season; cachedProgress = real.seasonProgress
    const { from, to, blend } = seasonalBlend(real.season, real.seasonProgress)
    target.grass.set(from.grass).lerp(target.temp.set(to.grass), blend)
    target.foliage.set(from.foliage).lerp(target.temp.set(to.foliage), blend)
    target.flower.set(from.flower).lerp(target.temp.set(to.flower), blend)
    target.sky.set(from.sky).lerp(target.temp.set(to.sky), blend)
    snow = MathUtils.lerp(from.snow, to.snow, blend); density = MathUtils.lerp(from.density, to.density, blend)
    bloom = MathUtils.lerp(from.bloom, to.bloom, blend); sun = MathUtils.lerp(from.sun, to.sun, blend); haze = MathUtils.lerp(from.haze, to.haze, blend)
  }
  const t = 1 - Math.exp(-Math.min(delta, .1) * 1.4), state = environmentState
  state.grass.lerp(target.temp.copy(target.grass).lerp(target.snowColor,state.weatherSnow), t); state.foliage.lerp(target.foliage, t); state.flower.lerp(target.flower, t); state.skyTint.lerp(target.sky, t)
  const weather = presentedWeather(),look=WEATHER_LOOK[weather]
  const rain = look.rain
  // Cover leads rainfall; substrate response trails both and dries much more slowly.
  state.cloudiness = MathUtils.lerp(state.cloudiness,look.cloud,1-Math.exp(-delta*.9))
  state.rain = MathUtils.lerp(state.rain,rain*MathUtils.smoothstep(state.cloudiness,.2,.7),1-Math.exp(-delta*.65))
  state.wind = MathUtils.lerp(state.wind,livingWorld.windOverride ?? (look.wind+(1-brain.calmness)*.06),t)
  state.wetness = MathUtils.lerp(state.wetness,state.rain,1-Math.exp(-delta*(state.rain>state.wetness?.2:.012)))
  state.weatherSnow = MathUtils.clamp(state.weatherSnow + delta * (weather === 'snow' ? .025 : -.002),0,1)
  state.snowAmount = MathUtils.lerp(state.snowAmount,weather === 'snow' ? {light:.3,normal:.6,heavy:1,magical:.65}[livingWorld.snowMode] : snow*.3,t)
  state.snow = MathUtils.lerp(state.snow, Math.max(snow,state.weatherSnow), t); state.bloom = MathUtils.lerp(state.bloom, bloom * (.7 + brain.vitality * .3), t)
  state.density = MathUtils.lerp(state.density, density, t); state.sunlight = MathUtils.lerp(state.sunlight, sun, t)
  state.haze = MathUtils.lerp(state.haze, haze * (1 + brain.mystery * .08) * look.haze, t)
  const sunY = worldTime.presentation.sunY
  const night = 1 - MathUtils.smoothstep(sunY, -.18, .12)
  state.night = MathUtils.lerp(state.night, night, t)
  state.warmth = MathUtils.lerp(state.warmth, brain.warmth, t)
  state.richness = MathUtils.lerp(state.richness, livingWorld.growth.richness, t)
  if (eventDate !== real.date || eventSeason !== real.season || eventNight !== (night > .8) || eventMystery !== (brain.mystery >= .35)) {
    eventDate = real.date; eventSeason = real.season; eventNight = night > .8; eventMystery = brain.mystery >= .35
    events = skyEventAt(real.date, real.season, night, brain.mystery)
    scheduled = fantasyEventAt(real.date, real.season, night > .8, brain.curiosity)
  }
  const forced = livingWorld.eventOverride
  state.aurora = MathUtils.lerp(state.aurora, (forced ? forced === 'aurora' : events.aurora) ? night : 0, t)
  state.meteor = (forced ? forced === 'shootingStar' : events.shootingStar) ? night : 0
  const discovery = forced === 'none' ? null : forced ?? scheduled
  state.meteorShower = MathUtils.lerp(state.meteorShower,discovery==='meteorShower'?night:0,t)
  state.moonSize = MathUtils.lerp(state.moonSize,discovery==='giantMoon'?1.7:1,t)
  state.crescent = MathUtils.lerp(state.crescent,discovery==='crescentMoon'?1:0,t)
  state.rainbow = MathUtils.lerp(state.rainbow,(discovery==='doubleRainbow'?2:discovery==='rainbow'?1:state.wetness>.3&&weather==='clear'?1:0)*(1-night),t)
  state.lightning = MathUtils.lerp(state.lightning,discovery==='lightning'||weather==='storm'?1:0,t)
  state.starRichness = MathUtils.lerp(state.starRichness,discovery==='starryNight'?1.7:1,t)
  state.cloudGlow = MathUtils.lerp(state.cloudGlow,discovery==='glowingClouds'?1:0,t)
  state.shower = MathUtils.lerp(state.shower,(discovery==='petalShower'||discovery==='goldenWind'||discovery==='magicalSnow')?1:0,t)
  state.leafFall = MathUtils.lerp(state.leafFall,real.season==='autumn'?Math.min(1,real.seasonProgress*2):0,t)
  state.fireflies = MathUtils.lerp(state.fireflies, night * (discovery==='fireflyNight'?1.5:real.season === 'summer' ? 1 : .2) * (.5 + brain.vitality * .5), t)
}
