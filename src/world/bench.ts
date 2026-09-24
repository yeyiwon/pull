import { Quaternion, Vector3 } from 'three'
import type { Player } from './locomotion.ts'
import { homeWorldPoint } from './homeSpace.ts'
import { HOME } from './worldLayout.ts'
import { surfaceHeight, streamCenter, streamWidth } from './terrain.ts'

export type WorldSeat = { id:string; kind:'IRON_BENCH'|'SOFA'|'CHAIR'; x:number; z:number; y:number; yaw:number; seatHeight:number }
function lakesideSeat(id:string,z:number,side:-1|1,offset:number,yaw:number):WorldSeat{
 const x=streamCenter(z)+side*(streamWidth(z)+offset)
 return {id,kind:'IRON_BENCH',x,z,y:surfaceHeight(x,z),yaw,seatHeight:1.03}
}
const sofa=homeWorldPoint(-2.5,.5)
const porchChair=homeWorldPoint(-2.6,4.6)
export const WORLD_SEATS:readonly WorldSeat[]=[
 lakesideSeat('west-lamp-bench',38,-1,8.2,Math.PI/2),
 lakesideSeat('east-view-bench',51,1,8.4,-Math.PI/2),
 lakesideSeat('west-grove-bench',65,-1,8.1,Math.PI/2),
 lakesideSeat('east-lake-bench',78,1,8.5,-Math.PI/2),
 {id:'home-sofa',kind:'SOFA',x:sofa.x,z:sofa.z,y:0,yaw:HOME.yaw,seatHeight:1},
 {id:'porch-chair',kind:'CHAIR',x:porchChair.x,z:porchChair.z,y:0,yaw:HOME.yaw+Math.PI,seatHeight:.61},
]
export const LAKE_BENCH=WORLD_SEATS[0]
export const BENCH_CLIP = 'Bench_Sit_From_Stand'
export const BENCH_CROSS = 'Sit_Cross_Legged'
export const BENCH_REST = 'Bench_Rest'
export const BENCH_STAND = 'Sit_to_Stand_Transition_F'
const STAND_DURATION = 4.791667
type Seat = { active:boolean; started:boolean; clip:string; elapsed:number; seat:WorldSeat }
const seats = new WeakMap<Player,Seat>()
const rotation = new Quaternion(),up=new Vector3(0,1,0),forward=new Vector3()
export function seatApproach(seat:WorldSeat,out=new Vector3()){
 forward.set(Math.sin(seat.yaw),0,Math.cos(seat.yaw))
 return out.set(seat.x+forward.x*1.2,seat.y,seat.z+forward.z*1.2)
}
export function nearestSeat(p:Player){
 if(!p.isGrounded)return null
 let found:WorldSeat|null=null,best=2.3
 for(const seat of WORLD_SEATS){const point=seatApproach(seat),distance=Math.hypot(p.position.x-point.x,p.position.z-point.z);if(distance<best&&Math.abs(p.position.y-seat.y)<.65){found=seat;best=distance}}
 return found
}
export function isSeated(p:Player){return seats.get(p)?.active??false}
export function nearBench(p:Player){return nearestSeat(p)!==null}
export function requestBench(p:Player){
 if(isSeated(p)){const seat=seats.get(p)!;if(seat.clip===BENCH_STAND)return false;seat.clip=BENCH_STAND;seat.elapsed=0;seat.started=false;return true}
 const seat=nearestSeat(p)
 if(!seat||p.groundState!=='IDLE'||p.state!=='IDLE'||p.jumpRequested)return false
 seats.set(p,{active:true,started:false,clip:BENCH_CLIP,elapsed:0,seat});return true
}
export function benchPose(p:Player){return seats.get(p)?.clip}
export function canCrossLegs(p:Player){return seats.get(p)?.clip!==BENCH_STAND&&(seats.get(p)?.elapsed??0)>2.4}
export function toggleCrossLegs(p:Player){const seat=seats.get(p);if(!seat||!canCrossLegs(p))return false;seat.clip=seat.clip===BENCH_CROSS?BENCH_REST:BENCH_CROSS;seat.started=false;return true}
export function clearBench(p:Player){seats.delete(p)}
export function updateBench(p:Player,dt:number,start:(clip:string)=>boolean,stop:()=>void){
 const seat=seats.get(p)
 if(!seat?.active)return
 const moving=p.keys.size>0||Math.hypot(p.touchX,p.touchZ)>.05||p.jumpRequested||!p.isGrounded
 const exit=seatApproach(seat.seat)
 if(moving){seats.delete(p);stop();p.position.copy(exit);p.groundY=seat.seat.y;return}
 if(!seat.started){if(!start(seat.clip)){seats.delete(p);return}seat.started=true}
 // Approach and turn over the existing sitting clip, never snap to a seat remotely.
 seat.elapsed+=dt
 const blend=1-Math.exp(-7*dt)
 const leaving=seat.clip===BENCH_STAND
 const exitProgress=leaving?Math.max(0,Math.min(1,(seat.elapsed-2.15)/(STAND_DURATION-2.15))):0
 const smooth=exitProgress*exitProgress*(3-2*exitProgress)
 p.position.x+=(seat.seat.x+(exit.x-seat.seat.x)*smooth-p.position.x)*blend
 p.position.z+=(seat.seat.z+(exit.z-seat.seat.z)*smooth-p.position.z)*blend
 rotation.setFromAxisAngle(up,seat.seat.yaw);p.rotation.slerp(rotation,blend)
 p.actionRequested=null;p.listenRequested=false
 if(leaving&&seat.elapsed>=STAND_DURATION){seats.delete(p);stop()}
}
