export type LostSeedsStatus='AVAILABLE'|'ACTIVE'|'RETURN'|'COMPLETE'
export type AliveWorldState={version:1;updatedAt:number;lostSeeds:{status:LostSeedsStatus;collected:string[];completedAt:number|null}}
export type AliveWorldRuntime={nearNpc:boolean;nearCollectible:boolean;npcOpen:boolean;npcAction:NpcAction;notice:string|null}
export type NpcAction='WALK'|'RUN'|'LOOK'|'INSPECT'|'REACT'|'WAVE'|'CARRY'|'PLACE'|'IDLE'
export const aliveNpcPosition={x:0,y:0,z:0}
export const ALIVE_WORLD_KEY='pull.world.alive.v1'
// Hooks only: content stays disabled until Rainy Day and Night Light are separately approved.
export const FUTURE_PLAY_EVENT_HOOKS={RAINY_DAY:{trigger:'RAIN',enabled:false},NIGHT_LIGHT:{trigger:'NIGHT',enabled:false}} as const
export const emptyAliveWorld=(now=Date.now()):AliveWorldState=>({version:1,updatedAt:now,lostSeeds:{status:'AVAILABLE',collected:[],completedAt:null}})
export function readAliveWorld(raw:string|null,now=Date.now()):AliveWorldState{
 const fresh=emptyAliveWorld(now)
 try{const value=JSON.parse(raw??'null') as Partial<AliveWorldState>,mission=value.lostSeeds;if(value.version!==1||!mission)return fresh
  const status=['AVAILABLE','ACTIVE','RETURN','COMPLETE'].includes(mission.status)?mission.status:fresh.lostSeeds.status
  return {...fresh,updatedAt:Number.isFinite(value.updatedAt)?Math.min(now,value.updatedAt!):now,lostSeeds:{status,collected:Array.isArray(mission.collected)?[...new Set(mission.collected.filter(id=>/^lost-seed-[1-3]$/.test(id)))].slice(0,3):[],completedAt:Number.isFinite(mission.completedAt)?mission.completedAt:null}}
 }catch{return fresh}
}
let storage:Storage|null=null,state=emptyAliveWorld(),runtime:AliveWorldRuntime={nearNpc:false,nearCollectible:false,npcOpen:false,npcAction:'IDLE',notice:null}
const listeners=new Set<()=>void>()
try{storage=localStorage;state=readAliveWorld(storage.getItem(ALIVE_WORLD_KEY))}catch{/* optional */}
function notify(){listeners.forEach(fn=>fn())}
function save(){state={...state,updatedAt:Date.now()};try{storage?.setItem(ALIVE_WORLD_KEY,JSON.stringify(state))}catch{/* optional */}notify()}
export const aliveWorldStore={
 subscribe(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn)}},getSnapshot:()=>state,getRuntime:()=>runtime,
 setRuntime(patch:Partial<AliveWorldRuntime>){const next={...runtime,...patch};if(next.nearNpc===runtime.nearNpc&&next.nearCollectible===runtime.nearCollectible&&next.npcOpen===runtime.npcOpen&&next.npcAction===runtime.npcAction&&next.notice===runtime.notice)return;runtime=next;state={...state};notify()},
 begin(){if(state.lostSeeds.status!=='AVAILABLE')return;state={...state,lostSeeds:{...state.lostSeeds,status:'ACTIVE'}};save()},
 collect(id:string){if(state.lostSeeds.status!=='ACTIVE'||!/^lost-seed-[1-3]$/.test(id)||state.lostSeeds.collected.includes(id))return false;const collected=[...state.lostSeeds.collected,id],status=collected.length===3?'RETURN':'ACTIVE';state={...state,lostSeeds:{...state.lostSeeds,collected,status}};save();return true},
 complete(){if(state.lostSeeds.status!=='RETURN')return false;state={...state,lostSeeds:{...state.lostSeeds,status:'COMPLETE',completedAt:Date.now()}};save();return true},
 reset(){state=emptyAliveWorld();runtime={nearNpc:false,nearCollectible:false,npcOpen:false,npcAction:'IDLE',notice:null};save()},
}
