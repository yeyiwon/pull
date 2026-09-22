import { direct, parseProposal, SLOTS } from './director.ts'
import type { Proposal, Placement } from './director.ts'
import type { EnvironmentEntry, Season } from '../../environment/registry.ts'
export type Provenance='NATURE'|'MORU'|'USER'|'SHARED'
export type ChangeStatus='WAITING_FOR_ASSET'|'REJECTED'|'PENDING'|'ACTIVE'|'EXPIRED'|'REMOVED'
export type WorldChange={id:string;proposal:Proposal;provenance:Provenance;createdAt:number;appliedAt:number|null;expiresAt:number|null;status:ChangeStatus;reason:string;placement:Placement|null}
export type Evolution={history:WorldChange[];lastCreatedAt:number}
export const emptyEvolution=():Evolution=>({history:[],lastCreatedAt:0})
export const CHANGE_COOLDOWN=24*60*60*1000
const num=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:0
export function readEvolution(raw:unknown):Evolution{
 const e=raw&&typeof raw==='object'?raw as Record<string,unknown>:{}
 const result:Evolution={history:[],lastCreatedAt:num(e.lastCreatedAt)}
 if(!Array.isArray(e.history))return result
 for(const raw of e.history.slice(0,32))try{
  if(!raw||typeof raw!=='object')continue
  const r=raw as Record<string,unknown>,proposal=parseProposal(r.proposal),id=`change:${proposal.id}`
  if(r.id!==id||result.history.some(h=>h.id===id)||!['NATURE','MORU','USER','SHARED'].includes(String(r.provenance))||!['WAITING_FOR_ASSET','REJECTED','PENDING','ACTIVE','EXPIRED','REMOVED'].includes(String(r.status)))continue
  const p=r.placement as Placement|null
  const placement=p&&typeof p.assetId==='string'&&p.assetId.length<100&&SLOTS.some(s=>s.id===p.slot)&&Array.isArray(p.position)&&p.position.length===3&&p.position.every(Number.isFinite)&&Array.isArray(p.rotation)&&p.rotation.length===3&&p.rotation.every(Number.isFinite)&&Number.isFinite(p.scale)&&p.scale>0&&Number.isFinite(p.radius)&&p.radius>0?{assetId:p.assetId,slot:p.slot,position:[...p.position] as Placement['position'],rotation:[...p.rotation] as Placement['rotation'],scale:p.scale,radius:p.radius}:null
  result.history.push({id,proposal,provenance:r.provenance as Provenance,createdAt:num(r.createdAt),appliedAt:r.appliedAt==null?null:num(r.appliedAt),expiresAt:r.expiresAt==null?null:num(r.expiresAt),status:r.status as ChangeStatus,reason:typeof r.reason==='string'?r.reason.slice(0,80):'RESTORED',placement})
 }catch{/* Ignore invalid save data; never execute it. */}
 return result
}
const occupied=(data:Evolution,except?:string)=>data.history.filter(h=>h.id!==except&&(h.status==='PENDING'||h.status==='ACTIVE')&&h.placement).map(h=>h.placement!)
export function consider(data:Evolution,proposal:Proposal,entries:EnvironmentEntry[],season:Season,now:number,allowApply=true):WorldChange|null{
 const p=parseProposal(proposal),id=`change:${p.id}`
 let h=data.history.find(h=>h.id===id)
 if(h&&h.status!=='WAITING_FOR_ASSET')return h
 if(!h){if(data.history.length>=32)return null;h={id,proposal:p,provenance:'MORU',createdAt:now,appliedAt:null,expiresAt:null,status:'WAITING_FOR_ASSET',reason:'PENDING_DIRECTOR',placement:null};data.history.push(h)}
 const d=direct(p,entries,season,occupied(data))
 if(d.status!=='ACCEPTED'){h.status=d.status;h.reason=d.reason;return h}
 if(!allowApply||p.idea.evidence==='MOCK'){h.reason='SIMULATION_ONLY';return h}
 if(data.lastCreatedAt&&now-data.lastCreatedAt<CHANGE_COOLDOWN){h.reason='CHANGE_COOLDOWN';return h}
 h.placement=d.placement;h.status='PENDING';h.reason='AWAITING_ASSET_RENDER';data.lastCreatedAt=now
 if(p.lifetime==='TEMPORARY')h.expiresAt=now+CHANGE_COOLDOWN
 return h
}
export function rendered(data:Evolution,id:string,now:number){const h=data.history.find(h=>h.id===id);if(h?.status==='PENDING'){h.status='ACTIVE';h.appliedAt??=now;h.reason='RENDERED';return true}return false}
export function failAsset(data:Evolution,id:string){const h=data.history.find(h=>h.id===id);if(h&&(h.status==='PENDING'||h.status==='ACTIVE')){h.status='REJECTED';h.reason='ASSET_LOAD_FAILED';return true}return false}
export function removeChange(data:Evolution,id:string){const h=data.history.find(h=>h.id===id);if(h&&['PENDING','ACTIVE','WAITING_FOR_ASSET'].includes(h.status)){h.status='REMOVED';h.reason='REVERSIBLE_REMOVAL';return true}return false}
export function expireChanges(data:Evolution,season:Season,now:number){let changed=false
 for(const h of data.history)if(['PENDING','ACTIVE','WAITING_FOR_ASSET'].includes(h.status)&&((h.expiresAt!==null&&now>=h.expiresAt)||(h.proposal.lifetime==='SEASONAL'&&h.proposal.season!==season))){h.status='EXPIRED';h.reason='LIFETIME_ENDED';changed=true}
 return changed
}
// Re-resolve on every restore, ignoring saved transforms/paths. Density order is stable by history order.
export function renderableChanges(data:Evolution,entries:EnvironmentEntry[],season:Season,now:number){
 const occupied:Placement[]=[],result:{change:WorldChange;entry:EnvironmentEntry;placement:Placement}[]=[]
 for(const change of data.history){
  if(change.provenance!=='MORU'||change.proposal.idea.evidence!=='MODEL_KNOWLEDGE'||!['PENDING','ACTIVE'].includes(change.status)||change.expiresAt!==null&&now>=change.expiresAt||change.proposal.lifetime==='SEASONAL'&&change.proposal.season!==season)continue
  const decision=direct(change.proposal.lifetime==='PERSISTENT'?{...change.proposal,season}:change.proposal,entries,season,occupied)
  if(decision.status!=='ACCEPTED'||!decision.placement)continue
  const placement=decision.placement,entry=entries.find(e=>e.id===placement.assetId)!
  // Stable restored identity: do not silently swap or move a previously materialized object.
  if(change.placement&&(change.placement.assetId!==placement.assetId||change.placement.slot!==placement.slot))continue
  occupied.push(placement);result.push({change,entry,placement})
 }
 return result
}
