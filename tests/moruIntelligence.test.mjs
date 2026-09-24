import test from 'node:test'
import assert from 'node:assert/strict'
import { adaptiveScore, emptyIntelligence, readIntelligence, recordExperience, retrieveMemories } from '../src/world/intelligence.ts'
import { readMemory } from '../src/world/brain/memory.ts'
import { buildContext } from '../src/conversation/model.ts'
import { conversationPayload } from '../src/conversation/transport.ts'
import { validateContext } from '../server/moruConversation.ts'

const at='2026-09-25T12:00:00.000Z'
const observation={date:'2026-09-25',hour:21,timeOfDay:'NIGHT',season:'winter',weather:'snow',wind:0,location:'water',indoor:false,nearWater:true,skyEvent:null,userMoving:false,userIdleDuration:20,userInteracted:false,userReturned:false,actionBusy:false,grounded:true,recentMoruActions:[],recentSpeech:[],activeEvents:['AURORA']}
const experience=(overrides={})=>({timestamp:at,source:'FOREGROUND',location:'MoonLake',activity:'watch-water',nearbyObjects:['water'],season:'winter',timeOfDay:'NIGHT',weather:'snow',activeEvent:null,userPresent:true,voluntary:true,novelty:.45,significance:.65,outcome:'completed',dwellSeconds:18,...overrides})

test('experience updates preference slowly and familiarity accumulates without one-visit lock-in',()=>{
 const state=emptyIntelligence()
 recordExperience(state,experience())
 assert.ok(state.preferences['LOCATION:MoonLake'].value>0)
 assert.ok(state.preferences['LOCATION:MoonLake'].value<.1)
 assert.equal(state.preferences['LOCATION:MoonLake'].evidence,1)
 assert.equal(state.familiarity.MoonLake.visits,1)
 for(let i=0;i<9;i++)recordExperience(state,experience({timestamp:new Date(Date.parse(at)+i*60000).toISOString()}))
 assert.equal(state.familiarity.MoonLake.visits,10)
 assert.equal(state.familiarity.MoonLake.totalDwellSeconds,180)
 assert.ok(state.familiarity.MoonLake.familiarity>.7)
 assert.ok(state.preferences['LOCATION:MoonLake'].value<.25)
})

test('background evidence is weaker and bounded storage keeps only useful recent state',()=>{
 const foreground=emptyIntelligence(),background=emptyIntelligence()
 recordExperience(foreground,experience())
 recordExperience(background,experience({source:'BACKGROUND',userPresent:false,voluntary:false}))
 assert.ok(background.preferences['LOCATION:MoonLake'].value<foreground.preferences['LOCATION:MoonLake'].value)
 const bounded=emptyIntelligence()
 for(let i=0;i<180;i++)recordExperience(bounded,experience({timestamp:new Date(Date.parse(at)+i*1000).toISOString(),location:`place-${i}`,activity:`activity-${i}`,significance:.9}))
 assert.equal(bounded.experiences.length,48)
 assert.ok(Object.keys(bounded.preferences).length<=128)
 assert.equal(bounded.memories.length,32)
 assert.ok(Object.keys(bounded.familiarity).length<=64)
 const read=readIntelligence(bounded,at)
 assert.ok(Object.keys(read.familiarity).length<=64)
})

test('associative memories influence matching choices while novelty remains competitive',()=>{
 const state=emptyIntelligence()
 recordExperience(state,experience({activity:'inspect-tree',location:'AncientTree',activeEvent:'aurora',significance:.95}))
 const matches=retrieveMemories(state,['snow','AncientTree'],Date.parse(at))
 assert.equal(matches[0].memory.tags.includes('AncientTree'),true)
 const familiar=adaptiveScore(state,{id:'AncientTree',activity:'inspect-tree',observation,novelty:.1,context:.2,event:.08,repetition:.03,now:Date.parse(at)})
 const novel=adaptiveScore(state,{id:'HiddenGarden',activity:'inspect-flowers',observation,novelty:.95,context:.2,event:0,repetition:0,now:Date.parse(at)})
 assert.ok(familiar.memory>0)
 assert.ok(novel.total>familiar.total,'novel places can still compete with a familiar preference')
})

test('contradictory context stays separate and old memory schemas migrate safely',()=>{
 const state=emptyIntelligence()
 recordExperience(state,experience({location:'SnowField',activity:'watch-snow'}))
 recordExperience(state,experience({location:'House',activity:'seek-shelter',weather:'storm',significance:.8}))
 assert.ok(state.preferences['LOCATION:SnowField'])
 assert.ok(state.preferences['LOCATION:House'])
 assert.ok(state.preferences['WEATHER:snow'])
 assert.ok(state.preferences['WEATHER:storm'])
 const migrated=readMemory(JSON.stringify({version:6,visitCount:3,autonomy:{discoveries:{},recentGoals:[]}}),at)
 assert.equal(migrated.version,7)
 assert.deepEqual(migrated.intelligence,emptyIntelligence())
 const restored=readMemory(JSON.stringify({...migrated,intelligence:state}),at)
 assert.equal(restored.intelligence.experiences.length,2)
 assert.equal(restored.intelligence.familiarity.House.visits,1)
})

test('retrieval is read-only and does not inflate persisted confidence during scoring',()=>{
 const state=emptyIntelligence()
 recordExperience(state,experience({significance:.95}))
 const before=structuredClone(state)
 for(let i=0;i<20;i++)adaptiveScore(state,{id:'MoonLake',activity:'watch-water',observation,novelty:.2,context:.2,event:0,repetition:0,now:Date.parse(at)})
 assert.deepEqual(state,before)
})

test('REAL conversation receives only bounded evidence-level context for relevant questions',()=>{
 const state=emptyIntelligence()
 for(let i=0;i<5;i++)recordExperience(state,experience({timestamp:new Date(Date.parse(at)+i*60000).toISOString(),significance:.9}))
 const internal={energy:.5,curiosity:.5,comfort:.5,attention:.5,affection:.5,sleepiness:.5}
 const relevant=buildContext('어디가 제일 좋아?',observation,internal,'WORLD',[],[],undefined,undefined,undefined,state)
 const payload=conversationPayload(relevant)
 assert.ok(payload.intelligence)
 assert.ok(payload.intelligence.tendencies.length<=3)
 assert.equal(payload.intelligence.tendencies[0].confidence,'recurring')
 assert.deepEqual(validateContext(payload).intelligence,payload.intelligence)
 const unrelated=conversationPayload(buildContext('안녕',observation,internal,'WORLD',[],[],undefined,undefined,undefined,state))
 assert.equal('intelligence' in unrelated,false)
 assert.equal(JSON.stringify(payload).includes('preferences'),false)
 assert.equal(JSON.stringify(payload).includes('evidence'),false)
})

test('REAL conversation payload keeps dense World perception within the server boundary',()=>{
 const candidates=Array.from({length:12},(_,index)=>({id:`tree-${index}`,type:'tree',position:{x:index,z:index},tags:['tree'],affordances:['approach','look_at','inspect'],distance:index,visible:true}))
 const context=buildContext('어디 가고 싶어?',observation,{energy:.5,curiosity:.5,comfort:.5,attention:.5,affection:.5,sleepiness:.5},'WORLD',[],[],undefined,undefined,{candidates,deicticTarget:null})
 const payload=conversationPayload(context)
 assert.equal(payload.perception.candidates.length,8)
 assert.doesNotThrow(()=>validateContext(payload))
})
