import type { Player } from '../locomotion.ts'
import { worldTime } from '../worldTime.ts'
import { livingWorld } from '../livingWorld.ts'
import { environmentState as env } from '../environmentState.ts'
import { homeState } from '../homeSpace.ts'
import { streamCenter, streamWidth } from '../terrain.ts'
import type { Observation } from './types.ts'
const movementKeys=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'])
export function userControlsMoru(p:Player){return [...p.keys].some(k=>movementKeys.has(k))||Math.hypot(p.touchX,p.touchZ)>.05||p.jumpRequested||!p.isGrounded}
export function observeWorld(p:Player,context:{idle:number;interacted:boolean;returned:boolean;actions:string[];speech:string[]}):Observation{
 const nearWater=Math.abs(p.position.x-streamCenter(p.position.z))<streamWidth(p.position.z)+2
 const d=worldTime.realWorld
 const skyEvent=env.aurora>.2?'aurora':env.meteorShower>.2?'meteorShower':env.meteor>.2?'shootingStar':env.rainbow>.2?'rainbow':env.moonSize>1.2?'giantMoon':env.cloudGlow>.2?'glowingClouds':null
 return {date:`${d.year}-${d.month}-${d.day}`,hour:worldTime.current.hour,timeOfDay:worldTime.current.phase,season:d.season,
  weather:livingWorld.weather?.type??'clear',wind:env.wind,location:homeState.inside?'home':nearWater?'water':'field',indoor:homeState.inside,nearWater,
  skyEvent,userMoving:userControlsMoru(p)||p.groundState!=='IDLE',userIdleDuration:context.idle,userInteracted:context.interacted,userReturned:context.returned,
  actionBusy:p.state!=='IDLE'||!!p.actionRequested||p.listenRequested,grounded:p.isGrounded,recentMoruActions:context.actions,recentSpeech:context.speech}
}
