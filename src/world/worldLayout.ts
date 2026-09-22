// Shared visual placements and conservative collision footprints.
export const ROCKS = [
  [-12, 0.4, -10, 3, 1.7, 2], [20, 0.3, -27, 4.5, 2.2, 2.7],
  [-26, 0.2, -44, 6, 3, 3], [13, 0.2, 18, 2.6, 1.3, 2],
] as const
export const RIDGES = [
  [-105, 5, -170, 76, 26, 31], [84, 4, -190, 82, 32, 35],
  [192, 0, 20, 43, 43, 90], [-190, 0, 25, 46, 39, 94], [15, 0, 190, 112, 46, 38],
  [-70, -5, -95, 38, 18, 23], [72, -6, -113, 36, 23, 27],
  [126, -5, 65, 31, 23, 59], [-125, -6, 73, 34, 29, 44], [5, -7, 190, 61, 24, 23],
] as const
export const FLOWERS = [[-7, -7, 1], [-13, -19, 1.3], [-20, -35, .9], [17, 13, 1.15], [34, -44, 1.6]] as const
export const CRYSTALS = [[14, -12, 1.3], [17, -15, .8], [12, -16, .65], [-18, 15, 1.2], [-21, 17, .75], [27, -39, 1.6]] as const
export const RING = { x: 12, y: 8.8, z: -57, radius: 7, tube: .055, yaw: -.18, tilt: .13 }

export const HALO_ARCS = [[-.1,2.65],[3.13,2.35]] as const

// Garden silhouettes stay west; the eastern stream keeps a clear approach.
export const TREES = [
  [-13, -19, 1.35, 0], [-25, -23, 1.5, 1], [-31, -6, 1.1, 2], [-22, 9, 1.3, 0],
  [29, 22, 1, 1], [-39, -32, 1.2, 0], [-17, 25, 1.05, 1], [37, 33, 1.15, 2],
  [-19, 43, 1.25, 0], [-29, 51, 1.35, 1], [-37, 62, 1.4, 0], [-39, 75, 1.15, 1],
  [-39, 90, 1.35, 0], [-41, 103, 1.45, 1], [-30, 116, 1.15, 0],
  [37, 44, 1.25, 1], [46, 55, 1.4, 0], [54, 68, 1.2, 1], [53, 82, 1.4, 0],
  [45, 97, 1.2, 1], [36, 111, 1.35, 0],
] as const
export const MUSHROOMS = [[-10, -19, 1.2], [-19, -6, .8], [-29, 4, 1.6]] as const

// Keep the approved porch/path endpoint fixed while the home grows backwards.
const homeScale = 1.95, homeYaw = -.12
export const HOME = {
  x: 10 + (1-homeScale)*(1.8*Math.cos(homeYaw)+5.5*Math.sin(homeYaw)),
  z: -24 + (1-homeScale)*(-1.8*Math.sin(homeYaw)+5.5*Math.cos(homeYaw)),
  yaw: homeYaw, width: 8, depth: 7, scale: homeScale,
}
