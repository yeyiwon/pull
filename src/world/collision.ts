import type { Vector3 } from 'three'
import { CRYSTALS, FLOWERS, RIDGES, RING, ROCKS, TREES, MUSHROOMS } from './worldLayout.ts'
export type Obstacle = { x: number; z: number; rx: number; rz: number; angle: number; bottom: number; top: number }
const shapes = (items: readonly (readonly number[])[], turn: number): Obstacle[] => items.map(([x, y, z, sx, sy, sz], i) => ({
  x, z, rx: sx * 1.22, rz: sz * 1.22, angle: i * turn, bottom: y - sy * 1.2, top: y + sy * 1.2,
}))
export const WORLD_OBSTACLES: readonly Obstacle[] = [
  ...TREES.map(([x, z, s]) => ({ x, z, rx: s * .65, rz: s * .65, angle: 0, bottom: 0, top: 7 * s })),
  ...MUSHROOMS.map(([x, z, s]) => ({ x, z, rx: s * .5, rz: s * .5, angle: 0, bottom: 0, top: 3 * s })),
  ...shapes(ROCKS, .7), ...shapes(RIDGES, .3),
  ...FLOWERS.map(([x, z, s]) => ({ x, z, rx: s * .85, rz: s * .85, angle: 0, bottom: 0, top: 6 * s })),
  ...CRYSTALS.map(([x, z, s]) => ({ x, z, rx: s * .9, rz: s * .9, angle: 0, bottom: 0, top: 3.8 * s })),
  // Height-aware sections keep the ring's opening empty, rather than blocking a giant box.
  ...Array.from({ length: 48 }, (_, i) => {
    const t = i / 48 * Math.PI * 2
    const x = Math.cos(t) * RING.radius, y = Math.sin(t) * RING.radius * 1.2
    const tiltedX = x * Math.cos(RING.tilt) - y * Math.sin(RING.tilt)
    const height = RING.y + x * Math.sin(RING.tilt) + y * Math.cos(RING.tilt)
    return { x: RING.x + tiltedX * Math.cos(RING.yaw), z: RING.z - tiltedX * Math.sin(RING.yaw),
      rx: .83, rz: .55, angle: RING.yaw, bottom: height - .83, top: height + .83 }
  }),
]

export function moveWithCollisions(position: Vector3, direction: Vector3, distance: number, obstacles = WORLD_OBSTACLES) {
  // Small steps prevent tunneling, including at low frame rates. No mesh raycasts.
  const steps = Math.max(1, Math.ceil(Math.abs(distance) / .12))
  const dx = direction.x * distance / steps, dz = direction.z * distance / steps
  for (let step = 0; step < steps; step++) {
    position.x += dx; position.z += dz
    for (let pass = 0; pass < 3; pass++) for (const o of obstacles) {
      if (position.y >= o.top || position.y + 2.8 <= o.bottom) continue
      const cos = Math.cos(o.angle), sin = Math.sin(o.angle)
      const x = position.x - o.x, z = position.z - o.z
      const localX = x * cos - z * sin, localZ = x * sin + z * cos
      const rx = o.rx + .65, rz = o.rz + .65
      const length = Math.hypot(localX / rx, localZ / rz)
      if (length >= 1) continue
      const scale = length > .00001 ? 1.00001 / length : 0
      const pushX = length > .00001 ? localX * scale - localX : rx
      const pushZ = length > .00001 ? localZ * scale - localZ : 0
      position.x += pushX * cos + pushZ * sin
      position.z += -pushX * sin + pushZ * cos
    }
    position.x = Math.max(-90, Math.min(90, position.x))
    position.z = Math.max(-90, Math.min(90, position.z))
  }
}
