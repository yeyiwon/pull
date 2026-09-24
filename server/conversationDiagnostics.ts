import type { Settings } from './moruConversation.ts'

export type DiagnosticStage = 'local_adapter' | 'request_validation' | 'configuration' | 'rate_limit' | 'provider_request' | 'provider_http' | 'response_decode' | 'response_parse' | 'response_validation' | 'complete'
export type ConversationDiagnostic = {
 provider: 'OPENAI'; configured: boolean; model: string | null; reasoningEffort: string | null
 startedAt: string; endedAt: string | null; latencyMs: number | null
 providerStartedAt: string | null; providerEndedAt: string | null; providerLatencyMs: number | null
 reachedProvider: boolean; responseReceived: boolean; status: number | null; localStatus: number | null
 stage: DiagnosticStage; errorType: string | null; errorCode: string | null; message: string | null
 timedOut: boolean; cancelled: boolean; fallback: boolean; rejectedFields: string[]
}
export type DiagnosticSink = (diagnostic: ConversationDiagnostic) => void

// Never forward provider error messages: they may echo keys, headers or user text.
// Preserve safe identifiers and supply our own message for the observed stage/status.
export function safeDiagnosticIdentifier(value: unknown, secret?: string): string | null {
 if(typeof value!=='string'||!value||value.length>120||!/^[-a-zA-Z0-9_.:]+$/.test(value))return null
 if(/sk-|bearer|authorization/i.test(value)||(secret&&value.includes(secret)))return null
 return value
}
export function diagnosticErrorCode(error:unknown,secret?:string):string|null {
 if(!error||typeof error!=='object')return null
 const value=error as {code?:unknown;cause?:unknown}
 const cause=value.cause&&typeof value.cause==='object'?value.cause as {code?:unknown}:null
 return safeDiagnosticIdentifier(value.code??cause?.code,secret)
}
export function startDiagnostic(settings: Settings, sink?: DiagnosticSink) {
 if(!sink)return null
 const start=performance.now()
 let providerStart=0,done=false
 const data:ConversationDiagnostic={provider:'OPENAI',configured:!!settings.OPENAI_API_KEY,
  model:safeDiagnosticIdentifier(settings.MORU_OPENAI_MODEL?.trim(),settings.OPENAI_API_KEY),
  reasoningEffort:safeDiagnosticIdentifier(settings.MORU_OPENAI_REASONING_EFFORT?.trim(),settings.OPENAI_API_KEY),
  startedAt:new Date().toISOString(),endedAt:null,latencyMs:null,providerStartedAt:null,providerEndedAt:null,providerLatencyMs:null,
  reachedProvider:false,responseReceived:false,status:null,localStatus:null,stage:'request_validation',errorType:null,errorCode:null,message:null,
  timedOut:false,cancelled:false,fallback:false,rejectedFields:[]}
 return {data,
  providerStart(){providerStart=performance.now();data.providerStartedAt=new Date().toISOString();data.reachedProvider=true},
  providerEnd(){if(data.providerStartedAt&&!data.providerEndedAt){data.providerEndedAt=new Date().toISOString();data.providerLatencyMs=Math.round(performance.now()-providerStart)}},
  httpError(error:unknown,status:number){
   const e=error&&typeof error==='object'?error as Record<string,unknown>:{}
   data.errorType=safeDiagnosticIdentifier(e.type,settings.OPENAI_API_KEY)
   data.errorCode=safeDiagnosticIdentifier(e.code,settings.OPENAI_API_KEY)
   data.message=({400:'Provider rejected request parameters or schema.',401:'Provider authentication failed.',403:'Provider access denied.',404:'Provider model or resource not found.',429:'Provider rate limit or quota exceeded.'} as Record<number,string>)[status]??(status>=500?'Provider server error.':'Provider HTTP error.')
  },
  finish(localStatus:number){
   if(done)return;done=true;data.localStatus=localStatus;data.endedAt=new Date().toISOString();data.latencyMs=Math.round(performance.now()-start)
   // Diagnostics must never change conversation behavior if a development sink fails.
   try{sink({...data,rejectedFields:[...data.rejectedFields]})}catch{/* diagnostic sink only */}
  },
 }
}
