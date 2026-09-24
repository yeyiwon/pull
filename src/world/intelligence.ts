import type { Observation } from './brain/types.ts'

export type ExperienceSource='FOREGROUND'|'BACKGROUND'
export type ExperienceOutcome='completed'|'observed'|'discovered'|'revisited'|'shared'
export type PreferenceCategory='LOCATION'|'ACTIVITY'|'WEATHER'|'TIME'|'SEASON'|'EVENT'|'ENVIRONMENT'
export type Experience={id:string;timestamp:string;source:ExperienceSource;location:string|null;activity:string;nearbyObjects:string[];season:string;timeOfDay:string;weather:string;activeEvent:string|null;userPresent:boolean;voluntary:boolean;novelty:number;significance:number;outcome:ExperienceOutcome;dwellSeconds:number}
export type Preference={value:number;evidence:number;lastUpdatedAt:string}
export type Familiarity={visits:number;totalDwellSeconds:number;lastVisitAt:string;meaningfulExperiences:number;familiarity:number}
export type AdaptiveMemory={id:string;experienceId:string;timestamp:string;tags:string[];significance:number;userShared:boolean;retrievals:number}
export type IntelligenceState={experiences:Experience[];preferences:Record<string,Preference>;familiarity:Record<string,Familiarity>;memories:AdaptiveMemory[];experienceSequence:number}
export type ScoreParts={context:number;novelty:number;preference:number;memory:number;event:number;transient:number;repetition:number;total:number;retrievedMemoryIds:string[]}
export type ConversationIntelligence={tendencies:{kind:PreferenceCategory;subject:string;confidence:'weak emerging'|'recurring'|'well-supported'}[];memories:{tags:string[];userShared:boolean;age:'recent'|'older'}[];recentExperience:{location:string|null;activity:string;outcome:ExperienceOutcome}|null}

const clamp=(value:number,min=-1,max=1)=>Math.max(min,Math.min(max,value))
const prefKey=(category:PreferenceCategory,value:string)=>`${category}:${value}`
const tags=(value:string)=>new Set(value.toLowerCase().split(/[^a-z0-9가-힣_-]+/).filter(Boolean))
export const emptyIntelligence=():IntelligenceState=>({experiences:[],preferences:{},familiarity:{},memories:[],experienceSequence:0})

export function readIntelligence(raw:unknown,now:string):IntelligenceState{
 const fresh=emptyIntelligence();if(!raw||typeof raw!=='object')return fresh;const value=raw as Partial<IntelligenceState>
 if(Array.isArray(value.experiences))fresh.experiences=value.experiences.slice(-48).flatMap(item=>validExperience(item)?[item]:[])
 if(value.preferences&&typeof value.preferences==='object')for(const [key,item] of Object.entries(value.preferences).slice(0,128)){if(!item||typeof item!=='object')continue;const p=item as Partial<Preference>,e=Math.floor(Number(p.evidence));if(key.length<=120&&Number.isFinite(p.value)&&e>0)fresh.preferences[key]={value:clamp(Number(p.value)),evidence:Math.min(999,e),lastUpdatedAt:validDate(p.lastUpdatedAt,now)}}
 if(value.familiarity&&typeof value.familiarity==='object')for(const [key,item] of Object.entries(value.familiarity).slice(0,64)){if(!item||typeof item!=='object')continue;const f=item as Partial<Familiarity>;if(key.length<=80)fresh.familiarity[key]={visits:bounded(f.visits,9999),totalDwellSeconds:bounded(f.totalDwellSeconds,1e7),lastVisitAt:validDate(f.lastVisitAt,now),meaningfulExperiences:bounded(f.meaningfulExperiences,9999),familiarity:clamp(Number(f.familiarity)||0,0,1)}}
 if(Array.isArray(value.memories))fresh.memories=value.memories.slice(-32).flatMap(item=>validMemory(item)?[item]:[])
 fresh.experienceSequence=bounded(value.experienceSequence,Number.MAX_SAFE_INTEGER);return fresh
}
function bounded(value:unknown,max:number){const n=Number(value);return Number.isFinite(n)&&n>=0?Math.min(max,Math.floor(n)):0}
function validDate(value:unknown,fallback:string){return typeof value==='string'&&Number.isFinite(Date.parse(value))?value:fallback}
function validExperience(value:unknown):value is Experience{return !!value&&typeof value==='object'&&typeof (value as Experience).id==='string'&&typeof (value as Experience).timestamp==='string'&&typeof (value as Experience).activity==='string'&&['FOREGROUND','BACKGROUND'].includes((value as Experience).source)}
function validMemory(value:unknown):value is AdaptiveMemory{return !!value&&typeof value==='object'&&typeof (value as AdaptiveMemory).id==='string'&&typeof (value as AdaptiveMemory).experienceId==='string'&&Array.isArray((value as AdaptiveMemory).tags)}

export function recordExperience(state:IntelligenceState,input:Omit<Experience,'id'>){
 const experience:{id:string}&Omit<Experience,'id'>={...input,id:`exp-${++state.experienceSequence}`};state.experiences.push(experience);state.experiences=state.experiences.slice(-48)
 // Preferences are durable, but stale evidence should slowly lose influence rather than
 // becoming a permanent personality lock-in.
 for(const preference of Object.values(state.preferences)){
  const elapsedDays=Math.max(0,(Date.parse(input.timestamp)-Date.parse(preference.lastUpdatedAt))/86400000)
  if(elapsedDays>=1)preference.value=clamp(preference.value*Math.exp(-elapsedDays/240))
 }
 const strength=(input.source==='BACKGROUND'?.35:1)*(input.voluntary?1:.35)*(.45+input.significance*.35+Math.min(1,input.dwellSeconds/12)*.2)
 const signals:[PreferenceCategory,string][]=[['LOCATION',input.location??''],['ACTIVITY',input.activity],['WEATHER',input.weather],['TIME',input.timeOfDay],['SEASON',input.season],...(input.activeEvent?[['EVENT',input.activeEvent] as [PreferenceCategory,string]]:[])]
 for(const [category,value] of signals){if(!value)continue;const key=prefKey(category,value),previous=state.preferences[key],evidence=(previous?.evidence??0)+1,alpha=Math.min(.12,.035+strength*.055),target=clamp(.12+input.novelty*.08+input.significance*.08);state.preferences[key]={value:clamp((previous?.value??0)*(1-alpha)+target*alpha),evidence,lastUpdatedAt:input.timestamp}}
 if(Object.keys(state.preferences).length>128){
  const retained=Object.entries(state.preferences).sort(([,a],[,b])=>b.evidence-a.evidence||Date.parse(b.lastUpdatedAt)-Date.parse(a.lastUpdatedAt)).slice(0,128)
  state.preferences=Object.fromEntries(retained)
 }
 if(input.location){const old=state.familiarity[input.location]??{visits:0,totalDwellSeconds:0,lastVisitAt:input.timestamp,meaningfulExperiences:0,familiarity:0};old.visits++;old.totalDwellSeconds+=input.dwellSeconds;old.lastVisitAt=input.timestamp;if(input.significance>=.6)old.meaningfulExperiences++;old.familiarity=clamp(1-Math.exp(-(old.visits*.12+old.totalDwellSeconds/240+old.meaningfulExperiences*.18)),0,1);state.familiarity[input.location]=old}
 if(Object.keys(state.familiarity).length>64){
  const retained=Object.entries(state.familiarity).sort(([,a],[,b])=>Date.parse(b.lastVisitAt)-Date.parse(a.lastVisitAt)||b.familiarity-a.familiarity).slice(0,64)
  state.familiarity=Object.fromEntries(retained)
 }
 if(input.significance>=.72||input.activeEvent&&input.significance>=.55){const memoryTags=[input.location,input.activity,input.weather,input.season,input.timeOfDay,input.activeEvent].filter((v):v is string=>!!v);state.memories.push({id:`mem-${experience.id}`,experienceId:experience.id,timestamp:input.timestamp,tags:[...new Set(memoryTags)],significance:input.significance,userShared:input.userPresent,retrievals:0});state.memories=state.memories.slice(-32)}
 return experience
}

export function retrieveMemories(state:IntelligenceState,query:string[],now=Date.now(),limit=3){const wanted=new Set(query.flatMap(value=>[...tags(value)]));return state.memories.map(memory=>{const overlap=memory.tags.reduce((sum,tag)=>sum+([...tags(tag)].some(value=>wanted.has(value))?1:0),0),ageDays=Math.max(0,(now-Date.parse(memory.timestamp))/86400000),recency=Math.exp(-ageDays/30),score=overlap*.45+memory.significance*.35+recency*.12+(memory.userShared?.08:0);return {memory,score}}).filter(item=>item.score>.25).sort((a,b)=>b.score-a.score).slice(0,limit)}

function preferenceBias(state:IntelligenceState,category:PreferenceCategory,value:string){const p=state.preferences[prefKey(category,value)];if(!p)return 0;return p.value*Math.min(1,p.evidence/6)*.22}
export function conversationIntelligence(state:IntelligenceState,message:string,observation:Observation):ConversationIntelligence|undefined{
 if(!/좋아|선호|어디|가고 싶|기억|전에|같이|눈|비|계절|시간/.test(message))return undefined
 const requested:PreferenceCategory[]=/어디|장소|가고 싶/.test(message)?['LOCATION']:/눈|비|날씨/.test(message)?['WEATHER']:['LOCATION','ACTIVITY','WEATHER','TIME','SEASON','EVENT']
 const tendencies=Object.entries(state.preferences).flatMap(([key,value])=>{const split=key.indexOf(':'),kind=key.slice(0,split) as PreferenceCategory,subject=key.slice(split+1);if(!requested.includes(kind)||value.evidence<2||value.value<=.01)return [];const confidence=value.evidence>=8?'well-supported' as const:value.evidence>=4?'recurring' as const:'weak emerging' as const;return [{kind,subject,confidence,rank:value.value*Math.min(1,value.evidence/8)}]}).sort((a,b)=>b.rank-a.rank).slice(0,3).map(({kind,subject,confidence})=>({kind,subject,confidence}))
 const current=Date.now(),memories=retrieveMemories(state,[message,observation.season,observation.weather,observation.timeOfDay,...(observation.activeEvents??[])],current,2).map(({memory})=>({tags:memory.tags.slice(0,6),userShared:memory.userShared,age:current-Date.parse(memory.timestamp)<30*86400000?'recent' as const:'older' as const}))
 const recent=state.experiences.at(-1),recentExperience=recent?{location:recent.location,activity:recent.activity,outcome:recent.outcome}:null
 return tendencies.length||memories.length||recentExperience?{tendencies,memories,recentExperience}:undefined
}
export function adaptiveScore(state:IntelligenceState,input:{id:string;activity:string;observation:Observation;novelty:number;context:number;event:number;repetition:number;now?:number}):ScoreParts{
 const query=[input.id,input.activity,input.observation.season,input.observation.weather,input.observation.timeOfDay,...(input.observation.activeEvents??[])],retrieved=retrieveMemories(state,query,input.now,3)
 const preference=preferenceBias(state,'LOCATION',input.id)+preferenceBias(state,'ACTIVITY',input.activity)+preferenceBias(state,'WEATHER',input.observation.weather)+preferenceBias(state,'TIME',input.observation.timeOfDay)
 const memory=Math.min(.2,retrieved.reduce((sum,item)=>sum+item.score*.035,0)),novelty=input.novelty*.28,transient=input.novelty>.5?.08:0
 const total=input.context+novelty+preference+memory+input.event+transient-input.repetition
 return {context:input.context,novelty,preference,memory,event:input.event,transient,repetition:-input.repetition,total,retrievedMemoryIds:retrieved.map(item=>item.memory.id)}
}
