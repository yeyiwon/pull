import { CatmullRomCurve3, Vector3, Vector4 } from 'three'
import { BRIDGE, streamCenter, streamWidth } from '../world/terrain.ts'
import { homeWorldPoint } from '../world/homeSpace.ts'
import { isCirculationClear } from '../world/ecology.ts'

// Visual paths meet the existing deck ends and porch; they never own collision.
const bridgeX = streamCenter(BRIDGE.z)
const porch = homeWorldPoint(1.8, 5.5)
export const HERO_PATHS = [
  new CatmullRomCurve3([new Vector3(-13,0,5),new Vector3(-11,0,-1),new Vector3(-8,0,-6),new Vector3(bridgeX-BRIDGE.halfLength,0,BRIDGE.z)]),
  new CatmullRomCurve3([new Vector3(bridgeX+BRIDGE.halfLength,0,BRIDGE.z),new Vector3(8,0,-11),new Vector3(11,0,-14),new Vector3(porch.x,0,porch.z)]),
]
export const PATH_SEGMENTS = HERO_PATHS.flatMap(path => Array.from({length:6},(_,i)=>{
  const a=path.getPoint(i/6),b=path.getPoint((i+1)/6)
  return new Vector4(a.x,a.z,b.x,b.z)
}))
export function pathDistance(x:number,z:number) {
  let distance=Infinity
  for(const s of PATH_SEGMENTS){
    const dx=s.z-s.x,dz=s.w-s.y,t=Math.max(0,Math.min(1,((x-s.x)*dx+(z-s.y)*dz)/(dx*dx+dz*dz)))
    distance=Math.min(distance,Math.hypot(x-s.x-dx*t,z-s.y-dz*t))
  }
  return distance
}
export const MEADOW_CLUSTERS = [
  [-8,4,3.6,2.2], [5,6,2.4,2.2], [-13,-3,2.2,3],
  [-9,-13,2.7,1.4], [7,-13,1.6,2], [14,-17,1.3,2],
  [6,-28,1.7,1.6], [-18,-17,3,2], [17,-30,2.5,2],
] as const
export function acceptsPlant(x:number,z:number) {
  return !isCirculationClear(x,z) && pathDistance(x,z)>1.05 && Math.abs(x-streamCenter(z))>streamWidth(z)+.45
    && !(x>5 && x<15 && z> -29 && z< -18)
    && !(Math.abs(z-BRIDGE.z)<2.3 && Math.abs(x-bridgeX)<BRIDGE.halfLength+1.5)
}
