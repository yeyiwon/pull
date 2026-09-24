import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyPersistentWorld,readPersistentWorld,simulateBackground,createBackgroundWorldStore,BACKGROUND_WORLD_KEY } from '../src/world/backgroundWorld.ts'
import { eventDefinition } from '../src/world/worldEvents.ts'

const at=Date.parse('2026-01-10T12:00:00.000Z')
const next=at+10*60*1000

test('two background hours advance semantically without frame simulation or notification spam',()=>{
 const state=emptyPersistentWorld(at),result=simulateBackground(state,at+2*3600000,()=>null)
 assert.equal(result.steps,12);assert.equal(result.state.updatedAt,at+2*3600000);assert.equal(result.candidate,null);assert.ok(['QUIET','RESTING'].includes(result.state.moruState));assert.equal(result.state.recentSignificantEvents.length,0)
})

test('first snow becomes meaningful, moves Moru safely and creates a live notification candidate',()=>{
 const state=emptyPersistentWorld(at);state.season='winter';state.manual.season=true
 const result=simulateBackground(state,next,()=>eventDefinition('SNOW'))
 assert.equal(result.state.weather,'snow');assert.equal(result.memories[0]?.id,'SNOW');assert.equal(result.candidate?.eventId,'SNOW');assert.equal(result.candidate?.significance,'HIGH')
})

test('meteor shower uses the existing event definition and semantic landmark',()=>{
 const state=emptyPersistentWorld(at);state.season='winter';state.manual.season=true
 const result=simulateBackground(state,next,()=>eventDefinition('METEOR_SHOWER'))
 assert.equal(result.state.moruLocation,'MoonShrine');assert.equal(result.state.moruGoal,'observe:METEOR_SHOWER');assert.equal(result.candidate?.significance,'VERY_HIGH');assert.equal(result.state.discoveries.MoonShrine,'discovered')
})

test('manual season time weather and event remain authoritative in background',()=>{
 const state=emptyPersistentWorld(at);state.season='winter';state.worldTime=3;state.weather='snow';state.manual={season:true,time:true,weather:true,events:true};state.activeEvents=[{id:'HEAVY_SNOW',startedAt:at-1000,endsAt:at+1000,significance:'HIGH',location:'AncientTree'}]
 const result=simulateBackground(state,at+8*3600000,()=>eventDefinition('FIREWORKS'))
 assert.equal(result.state.season,'winter');assert.equal(result.state.worldTime,3);assert.equal(result.state.weather,'snow');assert.equal(result.state.activeEvents[0]?.id,'HEAVY_SNOW')
})

test('network-free persistence survives reload and notification fatigue is stored without tokens',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)},store=createBackgroundWorldStore(storage,()=>at)
 store.capture({moruLocation:'OldBridge'});assert.ok(values.has(BACKGROUND_WORLD_KEY));assert.equal(readPersistentWorld(values.get(BACKGROUND_WORLD_KEY),at).moruLocation,'OldBridge')
 const candidate={eventId:'FIREWORKS',eventType:'Fireworks',worldTimestamp:at,landmark:'OldBridge',significance:'VERY_HIGH'};store.markNotificationSent(candidate,at);assert.equal(store.state.notificationsToday.count,1);assert.equal(JSON.stringify(store.state).includes('token'),false)
})

test('expired event cannot produce a fictional current notification',()=>{
 const state=emptyPersistentWorld(at);state.season='winter';state.manual.season=true
 const result=simulateBackground(state,at+20*60000,(_state,time)=>time===next?eventDefinition('METEOR_SHOWER'):null)
 assert.equal(result.state.activeEvents.length,0);assert.equal(result.candidate,null);assert.ok(result.memories.some(item=>item.id==='METEOR_SHOWER'))
})
