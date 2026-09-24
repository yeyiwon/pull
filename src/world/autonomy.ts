import type { Player } from './locomotion.ts'
import type { ActionPlan, WorldCandidate, WorldPerception } from './agentSkills.ts'
import type { AgentState } from './agentExecutor.ts'
import type { Observation } from './brain/types.ts'
import type { AutonomyMemory } from './brain/memory.ts'

export type AutonomyState='QUIET'|'THINKING'|'ACTING'|'INTERRUPTED'
export type AutonomyGoal={id:string;target:string|null;reason:string;score:number;source:'LOCAL'|'REAL';plan:ActionPlan;meaningful:boolean}
export const autonomyDebug={state:'QUIET' as AutonomyState,decisionSource:'LOCAL' as 'LOCAL'|'REAL',perception:'waiting',candidates:[] as {id:string;score:number;reason:string}[],goal:null as AutonomyGoal|null,plan:[] as ActionPlan,currentSkill:null as string|null,result:'idle',memoryCandidate:null as string|null,localDecisions:0,realCalls:0,nextDecisionIn:0}

type Start=(plan:ActionPlan,player:Player,command:string)=>boolean
type Input={observation:Observation;perception:WorldPerception;player:Player;agentState:AgentState;currentSkill:string|null}
const step=(skill:ActionPlan[number]['skill'],target:string|null=null,duration:number|null=null):ActionPlan[number]=>({skill,target,duration,text:null})
const eventTargets:Record<string,string>={FIREWORKS:'OldBridge',METEOR_SHOWER:'MoonShrine',AURORA:'MoonShrine',HEAVY_SNOW:'AncientTree',DIAMOND_DUST:'AncientTree',FIREFLY_NIGHT:'HiddenGarden',CHERRY_BLOSSOM_WIND:'HiddenGarden',AUTUMN_LEAF_STORM:'AncientTree',WINTER_ILLUMINATION:'AncientTree'}
const eventRarity=(id:string)=>['FIREWORKS','METEOR_SHOWER','AURORA'].includes(id)?1:['HEAVY_SNOW','DIAMOND_DUST','WINTER_ILLUMINATION'].includes(id)?.82:.65

export function createAutonomy(options:{start:Start;memory:AutonomyMemory;changed:()=>void;random?:()=>number;now?:()=>string}){
 const random=options.random??Math.random,now=options.now??(()=>new Date().toISOString())
 let elapsed=0,nextDecision=18+random()*12,current:AutonomyGoal|null=null,lastEvent='',quietUntil=0
 const recent=(id:string,target:string|null)=>options.memory.recentGoals.some((g,index)=>g.id===id&&g.target===target&&index>=options.memory.recentGoals.length-4)
 function score(candidate:WorldCandidate,o:Observation){
  const memory=options.memory.discoveries[candidate.id],novelty=!memory?1:memory.status==='discovered'?.35:.08
  const rarity=candidate.type==='landmark'||candidate.type==='bridge'?.7:candidate.type==='flower'?.45:.2
  const proximity=Math.max(0,1-candidate.distance/55),season=candidate.type==='flower'&&['spring','summer'].includes(o.season)?.3:0
  return novelty*.46+rarity*.24+proximity*.22+season-(recent('inspect',candidate.id)?.55:0)
 }
 function candidates(input:Input){
  const list:{goal:AutonomyGoal;score:number}[]=[]
  for(const id of input.observation.activeEvents??[]){const target=eventTargets[id]??input.observation.eventLocation??null;if(!target)continue
   const plan:ActionPlan=id==='HEAVY_RAIN'||id==='THUNDERSTORM'?[step('WAIT',null,3)]:[step('MOVE_NEAR',target),step('LOOK_AT',target),step('WAIT',null,Math.min(8,id==='FIREWORKS'?8:5))]
   const value=1.1+eventRarity(id)-(recent(`event:${id}`,target)?.7:0)
   list.push({score:value,goal:{id:`event:${id}`,target,reason:`active ${id}`,score:value,source:'LOCAL',plan,meaningful:true}})
  }
  for(const candidate of input.perception.candidates){if(candidate.id==='DEICTIC_POINT'||!candidate.affordances.includes('inspect')&&candidate.type!=='water')continue
   const value=score(candidate,input.observation);if(value<.48)continue
   const plan:ActionPlan=candidate.type==='bench'?[step('SIT',candidate.id),step('WAIT',null,6),step('STAND')]:[step(candidate.distance>16?'WALK_TO':'MOVE_NEAR',candidate.id),step('LOOK_AT',candidate.id),...(candidate.affordances.includes('inspect')?[step('INSPECT',candidate.id,2)]:[]),step('WAIT',null,2)]
   list.push({score:value,goal:{id:'inspect',target:candidate.id,reason:`interest ${candidate.type}`,score:value,source:'LOCAL',plan,meaningful:candidate.type==='landmark'||candidate.type==='bridge'}})
  }
  return list.sort((a,b)=>b.score-a.score).slice(0,6)
 }
 function update(input:Input,delta:number){
  elapsed+=Math.max(0,Math.min(2,delta));autonomyDebug.currentSkill=input.currentSkill
  autonomyDebug.perception=`${input.observation.timeOfDay} · ${input.observation.weather} · ${input.observation.location} · ${input.perception.candidates.length} candidates`
  autonomyDebug.nextDecisionIn=Math.max(0,Math.ceil(nextDecision-elapsed))
  if(current){autonomyDebug.state='ACTING';return}
  if(input.observation.userMoving||input.observation.actionBusy||input.agentState!=='IDLE'){autonomyDebug.state='QUIET';return}
  const important=(input.observation.activeEvents??[]).find(id=>eventTargets[id])??''
  const eventTrigger=!!important&&important!==lastEvent
  if(!eventTrigger&&(elapsed<nextDecision||elapsed<quietUntil)){autonomyDebug.state='QUIET';return}
  if(important)lastEvent=important
  autonomyDebug.state='THINKING';autonomyDebug.localDecisions++;autonomyDebug.memoryCandidate=null
  const ranked=candidates(input);autonomyDebug.candidates=ranked.map(({goal,score})=>({id:`${goal.id}:${goal.target??'—'}`,score:+score.toFixed(2),reason:goal.reason}))
  const chosen=ranked[0]?.goal
  nextDecision=elapsed+45+random()*45
  if(!chosen||(!eventTrigger&&random()<.62)){autonomyDebug.goal=null;autonomyDebug.plan=[];autonomyDebug.result='chose quiet';quietUntil=elapsed+20+random()*25;autonomyDebug.state='QUIET';return}
  current=chosen;autonomyDebug.goal=structuredClone(chosen);autonomyDebug.plan=[...chosen.plan];autonomyDebug.result='starting'
  if(!options.start(chosen.plan,input.player,`AUTONOMY:${chosen.id}:${chosen.target??''}`)){current=null;autonomyDebug.result='start rejected';autonomyDebug.state='QUIET'}else autonomyDebug.state='ACTING'
 }
 function result(value:string,command:string){
  if(!command.startsWith('AUTONOMY:'))return
  const goal=current;current=null;autonomyDebug.result=value;autonomyDebug.state=value==='completed'?'QUIET':'INTERRUPTED';quietUntil=elapsed+(value==='completed'?25:12)
  if(value!=='completed'||!goal)return
  options.memory.recentGoals.push({id:goal.id,target:goal.target,completedAt:now()});options.memory.recentGoals=options.memory.recentGoals.slice(-12)
  if(goal.target){const previous=options.memory.discoveries[goal.target],observations=(previous?.observations??0)+1;options.memory.discoveries[goal.target]={status:observations>=3?'familiar':'discovered',firstSeenAt:previous?.firstSeenAt??now(),lastSeenAt:now(),observations};autonomyDebug.memoryCandidate=goal.meaningful?goal.target:null}
  options.changed()
 }
 function interrupt(reason='user priority'){if(current){current=null;autonomyDebug.state='INTERRUPTED';autonomyDebug.result=reason;quietUntil=elapsed+12}}
 return {update,result,interrupt,get goal(){return current},get state(){return autonomyDebug.state}}
}
