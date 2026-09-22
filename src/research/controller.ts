import type { Interests } from '../world/brain/interests.ts'
import type { Observation } from '../world/brain/types.ts'
import { emptyProgress, parseResearch } from './model.ts'
import type { MoruResearchProvider, ResearchSummary } from './model.ts'
export const RESEARCH_COOLDOWN=30*60*1000
export const TOPIC_COOLDOWN=24*60*60*1000
export type ResearchBudget={day:string;attempts:number;nextAllowedAt:number}
export const emptyResearchBudget=():ResearchBudget=>({day:'',attempts:0,nextAllowedAt:0})
export type SessionBudget={calls:number;blocked:boolean}
// Survives React remounts; persisted daily budget also survives a page reload.
export const researchSessionBudget:SessionBudget={calls:0,blocked:false}
export function researchSummary(data:Interests):ResearchSummary{
 const j=data.journal.find(j=>j.topic===data.fascination?.topic),p=j?.research
 const recent=data.journal.filter(j=>j.research?.provider==='REAL'&&j.research.status==='COMPLETE'&&j.research.result?.facts.length).sort((a,b)=>b.research!.completedAt-a.research!.completedAt)[0]
 const r=recent?.research?.result
 return {currentFascination:data.fascination?.topic??null,activeResearch:j?{topic:j.topic,question:j.question,status:p?.status??'PENDING'}:null,recentDiscovery:r?{topic:r.topic,claim:r.facts[0],kind:'MODEL_KNOWLEDGE',confidence:r.confidence,needsExternalResearch:r.needsExternalResearch}:null}
}
export function createResearchController(data:Interests,budget:ResearchBudget,provider:MoruResearchProvider,changed:()=>void,options:{now?:()=>number;session?:SessionBudget;timeoutMs?:number}={}){
 const now=options.now??Date.now,session=options.session??{calls:0,blocked:false}
 let alive=true,controller:AbortController|null=null
 function interrupt(){controller?.abort()}
 async function observe(o:Observation,conversationBusy=false){
  if(!alive||conversationBusy||o.userMoving||o.actionBusy||!o.grounded){interrupt();return}
  if(controller||session.calls>=1||session.blocked)return
  const time=now(),day=new Date(time).toISOString().slice(0,10)
  // A reversed device clock cannot reset cooldown or the durable daily allowance.
  if(time<budget.nextAllowedAt||day<budget.day)return
  if(day!==budget.day){budget.day=day;budget.attempts=0}
  if(budget.attempts>=2)return
  const j=data.journal.find(j=>j.topic===data.fascination?.topic&&j.status==='OPEN'&&data.queue.some(c=>c.topic===j.topic))
  if(!j||!j.observations.length)return
  const p=j.research??(j.research=emptyProgress())
  if(time<p.nextAllowedAt)return
  session.calls++;budget.attempts++;budget.nextAllowedAt=time+RESEARCH_COOLDOWN
  p.status='RESEARCHING';p.lastAttemptAt=time;p.nextAllowedAt=time+TOPIC_COOLDOWN;p.error=null
  changed()
  const abort=new AbortController();controller=abort
  let timer:ReturnType<typeof setTimeout>|undefined
  let rejectAbort:()=>void=()=>{}
  try{
   const timeout=new Promise<never>((_,reject)=>{
    rejectAbort=()=>reject(Error('cancelled'));abort.signal.addEventListener('abort',rejectAbort,{once:true})
    timer=setTimeout(()=>{reject(Error('timeout'));abort.abort()},options.timeoutMs??15000)
   })
   const reply=await Promise.race([provider.explore({topic:j.topic,question:j.question,observations:j.observations.slice(-3),previous:{inferences:p.result?.inferences.slice(-2)??[],unknowns:p.result?.unknowns.slice(-2)??[]}},abort.signal),timeout])
   if(!alive||abort.signal.aborted)return
   if(reply.provider!=='REAL'&&reply.provider!=='MOCK')throw Error('provider')
   p.result=parseResearch(reply.result,j.topic);p.provider=reply.provider;p.completedAt=now();p.status='COMPLETE'
   // Model claims remain explicitly unverified in research.result, never in observed journal.facts.
  }catch{p.status='UNRESOLVED';p.error=abort.signal.aborted?'interrupted_or_timeout':'provider_or_validation';session.blocked=true}
  finally{clearTimeout(timer);abort.signal.removeEventListener('abort',rejectAbort);controller=null;if(p.status==='RESEARCHING')p.status='UNRESOLVED';changed()}
 }
 return {observe,interrupt,dispose(){alive=false;interrupt()},get session(){return {...session}}}
}
