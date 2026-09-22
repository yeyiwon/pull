import type { Context } from './model.ts'
export const WORLD_EVENT_LABELS = ['greeting','affectionate','snow','rain','curious','night','morning','sunset','day','wind'] as const
// The outbound boundary is deliberately narrower than the local Brain context.
export function conversationPayload(c:Context) {
 const {season,timeOfDay,weather,location,indoor,nearWater}=c.world
 const {energy,curiosity,comfort,attention,affection,sleepiness}=c.moru
 return {
  userMessage:c.userMessage,
  world:{season,timeOfDay,weather,location,indoor,nearWater},
  moru:{energy,curiosity,comfort,attention,affection,sleepiness},
  recentConversation:c.recentConversation.slice(-8).map(t=>({user:t.user,moru:t.moru})),
  recentEvents:c.recentEvents.filter(e=>WORLD_EVENT_LABELS.some(label=>label===e.event)).slice(-8).map(e=>({event:e.event})),
 }
}
