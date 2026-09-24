import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyOffline, simulateOffline, readOffline, continuitySummary, parseContinuity } from '../src/world/evolution/offline.ts'
import { createMemoryStore, MEMORY_KEY } from '../src/world/brain/memory.ts'
import { emptyInterests, createInterestModel } from '../src/world/brain/interests.ts'
import { createResearchController, emptyResearchBudget } from '../src/research/controller.ts'
import { MockResearchProvider } from '../src/research/model.ts'
import { ideaFrom, propose } from '../src/world/evolution/director.ts'
import { emptyEvolution, consider } from '../src/world/evolution/history.ts'
import { MockConversationAdapter, buildContext, parseResponse } from '../src/conversation/model.ts'
import { conversationPayload } from '../src/conversation/transport.ts'
import { validateContext } from '../server/moruConversation.ts'
const DAY=86400000, start=Date.UTC(2026,8,22)
const o={date:'2026-09-22',hour:23,timeOfDay:'NIGHT',season:'autumn',weather:'clear',wind:0,location:'field',indoor:false,nearWater:false,skyEvent:null,userMoving:false,userIdleDuration:20,userInteracted:false,userReturned:false,actionBusy:false,grounded:true,recentMoruActions:[],recentSpeech:[]}
const state={energy:.5,curiosity:.5,comfort:.5,attention:.5,affection:.5,sleepiness:.5}
function interests(){const i=emptyInterests();createInterestModel(i,undefined,()=>start).observe(o);return i}
function storage(){let raw=null;return {getItem:()=>raw,setItem:(_k,v)=>raw=v}}
test('offline caps, first visit, short absence, clock reversal, nonfinite clock and no-interest silence',()=>{
 for(const time of [start,start+1000,start-1000,Infinity,NaN]){
  const d={...emptyOffline(),lastSeenAt:start};simulateOffline(d,interests(),time);assert.equal(d.events.length,0)
 }
 const first=emptyOffline();simulateOffline(first,interests(),start+DAY*1000);assert.equal(first.events.length,0)
 const blank={...emptyOffline(),lastSeenAt:start};simulateOffline(blank,emptyInterests(),start+DAY*1000);assert.equal(blank.events.length,0)
 const i=interests(),facts=structuredClone(i.journal[0].facts),d={...emptyOffline(),lastSeenAt:start}
 simulateOffline(d,i,start+DAY*1000);assert.equal(d.events.length,1);assert.equal(d.absence,'LONG');assert.deepEqual(i.journal[0].facts,facts);assert.equal(i.journal[0].research,undefined)
 assert.equal(i.fascination.until,start+DAY*1001)
 simulateOffline(d,i,start+DAY*1000);assert.equal(d.events.length,1)
})
test('existing verified-provider result may be revisited but no new facts, research calls or completions are invented',async()=>{
 const i=interests(),result=await new MockResearchProvider().explore({topic:'leaves',question:i.journal[0].question,observations:[],previous:{inferences:[],unknowns:[]}},new AbortController().signal)
 i.journal[0].research={status:'COMPLETE',provider:'REAL',result:{...result.result,ideas:['색을 기록해보고 싶다.']},lastAttemptAt:start,completedAt:start,nextAllowedAt:start+DAY,error:null}
 const before=structuredClone(i.journal[0]),d={...emptyOffline(),lastSeenAt:start}
 simulateOffline(d,i,start+DAY*90);assert.ok(d.events.length<=3);assert.equal(d.events[0].basis,'ELAPSED_TIME_SIMULATION');assert.deepEqual(i.journal[0],before)
 assert.deepEqual(readOffline(JSON.parse(JSON.stringify(d))),d)
})
test('v4 migration starts offline clock without fabricated absence; active heartbeat and reload are idempotent',()=>{
 const s=storage();s.setItem(MEMORY_KEY,JSON.stringify({version:4,visitCount:7,interests:interests(),lastVisitAt:'2020-01-01'}))
 let time=start;const a=createMemoryStore(s,()=>new Date(time).toISOString());assert.equal(a.memory.offline.events.length,0);assert.equal(a.memory.version,6)
 time+=DAY;a.tick(15);const b=createMemoryStore(s,()=>new Date(time+1000).toISOString());assert.equal(b.memory.offline.events.length,0)
 const c=createMemoryStore(s,()=>new Date(time+DAY*2).toISOString());assert.equal(c.memory.offline.events.length,1)
 const d=createMemoryStore(s,()=>new Date(time+DAY*2+1).toISOString());assert.equal(d.memory.offline.events.length,1)
})
test('end to end observation → mock research → idea → WAITING → history → reload → offline → grounded conversation',async()=>{
 const s=storage(),store=createMemoryStore(s,()=>new Date(start).toISOString()),i=store.memory.interests
 createInterestModel(i,store.interestsChanged,()=>start).observe(o)
 const controller=createResearchController(i,emptyResearchBudget(),new MockResearchProvider(),store.interestsChanged,{now:()=>start,session:{calls:0,blocked:false}})
 await controller.observe(o);assert.equal(i.journal[0].research.status,'COMPLETE')
 // A local idea can be retained even when a research fixture chooses no creative output.
 i.journal[0].research.result.ideas=['가을 잎을 비교할 작은 자리를 생각했다.']
 const idea=ideaFrom(i.journal[0]);assert.equal(idea.evidence,'MOCK')
 const change=consider(store.memory.evolution,propose(idea,'autumn'),[],'autumn',start)
 assert.equal(change.status,'WAITING_FOR_ASSET');assert.equal(change.appliedAt,null);store.interestsChanged()
 const restored=createMemoryStore(s,()=>new Date(start+DAY*3).toISOString())
 assert.equal(restored.memory.evolution.history.length,1);assert.equal(restored.memory.offline.events.length,1)
 const summary=continuitySummary(restored.memory.offline,restored.memory.evolution)
 assert.equal(summary.worldHistory.length,0,'Mock proposals cannot be narrated as real creation')
 const ctx=buildContext('나 없을 때 뭐했어?',o,state,'WORLD',[],[],undefined,summary)
 const validated=validateContext(conversationPayload(ctx)),reply=await new MockConversationAdapter().respond(validated,new AbortController().signal)
 assert.equal(parseResponse(reply,validated).rejected.length,0);assert.match(reply.speech,/새로 알아낸 건 없어/)
 assert.equal(controller.session.calls,1)
})
test('conversation context is bounded, relevant and never promotes WAITING into creation',async()=>{
 const evolution=emptyEvolution(),idea={id:'one',sourceResearch:'one',topic:'leaves',concept:'잎 관찰',association:null,evidence:'MODEL_KNOWLEDGE',kind:'IDEA'}
 consider(evolution,propose(idea,'autumn'),[],'autumn',start)
 const summary=continuitySummary(emptyOffline(),evolution),c=buildContext('나 없을 때 뭐했어?',o,state,'WORLD',[],[],undefined,summary)
 assert.equal(c.continuity.worldHistory[0].status,'WAITING_FOR_ASSET')
 assert.match((await new MockConversationAdapter().respond(c,new AbortController().signal)).speech,/아직 놓은 건 없어/)
 assert.equal(buildContext('안녕',o,state,'WORLD',[],[],undefined,summary).continuity,undefined)
 assert.deepEqual(parseContinuity({meaningfulOfflineEvents:[{kind:'FAKE_WEATHER',topic:'snow'}],worldHistory:[{topic:'execute code',status:'APPLIED'}],secret:'not transmitted'}),{meaningfulOfflineEvents:[],worldHistory:[]})
})
