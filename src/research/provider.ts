import { object, parseResearch } from './model.ts'
import type { MoruResearchProvider, ResearchContext, ResearchReply } from './model.ts'
export class ServerResearchProvider implements MoruResearchProvider{
 constructor(privateFetch:typeof fetch=(input,init)=>fetch(input,init)){this.requestFetch=privateFetch}
 private requestFetch:typeof fetch
 async explore(context:ResearchContext,signal:AbortSignal):Promise<ResearchReply>{
  const response=await this.requestFetch('/api/moru-research',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(context),signal})
  if(!response.ok)throw Error(`research_http_${response.status}`)
  const value=object(await response.json())
  if(value.provider!=='REAL'&&value.provider!=='MOCK')throw Error('research_provider')
  return {provider:value.provider,result:parseResearch(value.result,context.topic)}
 }
}
