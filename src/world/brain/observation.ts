import type { Player } from '../locomotion.ts'
import { worldTime } from '../worldTime.ts'
import { livingWorld, skyEventAt, fantasyEventAt } from '../livingWorld.ts'
import { canonicalWeather, WEATHER_LOOK } from '../weatherPresentation.ts'
import { homeState } from '../homeSpace.ts'
import { streamCenter, streamWidth } from '../terrain.ts'
import type { Observation } from './types.ts'
const movementKeys=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'])
export function userControlsMoru(p:Player){return [...p.keys].some(k=>movementKeys.has(k))||Math.hypot(p.touchX,p.touchZ)>.05||p.jumpRequested||!p.isGrounded}
export function observeWorld(p:Player,context:{idle:number;interacted:boolean;returned:boolean;actions:string[];speech:string[]}):Observation{
 const nearWater=Math.abs(p.position.x-streamCenter(p.position.z))<streamWidth(p.position.z)+2
 const d=worldTime.canonical
 // Presentation overrides and their lingering shader fade never become remembered events.
 const night=d.hour>=21||d.hour<5
 const sky=skyEventAt(d.date,d.season,night?1:0,livingWorld.brain.mystery)
 const event=fantasyEventAt(d.date,d.season,night,livingWorld.brain.curiosity)
 const skyEvent=night&&sky.aurora?'aurora':night&&sky.shootingStar?'shootingStar':event==='meteorShower'||event==='giantMoon'||event==='glowingClouds'?event:null
 return {date:`${d.year}-${d.month}-${d.day}`,hour:d.hour+d.minute/60,timeOfDay:d.timeOfDay,season:d.season,
  weather:canonicalWeather(),wind:WEATHER_LOOK[canonicalWeather()].wind,location:homeState.inside?'home':nearWater?'water':'field',indoor:homeState.inside,nearWater,
  skyEvent,userMoving:userControlsMoru(p)||p.groundState!=='IDLE',userIdleDuration:context.idle,userInteracted:context.interacted,userReturned:context.returned,
  actionBusy:p.state!=='IDLE'||!!p.actionRequested||p.listenRequested,grounded:p.isGrounded,recentMoruActions:context.actions,recentSpeech:context.speech}
}
