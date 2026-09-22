import type { Season } from './realWorld.ts'
// Future audio mixer input. No files, AudioContexts or synthetic sounds are created.
export function ambientMix(season: Season, night: number, rain: number, wind: number, indoors: boolean) {
 const outside=indoors?.25:1
 return { wind:wind*outside, rain:rain*outside, leaves:(season==='autumn'?.6:.2)*wind*outside,
  birds:(1-night)*(1-rain)*outside*.3, insects:season==='summer'?night*.4*outside:0,
  water:.2*outside, fireplace:indoors?.4:0, snow:season==='winter'?.15*outside:0 }
}
