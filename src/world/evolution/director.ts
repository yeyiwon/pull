import type { EnvironmentEntry, Season } from '../../environment/registry.ts'
import { WORLD_OBSTACLES } from '../collision.ts'
import { HOME, RING } from '../worldLayout.ts'
import { BRIDGE, streamCenter, streamWidth } from '../terrain.ts'
import type { Journal } from '../brain/interests.ts'
export const SEMANTICS=['FLOWER','PLANT','STONE','SOFT_LIGHT'] as const
export const AREAS=['MEADOW_WEST','MEADOW_EAST'] as const
export type Semantic=typeof SEMANTICS[number]
export type Area=typeof AREAS[number]
export type Lifetime='TEMPORARY'|'SEASONAL'|'PERSISTENT'
export type Idea={id:string;sourceResearch:string;topic:string;concept:string;association:string|null;evidence:'MODEL_KNOWLEDGE'|'MOCK';kind:'IDEA'}
export type Proposal={id:string;idea:Idea;semantic:Semantic;area:Area;scale:'MICRO';season:Season;reversible:true;lifetime:Lifetime}
export type Placement={assetId:string;slot:string;position:[number,number,number];rotation:[number,number,number];scale:number;radius:number}
export type Decision={status:'WAITING_FOR_ASSET'|'REJECTED'|'ACCEPTED';reason:string;placement:Placement|null}
export const SLOTS:{id:string;area:Area;x:number;z:number}[]=[{id:'west-1',area:'MEADOW_WEST',x:-37,z:17},{id:'west-2',area:'MEADOW_WEST',x:-40,z:23},{id:'east-1',area:'MEADOW_EAST',x:38,z:10},{id:'east-2',area:'MEADOW_EAST',x:42,z:17}]
const seasons=['spring','summer','autumn','winter']
const record=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('shape');return v as Record<string,unknown>}
const text=(v:unknown,max=180)=>{if(typeof v!=='string'||!v.trim()||v.length>max||/[<>\r\n]/.test(v))throw Error('text');return v.trim()}
export function parseProposal(raw:unknown):Proposal{
 const p=record(raw),i=record(p.idea)
 if(Object.keys(p).some(k=>!['id','idea','semantic','area','scale','season','reversible','lifetime'].includes(k))||Object.keys(i).some(k=>!['id','sourceResearch','topic','concept','association','evidence','kind'].includes(k)))throw Error('fields')
 if(p.scale!=='MICRO'||p.reversible!==true||!SEMANTICS.includes(p.semantic as Semantic)||!AREAS.includes(p.area as Area)||!seasons.includes(String(p.season))||!['TEMPORARY','SEASONAL','PERSISTENT'].includes(String(p.lifetime))||i.kind!=='IDEA'||!['MODEL_KNOWLEDGE','MOCK'].includes(String(i.evidence)))throw Error('policy')
 return {id:text(p.id),idea:{id:text(i.id),sourceResearch:text(i.sourceResearch),topic:text(i.topic),concept:text(i.concept),association:i.association==null?null:text(i.association),evidence:i.evidence as Idea['evidence'],kind:'IDEA'},semantic:p.semantic as Semantic,area:p.area as Area,scale:'MICRO',season:p.season as Season,reversible:true,lifetime:p.lifetime as Lifetime}
}
export function ideaFrom(j:Journal):Idea|null{
 const r=j.research
 if(r?.status!=='COMPLETE'||!r.result?.ideas.length||!r.provider)return null
 return {id:`idea:${j.topic}:${r.completedAt}`,sourceResearch:`research:${j.topic}:${r.completedAt}`,topic:j.topic,concept:r.result.ideas[0],association:r.result.associations[0]?.connection??null,evidence:r.provider==='REAL'?'MODEL_KNOWLEDGE':'MOCK',kind:'IDEA'}
}
export function propose(idea:Idea,season:Season):Proposal{
 const semantic:Semantic=idea.topic==='reflection'?'SOFT_LIGHT':idea.topic==='snow'?'STONE':'PLANT'
 return parseProposal({id:`proposal:${idea.id}`,idea,semantic,area:semantic==='SOFT_LIGHT'?'MEADOW_EAST':'MEADOW_WEST',scale:'MICRO',season,reversible:true,lifetime:'SEASONAL'})
}
export function protectedPoint(x:number,z:number,radius:number){
 if(![x,z,radius].every(Number.isFinite)||radius<=0||Math.abs(x)>60||Math.abs(z)>60)return true
 // Conservative exclusion preserves the hero view, complete river corridor and bridge approaches.
 if(Math.abs(x)<25&&z<12&&z>-75)return true
 if(Math.abs(x-streamCenter(z))<streamWidth(z)+radius+5)return true
 if(Math.abs(z-BRIDGE.z)<BRIDGE.halfWidth+radius+5&&Math.abs(x-streamCenter(BRIDGE.z))<BRIDGE.halfLength+radius+8)return true
 if(Math.hypot(x-HOME.x,z-HOME.z)<12+radius||Math.hypot(x-RING.x,z-RING.z)<16+radius)return true
 return WORLD_OBSTACLES.some(o=>Math.hypot(x-o.x,z-o.z)<Math.max(o.rx,o.rz)+radius+2)
}
export function direct(proposal:unknown,entries:EnvironmentEntry[],season:Season,occupied:Placement[]):Decision{
 let p:Proposal;try{p=parseProposal(proposal)}catch{return {status:'REJECTED',reason:'INVALID_PROPOSAL',placement:null}}
 const reject=(reason:string):Decision=>({status:'REJECTED',reason,placement:null})
 if(p.season!==season)return reject('SEASON_MISMATCH')
 if(occupied.length>=3)return reject('GLOBAL_DENSITY')
 const candidates=entries.filter(e=>e.autonomy?.approved&&e.placementType==='catalog'&&['rock','vegetation','prop'].includes(e.category)&&e.season.includes(season)&&e.autonomy.semantics.includes(p.semantic)&&e.autonomy.areas.includes(p.area)).sort((a,b)=>a.id.localeCompare(b.id))
 if(!candidates.length)return {status:'WAITING_FOR_ASSET',reason:'NO_APPROVED_PRODUCTION_ASSET',placement:null}
 for(const entry of candidates){
  const a=entry.autonomy!,scale=entry.scaleRange[0],radius=a.radius*scale
  if(radius>.9||a.height*scale>1.8)continue
  for(const slot of SLOTS.filter(s=>s.area===p.area)){
   if(entries.some(e=>e.placementType==='manual'&&e.placements.some(p=>Math.hypot(p.position[0]-slot.x,p.position[2]-slot.z)<10*Math.max(1,p.scale)+radius)))continue
   if(protectedPoint(slot.x,slot.z,radius)||occupied.some(o=>Math.hypot(o.position[0]-slot.x,o.position[2]-slot.z)<Math.max(5,o.radius+radius+2)))continue
   return {status:'ACCEPTED',reason:'APPROVED_MICRO',placement:{assetId:entry.id,slot:slot.id,position:[slot.x,-a.groundOffset*scale,slot.z],rotation:[0,0,0],scale,radius}}
  }
 }
 return reject('COMPOSITION_OR_MICRO_BOUNDS')
}
