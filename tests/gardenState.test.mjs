import test from 'node:test'
import assert from 'node:assert/strict'
import {emptyGarden,growthRemainingMs,growthStage,readGarden,GROWTH_MS,gardenStore} from '../src/world/gardenState.ts'

test('garden state starts as a small six-spot loop with one discovered seed family',()=>{
 const state=emptyGarden(100)
 assert.deepEqual(state.discovered,['starbell'])
 assert.equal(state.seeds.starbell,2)
 assert.equal(state.plants.length,0)
})

test('corrupt or unknown persisted data is bounded and invalid spots are discarded',()=>{
 const raw=JSON.stringify({...emptyGarden(100),seeds:{starbell:-4,moondrop:2.8,cloverlight:'3'},plants:[{spotId:'garden-99',kind:'starbell',plantedAt:0,wateredAt:0,collectedAt:null}],decorations:[{id:'x',type:'flower',spotId:'lake-center',variant:'starbell',createdAt:0}]})
 const state=readGarden(raw,200)
 assert.equal(state.seeds.starbell,0);assert.equal(state.seeds.moondrop,2);assert.equal(state.seeds.cloverlight,3)
 assert.equal(state.plants.length,0);assert.equal(state.decorations.length,0)
})

test('growth uses elapsed time, care and season without regressing after soil dries',()=>{
 const now=1_000_000,plant={spotId:'garden-1',kind:'starbell',plantedAt:now,wateredAt:now,collectedAt:null}
 assert.equal(growthStage(plant,now),'seed')
 assert.equal(growthStage(plant,now+GROWTH_MS*.25),'sprout')
 assert.equal(growthStage(plant,now+GROWTH_MS*.7),'young')
 assert.equal(growthStage(plant,now+GROWTH_MS,'autumn'),'bloom')
 const dry={...plant,wateredAt:0};assert.equal(growthStage(dry,now+GROWTH_MS),'sprout')
 assert.equal(growthStage(plant,now+GROWTH_MS*.88,'spring'),'bloom')
 assert.equal(growthRemainingMs(plant,now),GROWTH_MS)
 assert.equal(growthRemainingMs(plant,now+GROWTH_MS*.5),GROWTH_MS*.5)
 assert.equal(growthRemainingMs(plant,now+GROWTH_MS),0)
 assert.ok(growthRemainingMs(dry,now+GROWTH_MS)>GROWTH_MS)
})

test('play loop plants, waters, grows, collects and places without duplicating inventory',()=>{
 gardenStore.clear();gardenStore.giveSeeds()
 assert.equal(gardenStore.plant('garden-1','starbell'),true)
 gardenStore.water('garden-1');gardenStore.advance(GROWTH_MS)
 const seedsBefore=gardenStore.getSnapshot().seeds.starbell
 assert.equal(gardenStore.collect('garden-1'),true);assert.equal(gardenStore.collect('garden-1'),false)
 assert.equal(gardenStore.getSnapshot().inventory.starbell,1)
 assert.equal(gardenStore.getSnapshot().seeds.starbell,seedsBefore+1)
 assert.equal(gardenStore.getSnapshot().plants.length,0)
 assert.equal(gardenStore.place('decor-1','starbell'),true);assert.equal(gardenStore.place('decor-1','starbell'),false)
 assert.equal(gardenStore.getSnapshot().inventory.starbell,0)
 gardenStore.remove('decor-1');assert.equal(gardenStore.getSnapshot().inventory.starbell,1)
 gardenStore.clear()
})
