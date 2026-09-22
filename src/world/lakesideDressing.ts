import { connectedPromenadeRoute, promenadeHalfWidth, promenadeBank, LAMP_STATIONS, lampPoint } from './lakesideRoute.ts'
import { streamCenter, lakeWidthV3, BRIDGE } from './terrain.ts'
import { homeLocalX, homeLocalZ } from './homeSpace.ts'
import type { Season } from './realWorld.ts'

export type DressingTree = readonly [number,number,number,number]
const route=connectedPromenadeRoute().getSpacedPoints(900)
export function acceptsLakesidePlant(x:number,z:number,clearance=0){
 if(Math.abs(homeLocalX(x,z))<5.6&&homeLocalZ(x,z)>-5&&homeLocalZ(x,z)<7)return false
 if(Math.abs(z-BRIDGE.z)<2.7&&Math.abs(x-streamCenter(BRIDGE.z))<BRIDGE.halfLength+2)return false
 if(z<163&&Math.abs(x-streamCenter(z))<lakeWidthV3(z)+.65)return false
 if(LAMP_STATIONS.some(s=>{const p=lampPoint(s.z,s.side);return Math.hypot(x-p.x,z-p.z)<.8+clearance}))return false
 return !route.some(p=>Math.hypot(x-p.x,z-p.z)<promenadeHalfWidth(p.z)*1.34+.35+clearance)
}
// Tight groves beside the promenade connect trees with lamps and planting beds.
// Keep open water and the walkable ribbon unchanged; compact each grove locally.
const groups:readonly (readonly [number,number,number])[]=[
 [-10,-27,3],[-13,-9,3],[-10,10,2],
 [promenadeBank(45,-1).x-12,45,3],[promenadeBank(78,-1).x-12,78,4],
 [promenadeBank(119,-1).x-12,119,3],[promenadeBank(148,-1).x-12,148,3],
 [promenadeBank(57,1).x+12,57,3],[promenadeBank(97,1).x+12,97,4],
 [promenadeBank(138,1).x+12,138,3],[promenadeBank(148,-1).x-12,148,3],[promenadeBank(148,1).x+12,148,3],[promenadeBank(38,-1).x-12,38,4],[promenadeBank(38,1).x+12,38,4],[promenadeBank(60,-1).x-12,60,4],[promenadeBank(60,1).x+12,60,4],
]
const avenue:readonly (readonly [number,number,number])[]=[38,49,62,76,89,106,119,134,146].flatMap((z,i)=>([-1,1] as const).map(side=>[promenadeBank(z,side).x+side*(10+(i%3)*.3),z+(side===1?2:-2),1] as const))
export const LAKESIDE_TREES:DressingTree[]=[]
for(const [g,[x,z,n]] of [...groups,...avenue].entries())for(let i=0;i<n*2;i++){
 const a=i*2.4+g*.71,d=i===0?0:1.5+i*.65,s=.78+((g*7+i*3)%9)*.095
 const targetX=x+Math.cos(a)*d,targetZ=z+Math.sin(a)*d
 // Move blocked planting to nearby dry ground instead of silently removing it.
 let placed=false
 for(let radius=0;radius<=30&&!placed;radius+=1.5)for(let j=0;j<(radius===0?1:16);j++){
  const angle=a+j*Math.PI/8,px=targetX+Math.cos(angle)*radius,pz=targetZ+Math.sin(angle)*radius
  if(!acceptsLakesidePlant(px,pz,2.2*s)||LAKESIDE_TREES.some(t=>Math.hypot(px-t[0],pz-t[1])<2))continue
  LAKESIDE_TREES.push([px,pz,s,(g+i)%3]);placed=true;break
 }
}
export const LAKESIDE_MEADOWS:readonly (readonly number[])[]=[
 ...LAKESIDE_TREES.map(([x,z])=>[x,z,5.5,7]),
 ...([43,65,88,112,139,151] as const).flatMap((z,i)=>([-1,1] as const).map(side=>[streamCenter(z)+side*(lakeWidthV3(z)+2.6),z,1.6,5+i%3])),
 [-3,-25,3,5],[19,-33,3,4],[-8,-5,3,5],
]
export const SEASON_FOLIAGE:Record<Season,readonly string[]>={
 spring:['#a9c47e','#87b784','#dfbfc9','#789b70'],
 summer:['#719566','#4c795a','#83a36a','#547563'],
 autumn:['#c0a15c','#b37e4d','#a45f51','#78815c'],
 winter:['#908b7c','#9b9386','#817f75','#647d70'],
}
export const LAMP_SEASONS:Record<Season,{core:string;light:string}>={
 spring:{core:'#fff0e7',light:'#d7bdeb'},summer:{core:'#fff2dc',light:'#ffeacf'},
 autumn:{core:'#ffedd6',light:'#ffdbad'},winter:{core:'#fff0de',light:'#e6e3f2'},
}

export function isCherryTree(index:number){return index%10<7}
