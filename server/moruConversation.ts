import { startDiagnostic, diagnosticErrorCode } from './conversationDiagnostics.ts'
import type { DiagnosticSink } from './conversationDiagnostics.ts'
import { MORU_ACTIONS } from '../src/characters/actions.ts'
import { MockConversationAdapter, parseResponse } from '../src/conversation/model.ts'
import type { Context } from '../src/conversation/model.ts'
import { conversationPayload, WORLD_EVENT_LABELS } from '../src/conversation/transport.ts'
const actions=MORU_ACTIONS.filter(a=>a.category==='gesture').map(a=>a.id)
const nullableEnum=(values:readonly string[])=>({type:['string','null'],enum:[...values,null]})
export const responseSchema={type:'object',additionalProperties:false,required:['speech','emotion','attention','action','emote'],properties:{
 speech:{type:'string',minLength:1,maxLength:120},emotion:nullableEnum(['calm','happy','curious','sleepy','warm']),
 attention:{type:'string',enum:['USER','SKY','WATER','HOME','WORLD','NONE']},action:nullableEnum(actions),emote:nullableEnum(['heart','sparkle','question','surprise','music']),
}}
export { compactIdentity as identity } from './moruIdentity.ts'
import { compactIdentity as identity } from './moruIdentity.ts'
function obj(v:unknown):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('context');return v as Record<string,unknown>}
function str(v:unknown,max:number){if(typeof v!=='string'||!v.trim()||v.length>max)throw Error('text');return v.trim()}
function choice(v:unknown,values:string[]){const s=str(v,60);if(!values.includes(s))throw Error('enum');return s}
function bool(v:unknown){if(typeof v!=='boolean')throw Error('boolean');return v}
function num(v:unknown){if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1)throw Error('number');return v}
function list(v:unknown){if(!Array.isArray(v)||v.length>8)throw Error('list');return v}
export function validateContext(raw:unknown):Context{
 const c=obj(raw),w=obj(c.world),m=obj(c.moru)
 return {userMessage:str(c.userMessage,280),
 world:{season:choice(w.season,['spring','summer','autumn','winter']),timeOfDay:choice(w.timeOfDay,['DAWN','MORNING','DAY','SUNSET','EVENING','NIGHT']),weather:choice(w.weather,['clear','cloudy','rain','snow','fog','storm']),location:choice(w.location,['home','water','field']) as Context['world']['location'],indoor:bool(w.indoor),nearWater:bool(w.nearWater),skyEvent:null},
 moru:{energy:num(m.energy),curiosity:num(m.curiosity),comfort:num(m.comfort),attention:num(m.attention),affection:num(m.affection),sleepiness:num(m.sleepiness),target:'WORLD'},
 recentConversation:list(c.recentConversation).map(v=>{const t=obj(v);return {user:str(t.user,280),moru:str(t.moru,120)}}),
 recentEvents:list(c.recentEvents).map((v,i)=>{const e=obj(v);return {key:String(i),at:0,event:choice(e.event,[...WORLD_EVENT_LABELS])}}),
 }
}
export function promptContext(c:Context){
 const payload=conversationPayload(c),level=(n:number)=>n<.34?'low':n>.66?'high':'medium'
 return {...payload,moru:Object.fromEntries(Object.entries(payload.moru).map(([k,v])=>[k,level(v)]))}
}
export type Settings={MORU_PROVIDER?:string;OPENAI_API_KEY?:string;MORU_OPENAI_MODEL?:string;MORU_OPENAI_REASONING_EFFORT?:string}
export function createConversationHandler(settings:Settings,requestFetch:typeof fetch=fetch,timeoutMs=9000,diagnosticSink?:DiagnosticSink){
 // Optional: omit for models without reasoning controls; never infer from a model name.
 const effort=settings.MORU_OPENAI_REASONING_EFFORT?.trim()
 if(effort&&!['none','minimal','low','medium','high','xhigh','max'].includes(effort))throw Error('Invalid MORU_OPENAI_REASONING_EFFORT')
 let windowStart=0,count=0,inFlight=0
 return async function handle(request:Request):Promise<Response>{
  const diagnostic=startDiagnostic(settings,diagnosticSink)
  const d=diagnostic?.data
  const json=(body:unknown,status=200)=>{if(d&&status>=400&&!d.message){d.errorType='local_request_rejected';d.message='Local request rejected before provider invocation.'}diagnostic?.finish(status);return Response.json(body,{status,headers:{'Cache-Control':'no-store'}})}
  if(request.method!=='POST')return json({error:'method'},405)
  // Development-only empty-body probe cannot enter provider code or use a key.
  if(d&&request.headers.get('x-moru-routing-probe')==='1'){
   d.stage='complete';d.message='Non-provider routing probe reached handler.'
   return json({probe:'moru-local-route',reachedHandler:true})
  }
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'origin'},403)
  if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'content type'},415)
  let context:Context
  try{
   const reader=request.body?.getReader();if(!reader)throw Error('body')
   const chunks:Uint8Array[]=[];let size=0
   for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>12000){await reader.cancel();return json({error:'size'},413)}chunks.push(value)}
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
   context=validateContext(JSON.parse(new TextDecoder().decode(bytes)))
  }catch{if(d){d.errorType='invalid_context';d.message='Local request context validation failed.'}return json({error:'context'},400)}
  const mock=async(provider='MOCK')=>json({response:parseResponse(await new MockConversationAdapter().respond(context,request.signal),context).response,provider})
  const model=settings.MORU_OPENAI_MODEL?.trim()
  if(settings.MORU_PROVIDER!=='REAL'||!settings.OPENAI_API_KEY||!model){if(d){d.stage='configuration';d.message='REAL provider configuration is incomplete or MOCK is selected.'}return mock()}
  // Per-instance safeguard. Use deployment protection/distributed limits before public access.
  const now=Date.now();if(now-windowStart>60000){windowStart=now;count=0}
  if(count>=12||inFlight>=2){if(d){d.stage='rate_limit';d.errorType='local_rate_limit';d.message='Local per-instance request limit reached.'}return json({error:'busy'},429)}
  count++;inFlight++
  const controller=new AbortController(),abort=()=>{if(d)d.cancelled=true;controller.abort()}
  request.signal.addEventListener('abort',abort,{once:true});if(request.signal.aborted)abort()
  const timer=setTimeout(()=>{if(d)d.timedOut=true;controller.abort()},timeoutMs)
  try{
   if(d)d.stage='provider_request'
   diagnostic?.providerStart()
   const response=await requestFetch('https://api.openai.com/v1/responses',{method:'POST',signal:controller.signal,headers:{Authorization:`Bearer ${settings.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model,...(effort?{reasoning:{effort}}:{}),store:false,max_output_tokens:350,instructions:identity,input:JSON.stringify(promptContext(context)),text:{format:{type:'json_schema',name:'moru_response',strict:true,schema:responseSchema}}})})
   if(d){d.status=response.status;d.responseReceived=true;d.stage='provider_http'}
   if(!response.ok){
    if(diagnostic){const error=await response.json().catch(()=>null);diagnostic.httpError(error&&typeof error==='object'&&'error' in error?error.error:null,response.status)}
    throw Error('provider')
   }
   if(d)d.stage='response_decode'
   const data=await response.json() as {status?:string;output?:{type:string;content?:{type:string;text?:string}[]}[]}
   if(data.status!=='completed'){if(d){d.errorType='incomplete_response';d.message='Provider response was not completed.'}throw Error('incomplete')}
   const content=data.output?.filter(o=>o.type==='message').flatMap(o=>o.content??[]).filter(c=>c.type==='output_text').map(c=>c.text??'').join('')
   if(d)d.stage='response_parse'
   const raw=JSON.parse(content??'')
   if(d)d.stage='response_validation'
   const parsed=parseResponse(raw,context)
   if(d)d.rejectedFields=parsed.rejected
   if(!parsed.response.speech)throw Error('speech')
   diagnostic?.providerEnd()
   if(d)d.stage='complete'
   return json({response:parsed.response,provider:'REAL'})
  }catch(error){
   diagnostic?.providerEnd()
   if(d){d.fallback=true
    if(!d.errorCode)d.errorCode=diagnosticErrorCode(error,settings.OPENAI_API_KEY)
    if(!d.errorType)d.errorType=d.timedOut?'timeout':d.cancelled?'cancelled':d.stage==='provider_request'?'transport_error':d.stage==='response_parse'?'invalid_json':d.stage==='response_validation'?'invalid_structured_response':'provider_response_error'
    if(!d.message)d.message=d.timedOut?'Provider deadline exceeded.':d.cancelled?'Request cancelled.':d.stage==='provider_request'?'Provider fetch failed before an HTTP response.':d.stage==='response_parse'?'Structured output was not valid JSON.':d.stage==='response_validation'?'Structured response validation failed.':'Provider response decoding failed.'
   }
   return mock('FALLBACK')
  }
  finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);inFlight--}
 }
}
