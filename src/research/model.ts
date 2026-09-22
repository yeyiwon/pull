export type Confidence = 'LIKELY' | 'UNCERTAIN' | 'UNKNOWN'
export type ResearchResult = {
 topic:string; question:string; facts:string[]; inferences:string[]; unknowns:string[]; ideas:string[]
 associations:{topic:string;connection:string}[]; confidence:Confidence; needsExternalResearch:boolean
}
export type ResearchContext = {topic:string;question:string;observations:string[];previous:{inferences:string[];unknowns:string[]}}
export type ResearchReply = {provider:'MOCK'|'REAL';result:ResearchResult}
export interface MoruResearchProvider {explore(context:ResearchContext,signal:AbortSignal):Promise<ResearchReply>}
export type ResearchProgress = {status:'PENDING'|'RESEARCHING'|'COMPLETE'|'UNRESOLVED';lastAttemptAt:number;completedAt:number;nextAllowedAt:number;provider:'MOCK'|'REAL'|null;result:ResearchResult|null;error:string|null}
export const emptyProgress=():ResearchProgress=>({status:'PENDING',lastAttemptAt:0,completedAt:0,nextAllowedAt:0,provider:null,result:null,error:null})
const stringSchema={type:'string',minLength:1,maxLength:180}
const listSchema={type:'array',maxItems:3,items:stringSchema}
export const researchSchema={type:'object',additionalProperties:false,required:['topic','question','facts','inferences','unknowns','ideas','associations','confidence','needsExternalResearch'],properties:{
 topic:stringSchema,question:stringSchema,facts:listSchema,inferences:listSchema,unknowns:listSchema,ideas:listSchema,
 associations:{type:'array',maxItems:2,items:{type:'object',additionalProperties:false,required:['topic','connection'],properties:{topic:stringSchema,connection:stringSchema}}},
 confidence:{type:'string',enum:['LIKELY','UNCERTAIN','UNKNOWN']},needsExternalResearch:{type:'boolean'},
}}
export function object(v:unknown):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('shape');return v as Record<string,unknown>}
export function short(v:unknown):string{if(typeof v!=='string'||!v.trim()||v.length>180||/[<>\r\n]/.test(v))throw Error('text');return v.trim()}
export function texts(v:unknown,max=3):string[]{if(!Array.isArray(v)||v.length>max)throw Error('list');return [...new Set(v.map(short))]}
export function parseResearch(v:unknown,topic?:string):ResearchResult{
 const r=object(v)
 if(Object.keys(r).length!==researchSchema.required.length||Object.keys(r).some(k=>!researchSchema.required.includes(k)))throw Error('fields')
 const t=short(r.topic);if(topic&&t!==topic)throw Error('topic')
 if(!['LIKELY','UNCERTAIN','UNKNOWN'].includes(String(r.confidence))||typeof r.needsExternalResearch!=='boolean')throw Error('confidence')
 if(!Array.isArray(r.associations)||r.associations.length>2)throw Error('associations')
 return {topic:t,question:short(r.question),facts:texts(r.facts),inferences:texts(r.inferences),unknowns:texts(r.unknowns),ideas:texts(r.ideas),confidence:r.confidence as Confidence,needsExternalResearch:r.needsExternalResearch,associations:r.associations.map(v=>{const a=object(v);if(Object.keys(a).length!==2)throw Error('association');return {topic:short(a.topic),connection:short(a.connection)}})}
}
export function readProgress(raw:unknown,topic:string):ResearchProgress{
 const fresh=emptyProgress()
 try{const r=object(raw);const number=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:0
  const result=r.result?parseResearch(r.result,topic):null
  const provider=r.provider==='REAL'||r.provider==='MOCK'?r.provider:null
  return {...fresh,lastAttemptAt:number(r.lastAttemptAt),completedAt:number(r.completedAt),nextAllowedAt:number(r.nextAllowedAt),provider,result,
   status:r.status==='COMPLETE'&&result&&provider?'COMPLETE':r.status==='RESEARCHING'||r.status==='UNRESOLVED'?'UNRESOLVED':'PENDING',error:r.status==='RESEARCHING'?'interrupted':r.status==='UNRESOLVED'?'unresolved':null}
 }catch{return fresh}
}
export type ResearchSummary={currentFascination:string|null;activeResearch:{topic:string;question:string;status:ResearchProgress['status']}|null;recentDiscovery:{topic:string;claim:string;kind:'MODEL_KNOWLEDGE';confidence:Confidence;needsExternalResearch:boolean}|null}
export function parseResearchSummary(raw:unknown):ResearchSummary|undefined{
 if(raw==null)return undefined
 try{const r=object(raw),a=r.activeResearch==null?null:object(r.activeResearch),d=r.recentDiscovery==null?null:object(r.recentDiscovery)
  if(a&&!['PENDING','RESEARCHING','COMPLETE','UNRESOLVED'].includes(String(a.status)))return undefined
  if(d&&(d.kind!=='MODEL_KNOWLEDGE'||!['LIKELY','UNCERTAIN','UNKNOWN'].includes(String(d.confidence))||typeof d.needsExternalResearch!=='boolean'))return undefined
  return {currentFascination:r.currentFascination==null?null:short(r.currentFascination),activeResearch:a?{topic:short(a.topic),question:short(a.question),status:a.status as ResearchProgress['status']}:null,recentDiscovery:d?{topic:short(d.topic),claim:short(d.claim),kind:'MODEL_KNOWLEDGE',confidence:d.confidence as Confidence,needsExternalResearch:d.needsExternalResearch as boolean}:null}
 }catch{return undefined}
}
export class MockResearchProvider implements MoruResearchProvider{
 async explore(c:ResearchContext,signal:AbortSignal):Promise<ResearchReply>{
  if(signal.aborted)throw Error('aborted')
  const associations:Record<string,{topic:string;connection:string}>={snow:{topic:'crystal symmetry',connection:'눈의 형태에서 반복되는 대칭을 생각해볼 수 있다.'},reflection:{topic:'surface waves',connection:'수면의 작은 방향 차이와 반사 모양을 연결해볼 수 있다.'},leaves:{topic:'pigments',connection:'계절에 따른 잎의 색과 색소의 관계를 질문할 수 있다.'}}
  return {provider:'MOCK',result:{topic:c.topic,question:c.question,facts:[],inferences:['관찰한 상태만으로 원인이나 실제 표면의 모습까지 알 수는 없다.'],unknowns:[c.previous.unknowns[0]??c.question],ideas:['같은 곳을 다른 조건에서 다시 관찰해보고 싶다.'],associations:associations[c.topic]?[associations[c.topic]]:[],confidence:'UNKNOWN',needsExternalResearch:true}}
 }
}
