import test from 'node:test'
import assert from 'node:assert/strict'
import {aliveWorldStore,emptyAliveWorld,FUTURE_PLAY_EVENT_HOOKS,readAliveWorld} from '../src/world/aliveWorldState.ts'

test('Lost Seeds is a bounded world-space mission rather than a generic quest graph',()=>{
 const state=emptyAliveWorld(100)
 assert.equal(state.lostSeeds.status,'AVAILABLE')
 assert.deepEqual(state.lostSeeds.collected,[])
 assert.equal(FUTURE_PLAY_EVENT_HOOKS.RAINY_DAY.enabled,false)
 assert.equal(FUTURE_PLAY_EVENT_HOOKS.NIGHT_LIGHT.enabled,false)
})

test('Lost Seeds progresses only through start, three unique pickups, return and completion',()=>{
 aliveWorldStore.reset();aliveWorldStore.begin()
 assert.equal(aliveWorldStore.collect('lost-seed-1'),true)
 assert.equal(aliveWorldStore.collect('lost-seed-1'),false)
 assert.equal(aliveWorldStore.collect('lost-seed-2'),true)
 assert.equal(aliveWorldStore.complete(),false)
 assert.equal(aliveWorldStore.collect('lost-seed-3'),true)
 assert.equal(aliveWorldStore.getSnapshot().lostSeeds.status,'RETURN')
 assert.equal(aliveWorldStore.complete(),true)
 assert.equal(aliveWorldStore.getSnapshot().lostSeeds.status,'COMPLETE')
 aliveWorldStore.reset()
})

test('persistence sanitizes unknown mission states and caps seed object ids',()=>{
 const value=readAliveWorld(JSON.stringify({version:1,updatedAt:100,lostSeeds:{status:'HACKED',collected:['lost-seed-1','lost-seed-1','lost-seed-9','lost-seed-2'],completedAt:'never'}}),200)
 assert.equal(value.lostSeeds.status,'AVAILABLE')
 assert.deepEqual(value.lostSeeds.collected,['lost-seed-1','lost-seed-2'])
 assert.equal(value.lostSeeds.completedAt,null)
})
