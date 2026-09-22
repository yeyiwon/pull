import { bridgeHeight, waterDepth } from '../world/terrain.ts'
import { homeLocalX, homeLocalZ } from '../world/homeSpace.ts'
export function footSurface(x: number, z: number, snow: number): 'grass' | 'wood' | 'snow' | 'water' {
  const lx = homeLocalX(x,z), lz = homeLocalZ(x,z)
  if (Math.abs(lx) < 4.3 && lz > -3.5 && lz < 5.5 || bridgeHeight(x,z) !== null) return 'wood'
  if (waterDepth(x,z) > .08) return 'water'
  return snow > .25 ? 'snow' : 'grass'
}
