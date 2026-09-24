import { emptyIntelligence,recordExperience,type AdaptiveMemory,type Experience,type IntelligenceState } from '../world/intelligence.ts'
import type { PullCloudSnapshot } from './model.ts'

const stable=(value:unknown):string=>Array.isArray(value)?`[${value.map(stable).join(',')}]`:value&&typeof value==='object'?`{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>`${JSON.stringify(key)}:${stable(item)}`).join(',')}}`:JSON.stringify(value)
const experienceContent=(item:Experience)=>{const {id:_,...content}=item;return stable(content)}
function hash(value:string){let result=2166136261;for(let i=0;i<value.length;i++){result^=value.charCodeAt(i);result=Math.imul(result,16777619)}return (result>>>0).toString(36)}
function mergeExperiences(a:Experience[],b:Experience[]){
 const byId=new Map<string,Experience>(),byContent=new Set<string>()
 for(const item of [...a,...b].sort((x,y)=>Date.parse(x.timestamp)-Date.parse(y.timestamp)||x.id.localeCompare(y.id))){
  const content=experienceContent(item);if(byContent.has(content))continue
  const existing=byId.get(item.id);if(!existing){byId.set(item.id,structuredClone(item));byContent.add(content);continue}
  if(stable(existing)===stable(item))continue
  const next=`${item.id}-${hash(stable(item))}`;byId.set(next,{...structuredClone(item),id:next});byContent.add(content)
 }
 return [...byId.values()].sort((x,y)=>Date.parse(x.timestamp)-Date.parse(y.timestamp)||x.id.localeCompare(y.id)).slice(-48)
}
function rebuild(experiences:Experience[],sourceMemories:AdaptiveMemory[]):IntelligenceState{
 const state=emptyIntelligence()
 for(const item of experiences){const {id,...input}=item,created=recordExperience(state,input);const generatedId=created.id;created.id=id;for(const memory of state.memories){if(memory.experienceId===generatedId){memory.experienceId=id;memory.id=`mem-${id}`}}}
 const source=new Map(sourceMemories.map(item=>[item.experienceId,item]))
 state.memories=state.memories.map(item=>{const old=source.get(item.experienceId);return old?{...item,retrievals:Math.max(item.retrievals,old.retrievals),userShared:item.userShared||old.userShared,tags:[...new Set([...item.tags,...old.tags])].slice(0,12)}:item}).slice(-32)
 state.experienceSequence=Math.max(...experiences.map(item=>Number(item.id.match(/^exp-(\d+)$/)?.[1]??0)),experiences.length,0)
 return state
}
export function reconcileSnapshots(local:PullCloudSnapshot,cloud:PullCloudSnapshot,localDirty:boolean,baseRevision:number){
 const experiences=mergeExperiences(local.moru.intelligence.experiences,cloud.moru.intelligence.experiences)
 const memories=[...local.moru.intelligence.memories,...cloud.moru.intelligence.memories].filter((item,index,list)=>list.findIndex(other=>other.id===item.id)===index)
 const intelligence=rebuild(experiences,memories)
 const cloudAdvanced=cloud.revision>baseRevision,preferLocal=localDirty&&!cloudAdvanced
 const current=preferLocal?local:cloud
 const discoveries={...local.moru.autonomy.discoveries,...cloud.moru.autonomy.discoveries}
 for(const [id,value] of Object.entries(discoveries)){const candidates=[local.moru.autonomy.discoveries[id],cloud.moru.autonomy.discoveries[id]].filter(Boolean);if(candidates.some(item=>item.status==='familiar'))value.status='familiar'}
 return {...current,identity:cloud.identity,schemaVersion:1 as const,revision:cloud.revision,simulationRevision:cloud.simulationRevision,serverUpdatedAt:cloud.serverUpdatedAt,lastSimulatedAt:cloud.lastSimulatedAt,moru:{...current.moru,firstMetAt:[local.moru.firstMetAt,cloud.moru.firstMetAt].sort()[0],visitCount:Math.max(local.moru.visitCount,cloud.moru.visitCount),totalTimeTogetherSeconds:Math.max(local.moru.totalTimeTogetherSeconds,cloud.moru.totalTimeTogetherSeconds),autonomy:{discoveries,recentGoals:[...local.moru.autonomy.recentGoals,...cloud.moru.autonomy.recentGoals].filter((item,index,list)=>list.findIndex(other=>other.id===item.id&&other.completedAt===item.completedAt)===index).sort((a,b)=>Date.parse(a.completedAt)-Date.parse(b.completedAt)).slice(-12)},intelligence},world:{...current.world,discoveries:{...local.world.discoveries,...cloud.world.discoveries},recentSignificantEvents:[...local.world.recentSignificantEvents,...cloud.world.recentSignificantEvents].filter((item,index,list)=>list.findIndex(other=>other.kind===item.kind&&other.id===item.id&&other.at===item.at)===index).sort((a,b)=>a.at-b.at).slice(-12)}}
}
