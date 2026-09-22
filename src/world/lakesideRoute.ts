import { CatmullRomCurve3, Vector3 } from 'three'
import { homeWorldPoint } from './homeSpace.ts'
import { BRIDGE, lakeWidthV3, streamCenter } from './terrain.ts'

export function promenadeBank(z:number,side:-1|1){return new Vector3(streamCenter(z)+side*(lakeWidthV3(z)+8.5),0,z)}

export function promenadeRoute(){
 const points:Vector3[]=[]
 for(let z=30;z<=154;z+=8)points.push(promenadeBank(z,1))
 points.push(promenadeBank(154,1))
 // Carry the promenade around the dry north end with a broad turning radius.
 const north=streamCenter(165)
 points.push(
  new Vector3(north+26,0,166),new Vector3(north+17,0,173),
  new Vector3(north+6,0,177),new Vector3(north-6,0,177),
  new Vector3(north-17,0,173),new Vector3(north-26,0,166),
 )
 for(let z=154;z>=30;z-=8)points.push(promenadeBank(z,-1))
 points.push(promenadeBank(30,-1))
 return new CatmullRomCurve3(points,false,'centripetal',.5)
}

export function housePromenadeRoute(){
 const door=homeWorldPoint(1.8,5.5)
 return new CatmullRomCurve3([new Vector3(door.x,0,door.z),new Vector3(17,0,-4),new Vector3(25,0,13),promenadeBank(30,1)],false,'centripetal',.5)
}

export function bridgePromenadeRoute(){
 return new CatmullRomCurve3([new Vector3(streamCenter(BRIDGE.z)-BRIDGE.halfLength,0,BRIDGE.z),new Vector3(-7,0,2),new Vector3(1,0,17),promenadeBank(30,-1)],false,'centripetal',.5)
}

export const LAMP_STATIONS=[
 {z:39,side:1 as const},{z:51,side:1 as const},{z:65,side:1 as const},
 {z:80,side:1 as const},{z:96,side:1 as const},{z:111,side:1 as const},
 {z:128,side:1 as const},{z:145,side:1 as const},
 {z:44,side:1 as const},{z:58,side:1 as const},{z:88,side:1 as const},{z:120,side:1 as const},{z:153,side:1 as const},
 {z:155,side:-1 as const},{z:132,side:-1 as const},{z:112,side:-1 as const},{z:77,side:-1 as const},{z:40,side:-1 as const},
 {z:141,side:-1 as const},{z:121,side:-1 as const},{z:103,side:-1 as const},
 {z:85,side:-1 as const},{z:68,side:-1 as const},{z:49,side:-1 as const},
]
export function lampPoint(z:number,side:-1|1){const p=promenadeBank(z,side);p.x+=side*4.25;return p}

// A single spline avoids seams and overlapping caps at the two approach joins.
export function connectedPromenadeRoute(){
 const house=housePromenadeRoute(),lake=promenadeRoute(),bridge=bridgePromenadeRoute()
 return new CatmullRomCurve3([...house.points.slice(0,-1),...lake.points,...bridge.points.slice(0,-1).reverse()],false,'centripetal',.5)
}
export function promenadeHalfWidth(z:number){
 const t=Math.max(0,Math.min(1,(z+2)/32)),blend=t*t*(3-2*t)
 return 1.85+1.75*blend
}
export const LAMP_SCALE=2.2
export const LAMP_GROUND_OFFSET=-.9521619081497192
export const LAMP_LIGHT_ANCHOR=[0,.79,0] as const
export function lampLightHeight(ground:number){return ground+(LAMP_LIGHT_ANCHOR[1]-LAMP_GROUND_OFFSET)*LAMP_SCALE}
