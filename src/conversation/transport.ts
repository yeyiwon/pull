import { parseContinuity, continuityQuestion } from '../world/evolution/offline.ts'
import { parseResearchSummary } from '../research/model.ts'
import type { Context } from './model.ts'
export const WORLD_EVENT_LABELS = ['greeting','affectionate','snow','rain','curious','night','morning','sunset','day','wind','HEAVY_SNOW','HEAVY_RAIN','FIREWORKS','METEOR_SHOWER','DIAMOND_DUST','AURORA','FIREFLY_NIGHT','CHERRY_BLOSSOM_WIND','AUTUMN_LEAF_STORM','THUNDERSTORM','WINTER_ILLUMINATION'] as const
// The outbound boundary is deliberately narrower than the local Brain context.
export function conversationPayload(c:Context) {
 const {season,timeOfDay,weather,location,indoor,nearWater,activeEvents=[],eventLocation=null,currentAutonomousGoal=null,currentAgentSkill=null,autonomyState='QUIET'}=c.world
 const {energy,curiosity,comfort,attention,affection,sleepiness}=c.moru
 return {
  ...(c.user?{user:{displayName:c.user.displayName}}:{}),
  ...(c.continuity&&continuityQuestion(c.userMessage)?{continuity:parseContinuity(c.continuity)}:{}),
  ...(c.research&&/궁금|관심|연구|탐구|발견|뭐.*생각|뭐.*하|뭐해|없을 때|없는 동안|뭐했|뭐 했/.test(c.userMessage)?{research:parseResearchSummary(c.research)}:{}),
  ...(c.intelligence?{intelligence:c.intelligence}:{}),
  userMessage:c.userMessage,
  world:{season,timeOfDay,weather,location,indoor,nearWater,activeEvents:activeEvents.slice(0,3),eventLocation,currentAutonomousGoal,currentAgentSkill,autonomyState},
  moru:{energy,curiosity,comfort,attention,affection,sleepiness},
  perception:{deicticTarget:c.perception?.deicticTarget??null,candidates:c.perception?.candidates.slice(0,8)??[]},
  recentConversation:c.recentConversation.slice(-8).map(t=>({user:t.user,moru:t.moru})),
  recentEvents:c.recentEvents.filter(e=>WORLD_EVENT_LABELS.some(label=>label===e.event)).slice(-8).map(e=>({event:e.event})),
 }
}
