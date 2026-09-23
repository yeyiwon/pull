import { streamCenter, streamWidth } from './terrain.ts'
// Shared visual placements and conservative collision footprints.
export const ROCKS = [
  [-12, 0.4, -10, 3, 1.7, 2], [20, 0.3, -27, 4.5, 2.2, 2.7],
  [-26, 0.2, -44, 6, 3, 3], [13, 0.2, 18, 2.6, 1.3, 2],
] as const
export const RIDGES = [
  [-105, 5, -170, 76, 26, 31], [84, 4, -190, 82, 32, 35],
  [192, 0, 20, 43, 43, 90], [-190, 0, 25, 46, 39, 94], [15, 0, 190, 112, 46, 38],
  [-70, -5, -95, 38, 18, 23], [72, -6, -113, 36, 23, 27],
  [126, -5, 65, 31, 23, 59], [-125, -6, 73, 34, 29, 44], [5, -7, 123, 61, 24, 23],
] as const
export const FLOWERS = [[-7, -7, 1], [-13, -19, 1.3], [-20, -35, .9], [17, 13, 1.15], [34, -44, 1.6]] as const
export const CRYSTALS = [[14, -12, 1.3], [17, -15, .8], [12, -16, .65], [-18, 15, 1.2], [-21, 17, .75], [27, -39, 1.6]] as const
export const RING = { x: 12, y: 8.8, z: -57, radius: 7, tube: .055, yaw: -.18, tilt: .13 }

export const HALO_ARCS = [[-.1,2.65],[3.13,2.35]] as const

// Garden silhouettes stay west; the eastern stream keeps a clear approach.
const GARDEN_TREES = [[-16, -12, 1.2, 0], [-25, -23, 1.5, 1], [-31, -6, 1.1, 2], [-22, 9, 1.3, 0], [29, 22, 1, 1]] as const
export const MUSHROOMS = [[-10, -19, 1.2], [-19, -6, .8], [-29, 4, 1.6]] as const

export const HOME = { scale: 1, x: 10, z: -24, yaw: -.12, width: 8, depth: 7 }

// Small groves outside the promenade, with open water-facing gaps.
export const TREES:readonly (readonly [number,number,number,number])[]=[...GARDEN_TREES,
 ...[34,43,55,69,79].flatMap((z,i)=>[-1,1].map(side=>[streamCenter(z)+side*(streamWidth(z)+10+(i%2)*2),z,1.05+(i%3)*.2,(i+(side>0?1:0))%3] as const)),
 [-33,40,1.6,0],[-29,57,1.9,1],[-21,73,1.45,0],[60,48,1.7,0],[52,72,1.8,1],
 [-30,19,1.65,0],[-32,27,1.15,2],[44,3,1.4,1]]
