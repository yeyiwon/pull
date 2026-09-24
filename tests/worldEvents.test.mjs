import test from 'node:test'
import assert from 'node:assert/strict'
import {activeEventIds,eventDefinition,tickWorldEvents,worldEvents} from '../src/world/worldEvents.ts'
import {livingWorld} from '../src/world/livingWorld.ts'
import {presentedWeather,weatherPreview} from '../src/world/weatherPresentation.ts'
import {buildContext} from '../src/conversation/model.ts'

test.afterEach(()=>worldEvents.setManual(null))

test('manual event is authoritative until AUTO is restored',()=>{
 worldEvents.setManual('FIREWORKS')
 tickWorldEvents(12,{season:'summer',night:true,now:1_000_000})
 assert.deepEqual(activeEventIds(),['FIREWORKS'])
 assert.equal(worldEvents.getSnapshot().mode,'MANUAL')
 assert.equal(worldEvents.getSnapshot().elapsed,12)
 worldEvents.setManual(null)
 assert.equal(worldEvents.getSnapshot().mode,'AUTO')
 assert.deepEqual(activeEventIds(),[])
})

test('manual heavy snow drives the shared weather presentation',()=>{
 worldEvents.setManual('HEAVY_SNOW')
 assert.equal(presentedWeather(),'snow')
 assert.equal(livingWorld.snowMode,'heavy')
 assert.equal(eventDefinition('HEAVY_SNOW').moruAwareness,true)
})

test('phenomenon override does not clear the independently selected weather',()=>{
 weatherPreview.type='rain'
 worldEvents.setManual('FIREWORKS')
 assert.equal(weatherPreview.type,'rain')
 assert.equal(presentedWeather(),'rain')
 worldEvents.setNone()
 assert.equal(worldEvents.getSnapshot().mode,'MANUAL')
 assert.deepEqual(activeEventIds(),[])
 weatherPreview.type=null
})

test('manual meteor shower uses the real celestial presentation path',()=>{
 worldEvents.setManual('METEOR_SHOWER')
 assert.equal(livingWorld.eventOverride,'meteorShower')
 assert.equal(eventDefinition('METEOR_SHOWER').location,'MoonShrine')
})

test('phenomena can be toggled independently and remain active together',()=>{
 worldEvents.toggleManual('FIREWORKS')
 worldEvents.toggleManual('AURORA')
 assert.deepEqual(activeEventIds(),['FIREWORKS','AURORA'])
 assert.deepEqual(worldEvents.getSnapshot().manuals,['FIREWORKS','AURORA'])
 worldEvents.toggleManual('FIREWORKS')
 assert.deepEqual(activeEventIds(),['AURORA'])
})

test('REAL conversation context receives active events and landmark',()=>{
 const observation={date:'2026-09-24',hour:22,timeOfDay:'NIGHT',season:'winter',weather:'snow',wind:.2,location:'field',indoor:false,nearWater:false,skyEvent:'WINTER_ILLUMINATION',activeEvents:['HEAVY_SNOW','WINTER_ILLUMINATION'],eventLocation:'AncientTree',userMoving:false,userIdleDuration:12,userInteracted:false,userReturned:false,actionBusy:false,grounded:true,recentMoruActions:[],recentSpeech:[]}
 const state={energy:.5,curiosity:.8,comfort:.7,attention:.6,affection:.5,sleepiness:.2}
 const context=buildContext('지금 무슨 일이야?',observation,state,'WORLD',[],[])
 assert.deepEqual(context.world.activeEvents,['HEAVY_SNOW','WINTER_ILLUMINATION'])
 assert.equal(context.world.eventLocation,'AncientTree')
})

test('AUTO allows quiet slots and only selects context-eligible events',()=>{
 let quiet=false
 for(let slot=1;slot<80;slot++){
  worldEvents.setManual(null)
  tickWorldEvents(.1,{season:'spring',night:false,now:slot*600_000})
  const active=worldEvents.getSnapshot().active
  if(!active.length)quiet=true
  for(const event of active){assert.ok(event.seasons.includes('spring'));assert.notEqual(event.time,'NIGHT')}
 }
 assert.equal(quiet,true)
})

test('AUTO night-only phenomena stop when daylight begins',()=>{
 worldEvents.setManual(null)
 let selected=false
 for(let slot=1;slot<400&&!selected;slot++){
  worldEvents.setManual(null)
  const now=slot*600_000
  tickWorldEvents(.1,{season:'summer',night:true,now})
  const active=worldEvents.getSnapshot().active[0]
  if(active?.time==='NIGHT'){
   selected=true
   tickWorldEvents(.1,{season:'summer',night:false,now:now+1_000})
   assert.deepEqual(activeEventIds(),[])
  }
 }
 assert.equal(selected,true)
})
