import type { Reaction } from '../world/personality.ts'
import { MORU_ACTIONS } from './actions.ts'
import type { MoruActionId } from './actions.ts'
import { moruAnimations } from './assets.ts'

export type ReactionState='NEUTRAL'|'CURIOUS'|'HAPPY'|'EXCITED'|'AFFECTIONATE'|'SHY'|'SURPRISED'|'PLAYFUL'|'THINKING'|'SAD'|'ANNOYED'|'DANCING'|'CELEBRATING'
export type ReactionIntensity='SUBTLE'|'NORMAL'|'CELEBRATION'
export type Feedback={state:ReactionState;intensity:ReactionIntensity;duration:number;action?:MoruActionId}
export function feedbackVisual(value:Feedback){
 if(value.state==='DANCING'){
  if(value.action==='loveDance'||value.action==='superloveDance')return {shape:'heart',motion:'rise',count:8,color:'#e9a8c4'} as const
  if(value.action==='bubbleDance')return {shape:'petal',motion:'swirl',count:12,color:'#d6c1f0'} as const
  return {shape:'star',motion:'burst',count:16,color:'#f2d5a0'} as const
 }
 if(value.state==='CELEBRATING'||value.state==='EXCITED'||value.state==='SURPRISED')return {shape:'star',motion:'burst',count:value.state==='CELEBRATING'?16:4,color:'#f6dfa8'} as const
 // Affection/question/sadness use their own small head-level glyph and blush,
 // not the same surrounding confetti as a dance.
 return {shape:'petal',motion:'rise',count:0,color:'#edc7d6'} as const
}
export const BLUSH:Record<ReactionState,number>={NEUTRAL:0,CURIOUS:.05,HAPPY:.15,EXCITED:.25,AFFECTIONATE:.3,SHY:.35,SURPRISED:.1,PLAYFUL:.18,THINKING:0,SAD:.04,ANNOYED:.08,DANCING:.2,CELEBRATING:.25}
export function reactionFeedback(reaction:Reaction):Feedback{
 const state:ReactionState=reaction.fx==='HEARTS'||reaction.emotion==='warm'?'AFFECTIONATE':reaction.fx==='SURPRISE'?'SURPRISED':reaction.emotion==='angry'||reaction.emotion==='annoyed'?'ANNOYED':reaction.emotion==='sad'?'SAD':reaction.fx==='QUESTION'||reaction.emotion==='curious'?'CURIOUS':reaction.fx==='JOY'?'PLAYFUL':reaction.emotion==='happy'?'HAPPY':reaction.fx==='SPARKLES'?'EXCITED':'NEUTRAL'
 return {state,intensity:reaction.typing?'SUBTLE':'NORMAL',duration:reaction.duration}
}
export function actionFeedback(id:MoruActionId):Feedback|null{
 const action=MORU_ACTIONS.find(a=>a.id===id)
 if(!action||action.category==='movement')return null
 const dance=action.category==='dance'
 const state:ReactionState=dance?'DANCING':id==='wave'||id==='bow'?'AFFECTIONATE':id==='listen'?'CURIOUS':id==='hop'?'CELEBRATING':id==='playful'||id==='penguin'||id==='skip'?'PLAYFUL':'NEUTRAL'
 return {state,intensity:dance||id==='hop'?'CELEBRATION':'NORMAL',duration:Math.min(16,moruAnimations.find(a=>a.name===action.clip)?.duration??3),action:id}
}
export type SoundHook='dance.start'|'dance.accent'|'dance.end'|'reaction.happy'|'reaction.surprised'|'reaction.affectionate'|'sparkle'|'petal'
export const FEEDBACK_SOUNDS:Record<SoundHook,{status:'SFX_READY'|'ASSET_MISSING';cue?:string}>={
 'dance.start':{status:'SFX_READY',cue:'moru_happy'},'dance.accent':{status:'SFX_READY',cue:'moru_happy'},'dance.end':{status:'SFX_READY',cue:'moru_affection'},
 'reaction.happy':{status:'SFX_READY',cue:'moru_happy'},'reaction.surprised':{status:'SFX_READY',cue:'moru_surprise'},'reaction.affectionate':{status:'SFX_READY',cue:'moru_affection'},
 sparkle:{status:'ASSET_MISSING'},petal:{status:'ASSET_MISSING'},
}
export function createFeedbackDirector(){
 let active:Feedback|null=null,age=0,accent=false,finished=false
 return {
  start(value:Feedback){if(active?.state==='DANCING'&&!value.action)return;active=value;age=0;accent=false;finished=false},
  stop(){active=null},
  update(dt:number){
   const cues:SoundHook[]=[]
   if(!active)return {active:null,age:0,opacity:0,pulse:0,blush:0,count:0,cues}
   const dance=active.state==='DANCING',duration=active.duration
   if(age===0&&active.state!=='NEUTRAL'&&active.state!=='SAD'&&active.state!=='THINKING'&&active.state!=='ANNOYED'&&active.state!=='CURIOUS')cues.push(dance?'dance.start':active.state==='AFFECTIONATE'||active.state==='SHY'?'reaction.affectionate':active.state==='SURPRISED'?'reaction.surprised':'reaction.happy')
   age+=Math.max(0,Math.min(dt,.1))
   if(dance&&!accent&&age>=duration*.45){accent=true;cues.push('dance.accent')}
   if(dance&&!finished&&age>=duration-.65){finished=true;cues.push('dance.end')}
   if(age>=duration){active=null;return {active:null,age,opacity:0,pulse:0,blush:0,count:0,cues}}
   const opacity=Math.min(1,age/.45,(duration-age)/.8)
   const pulse=dance?Math.max(0,1-age/1.2)+Math.max(0,1-Math.abs(age-duration*.45)/.5)*.5+Math.max(0,1-Math.abs(age-(duration-.65))/.4)*.3:0
   return {active,age,opacity,pulse,blush:BLUSH[active.state]*opacity,count:feedbackVisual(active).count,cues}
  },
 }
}
// Presentation state only; no persistence, decisions or network calls.
export const feedback=createFeedbackDirector()
