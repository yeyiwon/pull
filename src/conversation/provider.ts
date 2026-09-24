import { MockConversationAdapter, parseResponse } from './model.ts'
import type { Context, MoruConversationProvider } from './model.ts'
import { conversationPayload } from './transport.ts'
import { backendEndpointCategory, resolveBackendEndpoint } from '../api/backend.ts'
type TraceStage='conversation_submit'|'provider_selected'|'request_serialize'|'fetch_started'|'fetch_response'|'response_parse'|'response_validate'|'fallback'
type TraceEntry={stage:TraceStage;timestamp:string;elapsedMs:number;url?:string;endpointCategory?:string;status?:number;mode?:string;failureStage?:TraceStage;errorType?:string;description?:string;rejectedFields?:string[]}
export class ServerConversationProvider implements MoruConversationProvider {
 mode:'AUTO'|'MOCK'|'REAL'='AUTO'
 lastProvider='MOCK'
 routingTrace:TraceEntry[]=[]
 private traceStart=0
 private requestFetch:typeof fetch
 constructor(requestFetch:typeof fetch=(input,init)=>fetch(input,init)){this.requestFetch=requestFetch}
 private trace(stage:TraceStage,extra:Omit<TraceEntry,'stage'|'timestamp'|'elapsedMs'>={}){
  if(!import.meta.env?.DEV)return
  if(stage==='conversation_submit'){this.routingTrace=[];this.traceStart=performance.now()}
  this.routingTrace.push({stage,timestamp:new Date().toISOString(),elapsedMs:Math.round(performance.now()-this.traceStart),...extra})
 }
 private async exchange(payload:unknown,signal:AbortSignal,probe=false,control=false){
  let stage:TraceStage='request_serialize'
  try{
   this.trace(stage)
   const body=JSON.stringify(payload)
   stage='fetch_started'
   const endpoint=resolveBackendEndpoint('/api/moru-conversation')
   this.trace(stage,{url:endpoint,endpointCategory:backendEndpointCategory()})
   // Control probe changes only fetch invocation, not the actual conversation adapter.
   const options={method:'POST',headers:{'Content-Type':'application/json',...(probe?{'X-Moru-Routing-Probe':'1'}:{})},body,signal}
   const result=control?await fetch(endpoint,options):await this.requestFetch(endpoint,options)
   stage='fetch_response';this.trace(stage,{status:result.status})
   if(!result.ok)throw Error('HTTP response failed')
   stage='response_parse';this.trace(stage)
   const data=await result.json() as {response?:unknown;provider?:string;probe?:string;reachedHandler?:boolean}
   stage='response_validate';this.trace(stage)
   return data
  }catch(error){
   this.trace('fallback',{failureStage:stage,errorType:error instanceof TypeError?'TypeError':error instanceof SyntaxError?'SyntaxError':'RequestError',description:error instanceof Error&&/illegal invocation/i.test(error.message)?'Illegal invocation (fetch receiver).':signal.aborted?'Request aborted.':'Request failed at the recorded stage.'})
   throw error
  }
 }
 async probe(control=false){
  if(!import.meta.env?.DEV)return
  this.trace('conversation_submit');this.trace('provider_selected',{mode:control?'NON_PROVIDER_CONTROL':'NON_PROVIDER_ADAPTER'})
  try{const data=await this.exchange({},new AbortController().signal,true,control);this.trace('response_validate',{description:data.probe==='moru-local-route'&&data.reachedHandler?'Synthetic handler response confirmed.':'Unexpected probe response.'})}catch{/* trace retained; no retry or provider fallback */}
 }
 async respond(context:Context,signal:AbortSignal):Promise<unknown>{
  this.trace('conversation_submit');this.trace('provider_selected',{mode:this.mode})
  if(this.mode==='MOCK'){this.lastProvider='MOCK';return new MockConversationAdapter().respond(context,signal)}
  try {
   this.trace('request_serialize')
   const data=await this.exchange(conversationPayload(context),signal)
   const parsed=parseResponse(data.response,context)
   if(!parsed.response.speech){this.trace('fallback',{failureStage:'response_validate',rejectedFields:parsed.rejected});throw Error('Invalid response')}
   this.lastProvider=['MOCK','REAL','FALLBACK'].includes(data.provider??'')?data.provider!:'FALLBACK'
   if(this.lastProvider==='FALLBACK')this.trace('fallback',{failureStage:'response_validate',description:'Server reported fallback.'})
   return parsed.response
  }catch{
   const last=this.routingTrace.at(-1)
   if(last&&last.stage!=='fallback')this.trace('fallback',{failureStage:last.stage,description:signal.aborted?'Request aborted.':'Client payload or response validation failed.'})
   if(signal.aborted)throw Error('Conversation cancelled')
   this.lastProvider='FALLBACK'
   return new MockConversationAdapter().respond(context,signal)
  }
 }
}
export const conversationProvider=new ServerConversationProvider()
