import { TOPICS, FASCINATION_MS } from '../brain/interests.ts'
import type { Interests, Topic } from '../brain/interests.ts'
import type { Evolution } from './history.ts'
export const OFFLINE_KINDS=['FASCINATION_CONTINUED','ASSOCIATION_REVISITED','IDEA_REVISITED'] as const
export type OfflineEvent={kind:typeof OFFLINE_KINDS[number];topic:Topic;basis:'ELAPSED_TIME_SIMULATION'}
export type OfflineLife={lastSeenAt:number|null;processedThrough:number;events:OfflineEvent[];absence:'NONE'|'HOURS'|'DAYS'|'LONG'}
export const emptyOffline=():OfflineLife=>({lastSeenAt:null,processedThrough:0,events:[],absence:'NONE'})
export function readOffline(raw:unknown):OfflineLife{
 const r=raw&&typeof raw==='object'?raw as Record<string,unknown>:{}
 const n=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:0
 return {lastSeenAt:typeof r.lastSeenAt==='number'&&Number.isFinite(r.lastSeenAt)&&r.lastSeenAt>=0?r.lastSeenAt:null,processedThrough:n(r.processedThrough),absence:['HOURS','DAYS','LONG'].includes(String(r.absence))?r.absence as OfflineLife['absence']:'NONE',events:Array.isArray(r.events)?r.events.slice(-3).flatMap(e=>e&&OFFLINE_KINDS.includes(e.kind)&&TOPICS.includes(e.topic)&&e.basis==='ELAPSED_TIME_SIMULATION'?[{kind:e.kind,topic:e.topic,basis:'ELAPSED_TIME_SIMULATION' as const}]:[]):[]}
}
// Runs once on return, not at invented background timestamps. It never performs research or observes weather.
export function simulateOffline(data:OfflineLife,interests:Interests,now:number){
 if(!Number.isFinite(now)||now<0)return
 const previous=data.lastSeenAt
 data.lastSeenAt=now
 if(previous===null||now<=previous||now<=data.processedThrough)return
 data.processedThrough=now
 const hours=Math.min(24*30,(now-previous)/3600000)
 if(hours<3)return
 data.events=[];data.absence='NONE'
 data.absence=hours>=24*7?'LONG':hours>=24?'DAYS':'HOURS'
 const f=interests.fascination,j=interests.journal.find(j=>j.topic===f?.topic)
 if(!f||!j)return // Nothing happened is a valid outcome.
 // Short returns can be quiet. Long returns get a compact, capped continuation, never hours of fabricated events.
 if(hours<24&&Math.floor(previous/3600000)%2===0)return
 data.events.push({kind:'FASCINATION_CONTINUED',topic:f.topic,basis:'ELAPSED_TIME_SIMULATION'})
 if(now>=f.until){f.since=now;f.until=now+FASCINATION_MS}
 if(hours>=24&&j.research?.provider==='REAL'&&j.research.status==='COMPLETE'){
  if(j.research.result?.associations.length)data.events.push({kind:'ASSOCIATION_REVISITED',topic:f.topic,basis:'ELAPSED_TIME_SIMULATION'})
  if(hours>=72&&j.research.result?.ideas.length)data.events.push({kind:'IDEA_REVISITED',topic:f.topic,basis:'ELAPSED_TIME_SIMULATION'})
 }
}
export type Continuity={meaningfulOfflineEvents:OfflineEvent[];worldHistory:{topic:Topic;status:'WAITING_FOR_ASSET'|'APPLIED'|'REMOVED'|'EXPIRED'}[]}
export const continuityQuestion=(text:string)=>/없을 때|없는 동안|뭐했|뭐 했|바꿨|만들었|달라졌/.test(text)
export function continuitySummary(offline:OfflineLife,evolution:Evolution):Continuity{
 return {meaningfulOfflineEvents:offline.events.slice(-3),worldHistory:evolution.history.filter(h=>TOPICS.includes(h.proposal.idea.topic as Topic)&&h.provenance==='MORU'&&h.proposal.idea.evidence==='MODEL_KNOWLEDGE'&&(h.status==='WAITING_FOR_ASSET'||h.appliedAt!==null)).slice(-3).map(h=>({topic:h.proposal.idea.topic as Topic,status:h.status==='WAITING_FOR_ASSET'?'WAITING_FOR_ASSET':h.status==='REMOVED'?'REMOVED':h.status==='EXPIRED'?'EXPIRED':'APPLIED'}))}
}
export function parseContinuity(raw:unknown):Continuity{
 const r=raw&&typeof raw==='object'?raw as Record<string,unknown>:{}
 const events=readOffline({events:r.meaningfulOfflineEvents}).events
 const worldHistory:Continuity['worldHistory']=Array.isArray(r.worldHistory)?r.worldHistory.slice(-3).flatMap(h=>h&&TOPICS.includes(h.topic)&&['WAITING_FOR_ASSET','APPLIED','REMOVED','EXPIRED'].includes(h.status)?[{topic:h.topic,status:h.status}]:[]):[]
 return {meaningfulOfflineEvents:events,worldHistory}
}
