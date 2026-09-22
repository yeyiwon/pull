import { isWorldReconstructionV3 } from './worldLayoutMode.ts'
export const WATER_Y = -.055
export function streamCenter(z: number) { return 6 + Math.sin(z * .039) * 14 + Math.sin(z * .081) * 3 }
export function lakeWidthV3(z:number){
 if(z>=163)return 0
 if(z>158)return (3.4+Math.sin(z*.03)*1.4)*(163-z)/5
 const d=(z-94)/64,footprint=Math.max(0,1-d*d)
 return 3.4+Math.sin(z*.03)*1.4+78*Math.pow(footprint,1.2)*(1+.025*Math.sin(z*.16)+.012*Math.sin(z*.39))
}
// The existing channel and bridge stay unchanged; the water opens into a lake farther north.
export function streamWidth(z: number) {
  if(isWorldReconstructionV3())return lakeWidthV3(z)
  const distance = (z - 83) / 31
  const lake = Math.exp(-(distance ** 4))
  return 3.4 + Math.sin(z * .03) * 1.4 + lake * (30 + 1.2 * Math.sin(z * .17) + .6 * Math.sin(z * .31))
}
export const BRIDGE = { z: -9, halfLength: streamWidth(-9) + 1.9, halfWidth: 1.65 }
const smooth = (a: number) => { const t = Math.max(0, Math.min(1, a)); return t * t * (3 - 2 * t) }
export function riverbedHeight(x: number, z: number) {
  if(isWorldReconstructionV3()&&z>=163)return 0
  const bank = Math.abs(x - streamCenter(z)) - streamWidth(z)
  if(isWorldReconstructionV3()&&z>29&&z<163){
    const shelf=smooth((-bank)/7)
    if(bank>=0)return .13*smooth(bank/5)
    return -.08-.34*shelf
  }
  if (bank >= 1) return 0
  return -.42 * (1 - smooth((bank + .5) / 1.5))
}
export function bridgeHeight(x: number, z: number) {
  const along = Math.abs(x - streamCenter(BRIDGE.z)) / BRIDGE.halfLength
  return Math.abs(z - BRIDGE.z) <= BRIDGE.halfWidth && along < 1 ? .42 * Math.cos(along * Math.PI / 2) : null
}
export function surfaceHeight(x: number, z: number) { return bridgeHeight(x,z) ?? riverbedHeight(x,z) }
export function waterDepth(x: number, z: number) { return Math.max(0, WATER_Y - surfaceHeight(x,z)) }
