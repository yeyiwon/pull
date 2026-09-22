import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readMemory, createMemoryStore, MEMORY_KEY } from '../src/world/brain/memory.ts'
import { createSelf, silentDecision, validateDecision, RemoteMoruBrainProvider } from '../src/world/brain/decision.ts'
import { LocalMoruBrainProvider } from '../src/world/brain/localProvider.ts'
import { createBrainController } from '../src/world/brain/controller.ts'
import { createPlayer, requestBrainAction } from '../src/world/locomotion.ts'
const now = () => '2026-09-22T00:00:00.000Z'
function storage() { const data=new Map(); return { getItem:k=>data.get(k)??null, setItem:(k,v)=>data.set(k,v), data } }
const world={hour:12,phase:'DAY'}
const flush=async()=>{for(let i=0;i<5;i++) await Promise.resolve()}
function observation(trigger='LONG_IDLE') { return {trigger,world:{hour:12,dayPhase:'DAY',localTime:'12:00'},user:{justEntered:false,idleSeconds:50,repeatedJumpCount:0},memory:readMemory(null,now()),previousVisitAt:null,self:createSelf(),moru:{state:'IDLE',grounded:true}} }

test('memory defaults, corrupt/old data recovery, denied storage',()=>{
 for(const raw of [null,'{bad','null','[]','{"version":0}']) assert.equal(readMemory(raw,now()).visitCount,0)
 const m=readMemory('{"version":1,"visitCount":-1,"interactions":{"jumps":"huge"},"recentEvents":[null,{"type":5}]}',now())
 assert.equal(m.interactions.jumps,0);assert.deepEqual(m.recentEvents,[])
 assert.doesNotThrow(()=>createMemoryStore({getItem(){throw Error()},setItem(){throw Error()}},now).tick(16))
})
test('memory persists visits/interactions with a capped log and throttled writes',()=>{
 const s=storage(), a=createMemoryStore(s,now)
 assert.equal(a.memory.visitCount,1)
 for(let i=0;i<40;i++) a.event('JUMP')
 a.event('WAVE');a.event('BUBBLE_DANCE');a.tick(15)
 assert.equal(a.memory.recentEvents.length,24)
 const b=createMemoryStore(s,now)
 assert.equal(b.memory.visitCount,2);assert.equal(b.previousVisitAt,now())
 assert.deepEqual(b.memory.interactions,{jumps:40,waves:1,dances:1})
 assert.equal(b.memory.totalTimeTogetherSeconds,15)
 assert.ok(s.data.has(MEMORY_KEY))
})
test('strict decision validation rejects malformed outputs and strips extra data',()=>{
 const valid={...silentDecision(),intention:'notice_user',action:'wave',speech:'왔네',extra:'ignored'}
 assert.equal(validateDecision(valid).action,'wave');assert.equal(validateDecision(valid).extra,undefined)
 for(const invalid of [null,{}, {...valid,action:'teleport'}, {...valid,speech:'x'.repeat(25)}, {...valid,speech:'<script>'}, {...valid,mood:'angry'}, {...valid,reason:2}]) assert.deepEqual(validateDecision(invalid),silentDecision())
})
test('local provider permits silence and uses memory, repetition and self',async()=>{
 const quiet=new LocalMoruBrainProvider(()=>.99)
 assert.equal((await quiet.decide(observation())).action,'none')
 const active=new LocalMoruBrainProvider(()=>.1)
 const jump=observation('REPEATED_JUMP'); jump.user.repeatedJumpCount=5; jump.memory.interactions.jumps=30
 assert.equal((await active.decide(jump)).action,'confused')
 const a=observation('ENTRY'), provider=new LocalMoruBrainProvider(()=>.25)
 assert.equal((await provider.decide(a)).action,'none')
 a.memory.visitCount=20; a.previousVisitAt=now()
 assert.equal((await provider.decide(a)).action,'wave')
 const night=observation();night.world.hour=2;night.self.energy=.1
 assert.equal((await active.decide(night)).mood,'sleepy')
 assert.equal((await active.decide(observation())).mood,'curious')
})
test('controller prevents trigger/speech spam and user input wins over brain actions',async()=>{
 const p=createPlayer();let calls=0
 const brain=createBrainController(createMemoryStore(null,now),{async decide(){calls++;return {...silentDecision(),action:'wave',speech:'ㅎㅇ',reaction:'sparkles'}}},()=>0)
 brain.update(p,4,world);await flush();assert.equal(calls,1);assert.equal(p.actionRequested,'WAVE');assert.equal(p.brainRequested,true)
 assert.equal(brain.takeReaction().speech,'ㅎㅇ')
 for(let i=0;i<20;i++){p.events.push('WAVE');brain.update(p,.1,world)}
 await flush();assert.equal(calls,1)
 p.actionRequested=null;p.brainRequested=false;p.keys.add('KeyW')
 assert.equal(requestBrainAction(p,'WAVE'),false)
 brain.dispose()
})
test('late, rejected, malformed and disposed provider replies cannot interrupt world',async()=>{
 for(const mode of ['late','dispose','invalid','reject']) {
  let resolve;const p=createPlayer()
  const provider= mode==='reject'?{decide(){throw Error('offline')}}:mode==='invalid'?{async decide(){return {action:'invalid'}}}:new RemoteMoruBrainProvider(()=>new Promise(r=>resolve=r))
  const c=createBrainController(createMemoryStore(null,now),provider)
  c.update(p,4,world);await flush()
  if(mode==='late')c.update(p,5,world)
  if(mode==='dispose')c.dispose()
  resolve?.({...silentDecision(),action:'dance',speech:'헤헤'})
  await flush();assert.equal(p.actionRequested,null);assert.equal(c.takeReaction(),null)
  c.dispose()
 }
})
test('three rapid jumps trigger once and memory counts actual input events',async()=>{
 const p=createPlayer();const seen=[];const store=createMemoryStore(null,now)
 const c=createBrainController(store,{async decide(o){seen.push(o);return silentDecision()}})
 for(let i=0;i<3;i++){p.events.push('JUMP');c.update(p,1,world)}
 await flush();assert.equal(seen[0].trigger,'REPEATED_JUMP');assert.equal(seen[0].user.repeatedJumpCount,3)
 assert.equal(store.memory.interactions.jumps,3)
 c.dispose()
})

test('speech policy spans decisions and autonomous actions do not become user events', async()=>{
 const { createBrainPolicy }=await import('../src/world/personality.ts')
 const policy=createBrainPolicy(()=>0), d={...silentDecision(),speech:'왔네',reaction:'hearts'}
 assert.equal(policy(d,0).speech,'왔네')
 assert.equal(policy({...d,speech:'ㅎㅇ'},13).speech,null)
 assert.equal(policy(d,60).speech,null)
 assert.equal(policy({...d,speech:'ㅎㅇ'},61).speech,'ㅎㅇ')
 const { Object3D, AnimationClip }=await import('three')
 const { createLocomotion, movePlayer }=await import('../src/world/locomotion.ts')
 const clips=Object.fromEntries(['IDLE','WALK','RUN','JUMP','CONFUSED','LISTEN','WAVE','BUBBLE_DANCE'].map(n=>[n,new AnimationClip(n,1,[])]))
 const p=createPlayer(), locomotion=createLocomotion(new Object3D(),clips,{automaticObservation:false})
 requestBrainAction(p,'WAVE');locomotion.update(p,.1)
 assert.equal(p.state,'WAVE');assert.equal(p.events.length,0)
 p.keys.add('KeyW');movePlayer(p,.1);locomotion.update(p,.1)
 assert.equal(p.state,'WALK');locomotion.dispose()
})
