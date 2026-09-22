export const WATER_Y = -.055
export function streamCenter(z: number) { return 6 + Math.sin(z * .039) * 14 + Math.sin(z * .081) * 3 }
export function streamWidth(z: number) { return 3.4 + Math.sin(z * .03) * 1.4 }
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
