import type { Continuity } from '../world/evolution/offline.ts'
import { speechDuration } from '../characters/presentation.ts'
import type { ResearchSummary } from '../research/model.ts'
import { conversationProvider } from './provider.ts'
import { buildContext, MockConversationAdapter, parseResponse } from './model.ts'
import type { Context, MoruConversationProvider, Response, Turn } from './model.ts'
import type { AttentionTarget, InternalState, MeaningfulMemory, Observation } from '../world/brain/types.ts'
export type ConversationPhase='closed'|'composing'|'thinking'|'speaking'
type Port={snapshot:()=>{continuity?:Continuity;research?:ResearchSummary;observation:Observation;state:InternalState;attention:AttentionTarget;events:MeaningfulMemory[]}|null;hold:(value:boolean)=>void;listen:()=>void;speak:(response:Response)=>boolean;cancel:()=>void}
export function createConversationSession(provider:MoruConversationProvider=new MockConversationAdapter(),timing={thinking:650,timeout:11000}){
 let port:Port|null=null,token=0,abort:AbortController|null=null,release:ReturnType<typeof setTimeout>|undefined
 let state={phase:'closed' as ConversationPhase,ready:false,notice:'',reply:'',revision:0}
 const listeners=new Set<()=>void>(),turns:Turn[]=[]
 const historyKey='pull-moru-conversation-history-v1'
 const history:Turn[]=[]
 if(typeof localStorage!=='undefined')try{
  const saved:unknown=JSON.parse(localStorage.getItem(historyKey)??'[]')
  if(Array.isArray(saved))for(const turn of saved.slice(-60))if(turn&&typeof turn.user==='string'&&typeof turn.moru==='string')history.push({user:turn.user.slice(0,280),moru:turn.moru.slice(0,120)})
 }catch{/* Private mode or unavailable storage leaves conversation usable. */}
 const debug={context:null as Context|null,raw:null as unknown,parsed:null as Response|null,rejected:[] as string[],outcome:'none'}
 function update(patch:Partial<typeof state>){state={...state,...patch,revision:state.revision+1};listeners.forEach(fn=>fn())}
 function cancel(){token++;abort?.abort();abort=null;if(release)clearTimeout(release);port?.cancel();port?.hold(false);update({phase:'closed',notice:''})}
 function open(){if(!port)return;port.hold(true);update({phase:'composing',notice:''})}
 async function send(text:string){
  const clean=text.trim();if(!port||!clean||clean.length>280||state.phase==='thinking'||state.phase==='speaking')return false
  const snap=port.snapshot();if(!snap||!snap.observation.grounded){update({notice:'땅에 내려오면 말 걸어줘.'});return false}
  if(state.phase==='closed')open()
  const id=++token,controller=new AbortController();abort=controller
  const context=buildContext(clean,snap.observation,snap.state,snap.attention,turns,snap.events,snap.research,snap.continuity)
  debug.context=context;debug.outcome='thinking';port.listen();update({phase:'thinking',notice:'듣고 있어…'})
  let raw:unknown
  let timeoutTimer:ReturnType<typeof setTimeout>|undefined
  let thinkingTimer:ReturnType<typeof setTimeout>|undefined
  let rejectAbort:()=>void=()=>{}
  try{
   const timeout=new Promise<never>((_,reject)=>{
    rejectAbort=()=>reject(Error('cancelled'))
    controller.signal.addEventListener('abort',rejectAbort,{once:true})
    timeoutTimer=setTimeout(()=>{reject(Error('timeout'));controller.abort()},timing.timeout)
   })
   const delay=new Promise<void>(resolve=>{thinkingTimer=setTimeout(resolve,timing.thinking)})
   const result=await Promise.all([Promise.race([Promise.resolve().then(()=>provider.respond(context,controller.signal)),timeout]),delay]);raw=result[0];debug.outcome='response'
  }catch{raw={speech:turns.at(-1)?.moru==='잠깐 딴생각했어.'?'응, 다시 듣고 있어.':'잠깐 딴생각했어.',attention:'USER'};debug.outcome='local fallback'}
  finally{clearTimeout(timeoutTimer);clearTimeout(thinkingTimer);controller.signal.removeEventListener('abort',rejectAbort)}
  if(token!==id||!port)return false
  debug.raw=raw;const parsed=parseResponse(raw,context);debug.parsed=parsed.response;debug.rejected=parsed.rejected
  if(!parsed.response.speech||!port.speak(parsed.response)){update({phase:'composing',notice:'잠깐 뒤에 다시 말 걸어줘.'});return false}
  const turn={user:clean,moru:parsed.response.speech}
  turns.push(turn);if(turns.length>8)turns.shift()
  history.push(turn);if(history.length>60)history.shift()
  if(typeof localStorage!=='undefined')try{localStorage.setItem(historyKey,JSON.stringify(history))}catch{/* Storage is optional. */}
  update({phase:'speaking',notice:'',reply:parsed.response.speech})
  release=setTimeout(()=>{if(token!==id)return;port?.hold(false);update({phase:'closed',notice:''})},speechDuration(parsed.response.speech)*1000)
  return true
 }
 return {subscribe(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn)}},getSnapshot:()=>state,getHistory:()=>history.slice(),debug,turns,open,send,cancel,
  attach(next:Port){port=next;update({ready:true});return()=>{if(port===next){cancel();port=null;update({ready:false})}}},
 }
}
export const conversationSession=createConversationSession(conversationProvider)
export const conversationActive=()=>conversationSession.getSnapshot().phase!=='closed'
