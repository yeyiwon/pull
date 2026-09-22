import { MockConversationAdapter, parseResponse } from './model.ts'
import type { Context, MoruConversationProvider } from './model.ts'
import { conversationPayload } from './transport.ts'
export class ServerConversationProvider implements MoruConversationProvider {
 mode:'AUTO'|'MOCK'|'REAL'='AUTO'
 lastProvider='MOCK'
 private requestFetch:typeof fetch
 constructor(requestFetch:typeof fetch=fetch){this.requestFetch=requestFetch}
 async respond(context:Context,signal:AbortSignal):Promise<unknown>{
  if(this.mode==='MOCK'){this.lastProvider='MOCK';return new MockConversationAdapter().respond(context,signal)}
  try {
   const result=await this.requestFetch('/api/moru-conversation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(conversationPayload(context)),signal})
   if(!result.ok)throw Error('Conversation unavailable')
   const data=await result.json() as {response?:unknown;provider?:string}
   const parsed=parseResponse(data.response,context)
   if(!parsed.response.speech)throw Error('Invalid response')
   this.lastProvider=['MOCK','REAL','FALLBACK'].includes(data.provider??'')?data.provider!:'FALLBACK'
   return parsed.response
  }catch{
   if(signal.aborted)throw Error('Conversation cancelled')
   this.lastProvider='FALLBACK'
   return new MockConversationAdapter().respond(context,signal)
  }
 }
}
export const conversationProvider=new ServerConversationProvider()
