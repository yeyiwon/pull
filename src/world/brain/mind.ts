import { createResearchController, researchSummary } from '../../research/controller.ts'
import type { ResearchBudget, SessionBudget } from '../../research/controller.ts'
import type { MoruResearchProvider } from '../../research/model.ts'
import { createInterestModel, emptyInterests } from './interests.ts'
import type { Interests } from './interests.ts'
import { AMBIENT_LINES } from '../../characters/ambientLines.ts'
import type { LineCategory } from '../../characters/ambientLines.ts'
import { validateIntent } from './conversation.ts'
import { waitIntent } from './types.ts'
import type { Observation, InternalState, Intent, Execution, ConversationAdapter, LongMemoryPort, MeaningfulMemory, AttentionTarget } from './types.ts'

type Event = {key:string;category:LineCategory;attention:AttentionTarget;importance:number;at:number}
export const brainDebug = {state:{energy:.7,curiosity:.6,comfort:.6,attention:.3,affection:.3,sleepiness:.1} as InternalState,attention:'NONE' as AttentionTarget,
 intent:'WAIT',observation:'waiting',decision:'not observed',cooldown:0,recentSpeech:[] as string[],recentActions:[] as string[],events:[] as MeaningfulMemory[],log:[] as string[],ticks:0,interests:emptyInterests()}
export const brainCommands:{trigger:(()=>void)|null;converse:((text:string)=>Promise<Intent>)|null}={trigger:null,converse:null}
const bounded=(v:number)=>Math.max(0,Math.min(1,v))
export function createMoruMind(options:{execute:(intent:Intent)=>Execution;random?:()=>number;visits?:number;longMemory?:LongMemoryPort;conversation?:ConversationAdapter;debug?:boolean;interests?:Interests;interestsChanged?:()=>void;clock?:()=>number;research?:{provider:MoruResearchProvider;budget:ResearchBudget;session:SessionBudget}}){
 const interests=createInterestModel(options.interests??emptyInterests(),options.interestsChanged,options.clock)
 const research=options.research?createResearchController(interests.data,options.research.budget,options.research.provider,options.interestsChanged??(()=>{}),{now:options.clock,session:options.research.session}):null
 const random=options.random??Math.random
 const state:InternalState={energy:.7,curiosity:.6,comfort:.6,attention:.3,affection:Math.min(.6,.25+(options.visits??1)*.015),sleepiness:.1}
 const working={actions:[] as {id:string;at:number}[],lines:[] as {text:string;at:number}[],observations:[] as string[]}
 const short:MeaningfulMemory[]=[];const seen=new Set<string>()
 try{for(const e of options.longMemory?.recall().slice(-64)??[]){if(typeof e.key==='string')seen.add(e.key)}}catch{/* Memory availability never blocks local presence. */}
 let now=0,nextReaction=5+random()*4,age=0,nextIdle=25+random()*25,attention:AttentionTarget='NONE'
 let previous:Observation|null=null,current:Observation|null=null,alive=true,pending:Event|null=null,conversationPending=false
 let conversationLock=false
 let lastConversation=-100
 let lastIntent=waitIntent('initial quiet'),generation=0,abort:AbortController|null=null,ticks=0
 function trace(text:string){if(options.debug){brainDebug.log.push(text);brainDebug.log=brainDebug.log.slice(-12)}}
 function remember(event:Event){seen.add(event.key);if(seen.size>256)seen.delete(seen.values().next().value!)
  const item={key:event.key,at:now,event:event.category};short.push(item);if(short.length>32)short.shift()
  try{options.longMemory?.remember(item)}catch{/* Optional persistent memory. */}
 }
 function enqueue(category:LineCategory,target:AttentionTarget,importance:number,key:string){
  if(seen.has(key))return
  const event={category,attention:target,importance,key,at:now}
  if(!pending||pending.importance<importance)pending=event
 }
 function publish(reason:string){
  if(!options.debug)return
  Object.assign(brainDebug,{state:{...state},attention,intent:lastIntent.kind,observation:current?`${current.timeOfDay} · ${current.season} · ${current.weather} · ${current.location}`:'none',decision:reason,cooldown:Math.ceil(Math.max(0,nextReaction-now)),recentSpeech:working.lines.map(x=>x.text),recentActions:working.actions.map(x=>x.id),events:[...short],ticks,interests:structuredClone(interests.data)})
 }
 function available(o:Observation){return !o.userMoving&&!o.actionBusy&&o.grounded}
 function dispatch(intent:Intent){
  if(!current||!available(current)){lastIntent=waitIntent('movement/action priority');return lastIntent}
  if(!intent.action&&!intent.speech&&!intent.emote){lastIntent=waitIntent('nothing new to express');return lastIntent}
  const result=options.execute(intent)
  if(result.action)working.actions.push({id:result.action,at:now})
  if(result.speech)working.lines.push({text:result.speech,at:now})
  working.actions=working.actions.slice(-12);working.lines=working.lines.slice(-24)
  const expressed=!!(result.action||result.speech||result.emote)
  lastIntent=expressed?{...intent,action:result.action,speech:result.speech}:waitIntent('presentation cooldown')
  if(expressed){attention=intent.attention;age=0;nextReaction=now+32+random()*30;trace(`ACT ${result.action??'—'} · SAY ${result.speech??'—'} · ATTENTION ${attention}`)}
  return lastIntent
 }
 function line(category:LineCategory){
  const candidates=AMBIENT_LINES[category].filter(text=>!working.lines.some(x=>x.text===text&&now-x.at<300)&&!current?.recentSpeech.includes(text))
  return candidates.length?candidates[Math.min(candidates.length-1,Math.floor(random()*candidates.length))]:null
 }
 function choose(event:Event):Intent{
  const recent=working.actions.at(-1)
  let action:Intent['action']=event.attention==='USER'?'wave':event.category==='snow'?'hop':'listen'
  if(recent?.id===action&&now-recent.at<90||current?.recentMoruActions.includes(action))action=null
  const speech=line(event.category)
  return {kind:'REACT',attention:event.attention,action,speech:random()<.8?speech:null,
   emote:event.category==='snow'?'sparkle':event.attention==='USER'&&random()<state.affection*.25?'heart':null,reason:event.category}
 }
 function ambient(o:Observation):Event{
  let category:LineCategory=o.indoor?'home':o.nearWater?'water':o.hour<5||o.hour>=21?'night':o.hour<11?'morning':o.hour>=17?'sunset':'day'
  if(state.sleepiness>.65&&random()<.4)category='sleepy'
  else if(random()<.18&&['spring','summer','autumn','winter'].includes(o.season))category=o.season as LineCategory
  const target:AttentionTarget=o.indoor?'HOME':o.nearWater?'WATER':(o.hour<5||o.hour>=21)?'SKY':'WORLD'
  return {key:`idle:${ticks}`,category,attention:target,importance:.35,at:now}
 }
 function tick(o:Observation,delta:number){
  if(!alive)return
  const dt=Math.min(2,Math.max(0,delta));now+=dt;age+=dt;ticks++;current=o
  interests.observe(o)
  void research?.observe(o,conversationLock||conversationPending)
  working.lines=working.lines.filter(x=>now-x.at<300);working.actions=working.actions.filter(x=>now-x.at<180)
  for(const text of o.recentSpeech)if(!working.lines.some(x=>x.text===text))working.lines.push({text,at:now})
  const latest=o.recentMoruActions.at(-1)
  if(latest&&latest!==previous?.recentMoruActions.at(-1)&&working.actions.at(-1)?.id!==latest)working.actions.push({id:latest,at:now})
  working.lines=working.lines.slice(-24);working.actions=working.actions.slice(-12)
  working.observations.push(`${o.timeOfDay}/${o.weather}/${o.location}`);working.observations=working.observations.slice(-12)
  const late=o.hour<5||o.hour>=22,peace=o.nearWater&&!o.userMoving
  const targets:InternalState={energy:late?.25:o.userMoving?.5:.8,curiosity:o.skyEvent?.95:.58,comfort:o.indoor?.85:peace?.9:o.weather==='storm'?.3:.65,attention:o.userInteracted||o.skyEvent?.9:.3,affection:Math.min(.85,state.affection+(o.userInteracted?.012:0)+(o.userReturned?.006:0)),sleepiness:late?.85:.08}
  for(const key of Object.keys(state) as (keyof InternalState)[])state[key]=bounded(state[key]+(targets[key]-state[key])*(1-Math.exp(-dt/(key==='attention'?8:key==='affection'?4:60))))
  if(peace)state.energy=bounded(state.energy-dt*.0003)
  if(o.userMoving){generation++;abort?.abort();abort=null;conversationPending=false;lastIntent=waitIntent('user movement');attention='WORLD';publish(lastIntent.reason);previous=o;return}
  if(pending&&(pending.attention==='SKY'&&o.indoor||pending.category==='snow'&&o.weather!=='snow'||pending.category==='rain'&&!['rain','storm'].includes(o.weather))){remember(pending);pending=null}
  if(!previous)enqueue('greeting','USER',.85,`entry:${o.date}`)
  if(o.userReturned)enqueue('greeting','USER',.9,`return:${Math.floor(now/120)}`)
  if(o.userInteracted)enqueue('affectionate','USER',.6,`social:${Math.floor(now/90)}`)
  if(o.weather==='snow'||o.weather==='rain'||o.weather==='storm')enqueue(o.weather==='snow'?'snow':'rain',o.indoor?'HOME':'SKY',.92,`${o.date}:weather:${o.weather==='storm'?'rain':o.weather}`)
  if(o.skyEvent&&!o.indoor)enqueue('curious','SKY',.95,`${o.date}:sky:${o.skyEvent}`)
  if(previous&&o.timeOfDay!==previous.timeOfDay)enqueue(o.hour>=21||o.hour<5?'night':o.hour<11?'morning':o.hour>=17?'sunset':'day',o.indoor?'HOME':'SKY',.7,`${o.date}:phase:${o.timeOfDay}`)
  if(o.wind>.6&&!o.indoor)enqueue('wind','WORLD',.6,`${o.date}:wind`)
  previous=o
  if(conversationLock)attention='USER'
  else if(age>15)attention='NONE'
  if(pending&&(now-pending.at>90)){remember(pending);pending=null}
  if(!available(o)||conversationPending||conversationLock){lastIntent=waitIntent('direct action priority');publish(lastIntent.reason);return}
  if(now<nextReaction){lastIntent=waitIntent('cooldown');publish(lastIntent.reason);return}
  let event=pending;pending=null
  if(!event&&now>=nextIdle&&o.userIdleDuration>=12){event=ambient(o);nextIdle=now+18+random()*35}
  if(!event){lastIntent=waitIntent('nothing salient');publish(lastIntent.reason);return}
  const novelty=seen.has(event.key)?0:1
  const chance=Math.min(.95,event.importance*.65+state.curiosity*.17+state.attention*.1+novelty*.1)
  trace(`OBSERVE ${event.category} · NOVELTY ${novelty} · GATE ${chance.toFixed(2)}`)
  if(!event.key.startsWith('idle:'))remember(event)
  if(random()>chance){lastIntent=waitIntent('quiet observation');trace('DECISION WAIT · quiet observation');nextIdle=now+20+random()*30;publish(lastIntent.reason);return}
  dispatch(choose(event));publish(lastIntent.reason)
 }
 async function converse(text:string):Promise<Intent>{
  const clean=text.trim();if(!alive||!current||!available(current)||conversationPending||now-lastConversation<8||!clean||clean.length>280)return waitIntent('conversation unavailable')
  lastConversation=now
  const token=++generation;const controller=new AbortController();abort=controller;conversationPending=true
  let timer:ReturnType<typeof setTimeout>|undefined
  const fallback=():Intent=>({kind:'REACT',attention:'USER',action:'listen',speech:line('greeting'),emote:null,reason:'local conversation fallback'})
  try{
   let intent=fallback()
   if(options.conversation){
    const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('timeout'))},4000)})
    try{intent=validateIntent(await Promise.race([options.conversation.respond(clean,{observation:structuredClone(current),state:{...state},recentSpeech:working.lines.map(x=>x.text)},controller.signal),timeout]),current);if(intent.kind==='WAIT'&&intent.reason!=='conversation chose silence')intent=fallback()}catch{intent=fallback()}
   }
   if(!alive||token!==generation||!available(current))return waitIntent('stale conversation')
   if(intent.kind==='WAIT'){lastIntent=intent;return intent}
   return dispatch(intent)
  }finally{if(timer)clearTimeout(timer);if(token===generation){conversationPending=false;abort=null}publish(lastIntent.reason)}
 }
 return {state,working,short,tick,converse,interests,
  snapshot(){return current?{observation:structuredClone(current),state:{...state},attention,events:[...short],research:research?researchSummary(interests.data):undefined}:null},
  holdConversation(value:boolean){conversationLock=value;if(value)research?.interrupt();if(value){attention='USER';age=0}else nextReaction=Math.max(nextReaction,now+8)},
  trigger(){if(current){enqueue('curious',current.indoor?'HOME':'WORLD',1,`debug:${ticks}`);nextReaction=now}},
  suspend(){research?.interrupt();generation++;abort?.abort();abort=null;conversationPending=false;pending=null},
  dispose(){research?.dispose();alive=false;generation++;abort?.abort()},
  get intent(){return lastIntent},get attention(){return attention},get time(){return now},
 }
}
