import { HOME } from './worldLayout.ts'
export const homeState = { doorPhase: 'CLOSED' as 'CLOSED'|'OPENING'|'OPEN'|'CLOSING', doorOpen: 0, inside: false, cutaway: 0 }
export const DOOR = { x: 1.8, width: 2.3, z: HOME.depth / 2 }
export function homeLocalX(x: number, z: number) { return ((x - HOME.x) * Math.cos(HOME.yaw) - (z - HOME.z) * Math.sin(HOME.yaw))/HOME.scale }
export function homeLocalZ(x: number, z: number) { return ((x - HOME.x) * Math.sin(HOME.yaw) + (z - HOME.z) * Math.cos(HOME.yaw))/HOME.scale }
export function homeWorldPoint(x: number, z: number) { return { x: HOME.x + HOME.scale*(x * Math.cos(HOME.yaw) + z * Math.sin(HOME.yaw)), z: HOME.z + HOME.scale*(-x * Math.sin(HOME.yaw) + z * Math.cos(HOME.yaw)) } }
export function updateHome(x: number, z: number, delta: number) {
  const lx = homeLocalX(x,z), lz = homeLocalZ(x,z)
  homeState.inside = Math.abs(lx) < HOME.width / 2 && Math.abs(lz) < HOME.depth / 2
  // Proximity works with keyboard and touch and keeps the existing E gesture intact.
  const nearDoor = Math.abs(lx - DOOR.x) < 2.2 && Math.abs(lz - DOOR.z) < 3.4
  homeState.doorOpen += ((nearDoor || homeState.inside ? 1 : 0) - homeState.doorOpen) * (1 - Math.exp(-delta * 5))
  homeState.doorPhase=homeState.doorOpen>.99?'OPEN':homeState.doorOpen<.01?'CLOSED':nearDoor||homeState.inside?'OPENING':'CLOSING'
  const close = Math.abs(lx) < HOME.width / 2 + 1 && Math.abs(lz) < HOME.depth / 2 + 1
  homeState.cutaway += ((close ? 1 : 0) - homeState.cutaway) * (1 - Math.exp(-delta * 4))
}
