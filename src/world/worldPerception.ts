import { Camera, Plane, Ray, Vector2, Vector3 } from 'three'
import type { Player } from './locomotion.ts'
import { FLOWERS, HOME, TREES } from './worldLayout.ts'
import { WORLD_SEATS, seatApproach } from './bench.ts'
import { streamCenter, streamWidth, surfaceHeight, waterDepth } from './terrain.ts'
import type { WorldCandidate, WorldPerception } from './agentSkills.ts'
import { canOccupy } from './collision.ts'
import { WORLD_V3_LANDMARKS } from './worldV3.ts'

let tapped:Vector3|null=null
export function setDeicticPoint(point:Vector3){tapped=safeGround(point)}
export function getDeicticPoint(){return tapped?.clone()??null}
function safeGround(point:Vector3){
 const p=point.clone();p.x=Math.max(-88,Math.min(88,p.x));p.z=Math.max(-88,Math.min(88,p.z))
 if(waterDepth(p.x,p.z)>.08){const side=Math.sign(p.x-streamCenter(p.z))||1;p.x=streamCenter(p.z)+side*(streamWidth(p.z)+1.4)}
 p.y=surfaceHeight(p.x,p.z);return p
}
export function pointerGround(ray:Ray){const hit=new Vector3();return ray.intersectPlane(new Plane(new Vector3(0,1,0),0),hit)?safeGround(hit):null}
export function pointerMoveGround(ray:Ray){
 if(ray.direction.y>=-.02)return null
 const hit=new Vector3();if(!ray.intersectPlane(new Plane(new Vector3(0,1,0),0),hit)||hit.distanceTo(ray.origin)>190)return null
 if(Math.abs(hit.x)>=88||Math.abs(hit.z)>=88||waterDepth(hit.x,hit.z)>.08)return null
 hit.y=surfaceHeight(hit.x,hit.z)
 return canOccupy(hit.x,hit.z,hit.y)?hit:null
}
type Entry={id:string;type:WorldCandidate['type'];position:Vector3;tags:string[];affordances:string[]}
function entries():Entry[]{return [
 ...TREES.map(([x,z],i)=>({id:`tree-${i+1}`,type:'tree' as const,position:new Vector3(x,surfaceHeight(x,z),z),tags:['tree','나무'],affordances:['approach','look_at','inspect']})),
 ...WORLD_SEATS.map(seat=>({id:`bench-${seat.id}`,type:'bench' as const,position:seatApproach(seat),tags:['bench','seat','벤치','의자'],affordances:['approach','sit','inspect']})),
 ...FLOWERS.map(([x,z],i)=>({id:`flower-${i+1}`,type:'flower' as const,position:new Vector3(x,surfaceHeight(x,z),z),tags:['flower','꽃'],affordances:['approach','look_at','inspect']})),
 ...WORLD_V3_LANDMARKS.map(landmark=>({id:landmark.id,type:(landmark.kind==='old-bridge'?'bridge':'landmark') as WorldCandidate['type'],position:new Vector3(landmark.approach[0],surfaceHeight(landmark.approach[0],landmark.approach[1]),landmark.approach[1]),tags:[...landmark.tags],affordances:['approach','look_at','inspect']})),
 {id:'MoonLakeViewpoint',type:'water',position:new Vector3(streamCenter(42)+streamWidth(42)+2.2,surfaceHeight(streamCenter(42)+streamWidth(42)+2.2,42),42),tags:['lake','water','호수','물가'],affordances:['approach','look_at']},
 {id:'house',type:'house',position:new Vector3(HOME.x,0,HOME.z),tags:['house','home','집'],affordances:['approach','look_at']},
 ]}
export function worldTarget(id:string,player:Player){
 if(id==='ORIGIN')return null
 if(id==='DEICTIC_POINT')return getDeicticPoint()
 if(id==='AHEAD_POINT'){const forward=new Vector3(0,0,1).applyQuaternion(player.rotation);return safeGround(player.position.clone().addScaledVector(forward,5))}
 return entries().find(entry=>entry.id===id)?.position.clone()??null
}
export function perceiveWorld(player:Player,camera:Camera):WorldPerception{
 const view=new Vector3();camera.getWorldDirection(view);view.y=0;view.normalize()
 const candidates=entries().map(entry=>{const delta=entry.position.clone().sub(player.position),distance=Math.hypot(delta.x,delta.z),direction=delta.clone().setY(0).normalize(),visible=view.dot(direction)>.05
  return {id:entry.id,type:entry.type,position:{x:+entry.position.x.toFixed(2),z:+entry.position.z.toFixed(2)},tags:entry.tags,affordances:entry.affordances,distance:+distance.toFixed(2),visible}})
  .sort((a,b)=>Number(b.visible)-Number(a.visible)||a.distance-b.distance).slice(0,12)
 if(tapped)candidates.unshift({id:'DEICTIC_POINT',type:'ground',position:{x:+tapped.x.toFixed(2),z:+tapped.z.toFixed(2)},tags:['there','저기','선택 지점'],affordances:['approach'],distance:+tapped.distanceTo(player.position).toFixed(2),visible:true})
 return {candidates:candidates.slice(0,12),deicticTarget:tapped?'DEICTIC_POINT':null}
}
export const normalizedPointer=(x:number,y:number,rect:DOMRect)=>new Vector2((x-rect.left)/rect.width*2-1,-((y-rect.top)/rect.height)*2+1)
