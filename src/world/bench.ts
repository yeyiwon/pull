import { Quaternion, Vector3 } from 'three'
import type { Player } from './locomotion.ts'
import { surfaceHeight, streamCenter, streamWidth } from './terrain.ts'

// One seat beside the first western promenade lamp, facing the lake.
const z = 38
const x = streamCenter(35) - streamWidth(35) - 8.2
export const LAKE_BENCH = { x, z, y: surfaceHeight(x,z), yaw: Math.PI/2, seatHeight: 1.03 }
export const BENCH_CLIP = 'Bench_Sit_From_Stand'
export const BENCH_CROSS = 'Sit_Cross_Legged'
export const BENCH_REST = 'Bench_Rest'
export const BENCH_STAND = 'Sit_to_Stand_Transition_F'
const STAND_DURATION = 4.791667
type Seat = { active:boolean; started:boolean; clip:string; elapsed:number }
const seats = new WeakMap<Player,Seat>()
const rotation = new Quaternion().setFromAxisAngle(new Vector3(0,1,0),LAKE_BENCH.yaw)
export function isSeated(p:Player){return seats.get(p)?.active??false}
export function nearBench(p:Player){return p.isGrounded && p.position.x>x+.55 && Math.hypot(p.position.x-(x+1),p.position.z-z)<2.3 && Math.abs(p.position.y-LAKE_BENCH.y)<.5}
export function requestBench(p:Player){
 if(isSeated(p)){const seat=seats.get(p)!;if(seat.clip===BENCH_STAND)return false;seat.clip=BENCH_STAND;seat.elapsed=0;seat.started=false;return true}
 if(!nearBench(p)||p.groundState!=='IDLE'||p.state!=='IDLE'||p.jumpRequested)return false
 seats.set(p,{active:true,started:false,clip:BENCH_CLIP,elapsed:0});return true
}
export function benchPose(p:Player){return seats.get(p)?.clip}
export function canCrossLegs(p:Player){return seats.get(p)?.clip!==BENCH_STAND&&(seats.get(p)?.elapsed??0)>2.4}
export function toggleCrossLegs(p:Player){const seat=seats.get(p);if(!seat||!canCrossLegs(p))return false;seat.clip=seat.clip===BENCH_CROSS?BENCH_REST:BENCH_CROSS;seat.started=false;return true}
export function clearBench(p:Player){seats.delete(p)}
export function updateBench(p:Player,dt:number,start:(clip:string)=>boolean,stop:()=>void){
 const seat=seats.get(p)
 if(!seat?.active)return
 const moving=p.keys.size>0||Math.hypot(p.touchX,p.touchZ)>.05||p.jumpRequested||!p.isGrounded
 if(moving){seats.delete(p);stop();p.position.set(x+1.2,LAKE_BENCH.y,z);p.groundY=LAKE_BENCH.y;return}
 if(!seat.started){if(!start(seat.clip)){seats.delete(p);return}seat.started=true}
 // Approach and turn over the existing sitting clip, never snap to a seat remotely.
 seat.elapsed+=dt
 const blend=1-Math.exp(-7*dt)
 const leaving=seat.clip===BENCH_STAND
 const exitProgress=leaving?Math.max(0,Math.min(1,(seat.elapsed-2.15)/(STAND_DURATION-2.15))):0
 const targetX=x+1.2*exitProgress*exitProgress*(3-2*exitProgress)
 p.position.x+=(targetX-p.position.x)*blend;p.position.z+=(z-p.position.z)*blend
 p.rotation.slerp(rotation,blend)
 p.actionRequested=null;p.listenRequested=false
 if(leaving&&seat.elapsed>=STAND_DURATION){seats.delete(p);stop()}
}
