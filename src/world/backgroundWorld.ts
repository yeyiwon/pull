import { seasonAt,type Season } from './realWorld.ts'
import { WORLD_EVENTS,eventDefinition,type WorldEventId,type WorldEventSignificance } from './worldEvents.ts'
import { WORLD_V3_LANDMARKS } from './worldV3.ts'

export type BackgroundEvent={id:WorldEventId;startedAt:number;endsAt:number;significance:WorldEventSignificance;location:string|null}
export type BackgroundMemory={kind:'EVENT'|'DISCOVERY';id:string;at:number;location:string|null}
export type NotificationCandidate={eventId:WorldEventId;eventType:string;worldTimestamp:number;landmark:string|null;significance:'HIGH'|'VERY_HIGH'}
export type PersistentWorldState={version:1;updatedAt:number;season:Season;worldTime:number;weather:string;activeEvents:BackgroundEvent[];moruLocation:string;moruState:'QUIET'|'OBSERVING'|'RESTING';moruGoal:string|null;discoveries:Record<string,'discovered'|'familiar'>;recentSignificantEvents:BackgroundMemory[];lastNotificationAt:number;notificationsToday:{day:string;count:number};lastNotifiedEvent:string|null;manual:{season:boolean;time:boolean;weather:boolean;events:boolean}}
export const BACKGROUND_WORLD_KEY='pull.world.background.v1'
const day=(time:number)=>new Date(time).toISOString().slice(0,10)
const significance=(value:WorldEventSignificance)=>value==='VERY_HIGH'?4:value==='HIGH'?3:value==='MEDIUM'?2:1
const hash=(slot:number,salt:number)=>Math.abs(Math.sin(slot*12.9898+salt*78.233)*43758.5453)%1
const landmarkIds=new Set(WORLD_V3_LANDMARKS.map(item=>item.id))
export const emptyPersistentWorld=(now=Date.now()):PersistentWorldState=>({version:1,updatedAt:now,season:'spring',worldTime:new Date(now).getHours(),weather:'clear',activeEvents:[],moruLocation:'home',moruState:'QUIET',moruGoal:null,discoveries:{},recentSignificantEvents:[],lastNotificationAt:0,notificationsToday:{day:day(now),count:0},lastNotifiedEvent:null,manual:{season:false,time:false,weather:false,events:false}})
export function readPersistentWorld(raw:string|null,now=Date.now()):PersistentWorldState{
 const fresh=emptyPersistentWorld(now)
 try{const value=JSON.parse(raw??'null') as Partial<PersistentWorldState>;if(value.version!==1)return fresh
  return {...fresh,...value,updatedAt:Number.isFinite(value.updatedAt)?Math.min(now,Math.max(0,value.updatedAt!)):now,season:['spring','summer','autumn','winter'].includes(String(value.season))?value.season!:fresh.season,activeEvents:Array.isArray(value.activeEvents)?value.activeEvents.filter(e=>e&&WORLD_EVENTS.some(d=>d.id===e.id)&&Number.isFinite(e.endsAt)).slice(-3):[],moruLocation:landmarkIds.has(String(value.moruLocation))||value.moruLocation==='home'?String(value.moruLocation):'home',recentSignificantEvents:Array.isArray(value.recentSignificantEvents)?value.recentSignificantEvents.slice(-12):[],discoveries:value.discoveries&&typeof value.discoveries==='object'?value.discoveries:{},manual:{...fresh.manual,...value.manual}}
 }catch{return fresh}
}
function eligible(state:PersistentWorldState,time:number){const date=new Date(time),hour=date.getHours(),night=hour>=20||hour<5
 return WORLD_EVENTS.filter(event=>event.id!=='CLEAR'&&event.id!=='WINTER_ILLUMINATION'&&event.seasons.includes(state.season)&&(event.time==='ANY'||(event.time==='NIGHT')===night)&&time-(state.recentSignificantEvents.findLast(item=>item.id===event.id)?.at??-Infinity)>=event.cooldown*1000)
}
function scheduledEvent(state:PersistentWorldState,time:number){const slot=Math.floor(time/600000),roll=hash(slot,state.season.length);if(roll>.1)return null;const list=eligible(state,time),total=list.reduce((sum,event)=>sum+event.rarity,0);let cursor=hash(slot,17)*total;for(const event of list){cursor-=event.rarity;if(cursor<=0)return event}return null}
function notificationFor(state:PersistentWorldState,event:BackgroundEvent,now:number):NotificationCandidate|null{
 if(significance(event.significance)<3||now-state.lastNotificationAt<4*3600000||state.lastNotifiedEvent===event.id)return null
 const today=day(now),count=state.notificationsToday.day===today?state.notificationsToday.count:0;if(count>=2)return null
 return {eventId:event.id,eventType:eventDefinition(event.id).label,worldTimestamp:event.startedAt,landmark:event.location,significance:event.significance as 'HIGH'|'VERY_HIGH'}
}
export type BackgroundSimulation={state:PersistentWorldState;candidate:NotificationCandidate|null;memories:BackgroundMemory[];steps:number}
type EventChooser=(state:PersistentWorldState,time:number)=>ReturnType<typeof scheduledEvent>
export function simulateBackground(input:PersistentWorldState,until:number,chooseEvent:EventChooser=scheduledEvent):BackgroundSimulation{
 const state=structuredClone(input),start=Math.min(until,Math.max(0,state.updatedAt)),memories:BackgroundMemory[]=[];let candidate:NotificationCandidate|null=null,steps=0
 for(let time=Math.floor(start/600000)*600000+600000;time<=until&&steps<1008;time+=600000){steps++;if(!state.manual.time)state.worldTime=new Date(time).getHours()+new Date(time).getMinutes()/60;if(!state.manual.season)state.season=seasonAt(new Date(time)).season;if(!state.manual.events)state.activeEvents=state.activeEvents.filter(event=>event.endsAt>time);if(!state.manual.weather&&!state.activeEvents.length)state.weather='clear'
  if(!state.manual.events&&!state.activeEvents.length){const definition=chooseEvent(state,time);if(definition){const event={id:definition.id,startedAt:time,endsAt:time+definition.duration*1000,significance:definition.significance,location:definition.location};state.activeEvents=[event];if(!state.manual.weather){if(['RAIN','HEAVY_RAIN','THUNDERSTORM'].includes(definition.id))state.weather=definition.id==='THUNDERSTORM'?'storm':'rain';if(['SNOW','HEAVY_SNOW','DIAMOND_DUST'].includes(definition.id))state.weather='snow';if(definition.id==='FOG')state.weather='fog'}
   const firstSnow=definition.id==='SNOW'&&!state.recentSignificantEvents.some(item=>item.id==='SNOW'||item.id==='HEAVY_SNOW'),meaningful=significance(definition.significance)>=3||firstSnow
   if(meaningful){const remembered={...event,significance:firstSnow?'HIGH' as const:event.significance},memory={kind:'EVENT' as const,id:definition.id,at:time,location:definition.location};memories.push(memory);state.recentSignificantEvents.push(memory);const next=notificationFor(state,remembered,time);if(next&&(!candidate||significance(next.significance)>significance(candidate.significance)))candidate=next}
   if(definition.location&&landmarkIds.has(definition.location)){state.moruLocation=definition.location;state.moruState='OBSERVING';state.moruGoal=`observe:${definition.id}`;if(!state.discoveries[definition.location]){state.discoveries[definition.location]='discovered';const memory={kind:'DISCOVERY' as const,id:definition.location,at:time,location:definition.location};memories.push(memory);state.recentSignificantEvents.push(memory)}}
  }}else if(!state.activeEvents.length){state.moruState=hash(Math.floor(time/600000),3)>.72?'RESTING':'QUIET';state.moruGoal=null}
 }
 if(!state.manual.events)state.activeEvents=state.activeEvents.filter(event=>event.endsAt>until);if(candidate&&!state.activeEvents.some(event=>event.id===candidate!.eventId&&event.endsAt>until))candidate=null;state.updatedAt=until;state.recentSignificantEvents=state.recentSignificantEvents.slice(-12)
 return {state,candidate,memories,steps}
}

export const backgroundDiagnostics={simulations:0,candidateNotifications:0,realCalls:0,notificationsSent:0,lastElapsedMinutes:0,lastCandidate:null as NotificationCandidate|null,lastMemories:[] as BackgroundMemory[]}
export function createBackgroundWorldStore(storage:Pick<Storage,'getItem'|'setItem'>|null,now=()=>Date.now()){
 let state=readPersistentWorld(storage?.getItem(BACKGROUND_WORLD_KEY)??null,now())
 const save=()=>{try{storage?.setItem(BACKGROUND_WORLD_KEY,JSON.stringify(state))}catch{/* persistence is optional */}}
 const capture=(patch:Partial<PersistentWorldState>)=>{state={...state,...patch,updatedAt:now()};save()}
 const reconcile=(at=now())=>{const elapsed=Math.max(0,at-state.updatedAt),result=simulateBackground(state,at);state=result.state;save();backgroundDiagnostics.simulations++;backgroundDiagnostics.candidateNotifications+=result.candidate?1:0;backgroundDiagnostics.lastElapsedMinutes=Math.round(elapsed/60000);backgroundDiagnostics.lastCandidate=result.candidate;backgroundDiagnostics.lastMemories=result.memories;return result}
 const simulate=(milliseconds:number)=>{const result=simulateBackground(state,state.updatedAt+Math.max(0,milliseconds));state=result.state;save();backgroundDiagnostics.simulations++;backgroundDiagnostics.candidateNotifications+=result.candidate?1:0;backgroundDiagnostics.lastElapsedMinutes=Math.round(milliseconds/60000);backgroundDiagnostics.lastCandidate=result.candidate;backgroundDiagnostics.lastMemories=result.memories;return result}
 const markNotificationSent=(candidate:NotificationCandidate,at=now())=>{const today=day(at),count=state.notificationsToday.day===today?state.notificationsToday.count:0;state.lastNotificationAt=at;state.lastNotifiedEvent=candidate.eventId;state.notificationsToday={day:today,count:count+1};save();backgroundDiagnostics.notificationsSent++}
 const replace=(next:PersistentWorldState)=>{state=structuredClone(next);save()}
 return {get state(){return state},capture,reconcile,simulate,markNotificationSent,replace,save}
}
let backgroundSession:ReturnType<typeof createBackgroundWorldStore>|null=null
export function getBackgroundWorld(){if(!backgroundSession){let storage:null|Storage=null;try{storage=localStorage}catch{/* optional */}backgroundSession=createBackgroundWorldStore(storage)}return backgroundSession}
