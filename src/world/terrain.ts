export const WATER_Y = -.055
export function streamCenter(z: number) { return 6 + Math.sin(z * .039) * 14 + Math.sin(z * .081) * 3 }
export function lakeBasin(z:number){const d=(z-58)/30;return Math.abs(d)<1?24*(1-d*d)**2:0}
export function streamWidth(z: number) { return 3.4 + Math.sin(z * .03) * 1.4 + lakeBasin(z) }
export const BRIDGE = { z: -9, halfLength: streamWidth(-9) + 1.9, halfWidth: 1.65 }
const smooth = (a: number) => { const t = Math.max(0, Math.min(1, a)); return t * t * (3 - 2 * t) }
export function riverbedHeight(x: number, z: number) {
  const bank = Math.abs(x - streamCenter(z)) - streamWidth(z)
  if (bank >= 1) return 0
  return -.42 * (1 - smooth((bank + .5) / 1.5))
}
export function bridgeHeight(x: number, z: number) {
  const along = Math.abs(x - streamCenter(BRIDGE.z)) / BRIDGE.halfLength
  return Math.abs(z - BRIDGE.z) <= BRIDGE.halfWidth && along < 1 ? .42 * Math.cos(along * Math.PI / 2) : null
}
export function surfaceHeight(x: number, z: number) { return bridgeHeight(x,z) ?? riverbedHeight(x,z) }
export function waterDepth(x: number, z: number) { return Math.max(0, WATER_Y - surfaceHeight(x,z)) }

// Legacy layout review helper; the live procedural terrain does not use this footprint.
export function lakeWidthV3(z:number){
 if(z>=163)return 0
 if(z>158)return (3.4+Math.sin(z*.03)*1.4)*(163-z)/5
 const d=(z-94)/64,footprint=Math.max(0,1-d*d)
 return 3.4+Math.sin(z*.03)*1.4+78*Math.pow(footprint,1.2)*(1+.025*Math.sin(z*.16)+.012*Math.sin(z*.39))
}
