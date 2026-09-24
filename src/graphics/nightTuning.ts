// Local light intensity is candela: approximately illuminance × distance² beneath a fixture.
// Keep these controls independent of exposure and the authored daytime palette.
export const NIGHT_TUNING = {
  skyBrightness: .22, // Night cloud radiance relative to the existing linear shader colors.
  ambientFill: .28, // Minimum hemisphere contribution on world surfaces, not sky.
  moonIntensity: .2, // Minimum directional silhouette fill.
  lampIntensity: 110, // About 6 lux beneath a 4.2 m lantern.
  lampDistance: 32, // Finite smooth cutoff, in world metres.
  lampDecay: 2, // Inverse-square attenuation.
  houseLightIntensity: 60, // Entrance pool; keep wall detail below clipping.
  interiorLightIntensity: 45,
  windowEmissive: 1.2, // Warm glass source; separate from real entrance illumination.
  bridgeLightIntensity: 12, // Bridge fixtures stand only 1.35 m above the deck.
  treeLightIntensity: 45,
  bloomIntensity: .4, // Existing night-only bloom strength contribution.
  moruBrightness: .9, // Shared night fill/environment multiplier for every appearance.
} as const
// Preserve day and sunset. Corrections fade in only after the sun is fully below the horizon.
export function nightCorrection(night: number) {
  const t=Math.max(0,Math.min(1,(night-.8)/.2))
  return t*t*(3-2*t)
}
export function nightValue(original: number, corrected: number, night: number) {
  return original+(corrected-original)*nightCorrection(night)
}
