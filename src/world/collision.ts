import { WORLD_SEATS } from './bench.ts'
import { DOOR, homeState, homeWorldPoint } from './homeSpace.ts'
import type { Vector3 } from 'three'
import { CRYSTALS, FLOWERS, RIDGES, ROCKS, TREES, MUSHROOMS, HOME } from './worldLayout.ts'
export type Obstacle = { x: number; z: number; rx: number; rz: number; angle: number; bottom: number; top: number; box?: boolean }
const shapes = (items: readonly (readonly number[])[], turn: number): Obstacle[] => items.map(([x, y, z, sx, sy, sz], i) => ({
  x, z, rx: sx * 1.22, rz: sz * 1.22, angle: i * turn, bottom: y - sy * 1.2, top: y + sy * 1.2,
}))
function wall(x: number, z: number, rx: number, rz: number): Obstacle { return { ...homeWorldPoint(x,z), rx, rz, angle: HOME.yaw, bottom: -.5, top: 4.8, box: true } }
export const HOME_DOOR = wall(DOOR.x, DOOR.z, DOOR.width / 2, .1)
export const HOME_WALLS = [wall(-4,0,.15,3.5), wall(4,0,.15,3.5), wall(0,-3.5,4,.15), wall(-1.7,3.5,2.3,.15), wall(3.55,3.5,.45,.15), HOME_DOOR]
export const WORLD_OBSTACLES: readonly Obstacle[] = [
  ...HOME_WALLS,
  ...WORLD_SEATS.filter(seat=>seat.kind==='IRON_BENCH').map(seat=>({x:seat.x,z:seat.z,rx:.52,rz:1.48,angle:seat.yaw-Math.PI/2,bottom:seat.y,top:seat.y+1.98,box:true})),
  ...WORLD_SEATS.filter(seat=>seat.kind==='CHAIR').map(seat=>({x:seat.x,z:seat.z,rx:.5,rz:.48,angle:seat.yaw,bottom:seat.y,top:seat.y+1.5,box:true})),
  {...wall(-2.5,.5,1.1,.65),top:1.7},{...wall(-.9,-.9,.55,.55),top:.8},
  ...TREES.map(([x, z, s]) => ({ x, z, rx: s * .65, rz: s * .65, angle: 0, bottom: 0, top: 7 * s })),
  ...MUSHROOMS.map(([x, z, s]) => ({ x, z, rx: s * .5, rz: s * .5, angle: 0, bottom: 0, top: 3 * s })),
  ...shapes(ROCKS, .7), ...shapes(RIDGES, .3).filter((_,i)=>i!==4&&i!==9),
  ...FLOWERS.map(([x, z, s]) => ({ x, z, rx: s * .85, rz: s * .85, angle: 0, bottom: 0, top: 6 * s })),
  ...CRYSTALS.map(([x, z, s]) => ({ x, z, rx: s * .9, rz: s * .9, angle: 0, bottom: 0, top: 3.8 * s })),
  // The current celestial Arc is visual only; preserve its non-blocking behavior.
]

export const MORU_COLLISION={radius:.65,height:2.8}
export function moveWithCollisions(position: Vector3, direction: Vector3, distance: number, obstacles = WORLD_OBSTACLES, body = MORU_COLLISION) {
  // Small steps prevent tunneling, including at low frame rates. No mesh raycasts.
  const steps = Math.max(1, Math.ceil(Math.abs(distance) / .12))
  const dx = direction.x * distance / steps, dz = direction.z * distance / steps
  for (let step = 0; step < steps; step++) {
    position.x += dx; position.z += dz
    for (let pass = 0; pass < 3; pass++) for (const o of obstacles) {
      if (o === HOME_DOOR && homeState.doorOpen > .75) continue
      if (position.y >= o.top || position.y + body.height <= o.bottom) continue
      const cos = Math.cos(o.angle), sin = Math.sin(o.angle)
      const x = position.x - o.x, z = position.z - o.z
      const localX = x * cos - z * sin, localZ = x * sin + z * cos
      const rx = o.rx + body.radius, rz = o.rz + body.radius
      if (o.box) {
        if (Math.abs(localX) >= rx || Math.abs(localZ) >= rz) continue
        const px = rx - Math.abs(localX), pz = rz - Math.abs(localZ)
        const pushX = px < pz ? Math.sign(localX || 1) * (px + .00001) : 0
        const pushZ = px < pz ? 0 : Math.sign(localZ || 1) * (pz + .00001)
        position.x += pushX * cos + pushZ * sin; position.z += -pushX * sin + pushZ * cos
        continue
      }
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
