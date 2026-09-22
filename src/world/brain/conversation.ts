import { MORU_ACTIONS } from '../../characters/actions.ts'
import { ATTENTION_TARGETS, waitIntent } from './types.ts'
import type { Intent, Observation } from './types.ts'
const emotes=['heart','sparkle','question','surprise','music']
export function validateIntent(value:unknown,o:Observation):Intent{
 if(!value||typeof value!=='object')return waitIntent('invalid structured response')
 const v=value as Record<string,unknown>
 if(v.kind==='WAIT')return waitIntent('conversation chose silence')
 if(v.kind!=='REACT'||!ATTENTION_TARGETS.includes(v.attention as Intent['attention'])||
  !(v.action===null||MORU_ACTIONS.some(a=>a.id===v.action&&a.category!=='movement'))||
  !(v.speech===null||typeof v.speech==='string'&&v.speech.trim().length>0&&v.speech.length<=40&&!/[<>\r\n]/.test(v.speech))||
  !(v.emote===null||emotes.includes(String(v.emote))))return waitIntent('invalid structured response')
 // There is no object sensor or avatar representing the user in the world.
 if(v.attention==='OBJECT'||v.attention==='WATER'&&!o.nearWater||v.attention==='HOME'&&!o.indoor||v.attention==='SKY'&&o.indoor)return waitIntent('unavailable attention target')
 return {kind:'REACT',attention:v.attention as Intent['attention'],action:v.action as Intent['action'],speech:typeof v.speech==='string'?v.speech.trim():null,emote:v.emote as Intent['emote'],reason:'direct conversation'}
}
