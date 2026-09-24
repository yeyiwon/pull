import type { Player } from './locomotion.ts'
import type { ActionPlan } from './agentSkills.ts'

type StartAgentPlan=(plan:ActionPlan,player:Player,command:string)=>boolean
let startPlan:StartAgentPlan|null=null

export const agentControl={
 bind(start:StartAgentPlan){startPlan=start;return()=>{if(startPlan===start)startPlan=null}},
 moveTo(player:Player,distance:number){
  if(!startPlan)return false
  const skill=distance>8?'RUN_TO':'WALK_TO'
  return startPlan([{skill,target:'DEICTIC_POINT',duration:null,text:null}],player,'DIRECT_TAP')
 },
}
