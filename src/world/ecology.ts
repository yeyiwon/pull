import { HOME } from './worldLayout.ts'
import { BRIDGE,streamCenter,streamWidth,waterDepth } from './terrain.ts'

export function waterEdgeDistance(x:number,z:number){return Math.abs(x-streamCenter(z))-streamWidth(z)}
export function isOpenWater(x:number,z:number){return waterDepth(x,z)>.08||waterEdgeDistance(x,z)<-.45}
export function isShoreline(x:number,z:number){const edge=waterEdgeDistance(x,z);return edge>=-.45&&edge<=1.15}
export function isCirculationClear(x:number,z:number){
 if(Math.abs(x-HOME.x)<6.2&&Math.abs(z-HOME.z)<6)return true
 const lx=((x-HOME.x)*Math.cos(HOME.yaw)-(z-HOME.z)*Math.sin(HOME.yaw))/HOME.scale
 const lz=((x-HOME.x)*Math.sin(HOME.yaw)+(z-HOME.z)*Math.cos(HOME.yaw))/HOME.scale
 if(lx>-7.2&&lx<12.2&&lz>3&&lz<14.2)return true
 if(Math.abs(z-BRIDGE.z)<BRIDGE.halfWidth+2&&Math.abs(x-streamCenter(BRIDGE.z))<BRIDGE.halfLength+2.5)return true
 return false
}
export function allowsTerrestrialDetail(x:number,z:number){return waterEdgeDistance(x,z)>1.15&&!isCirculationClear(x,z)}
export function allowsGroundDetail(x:number,z:number){return waterEdgeDistance(x,z)>.55&&!isCirculationClear(x,z)}
