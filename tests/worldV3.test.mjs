import test from 'node:test'
import assert from 'node:assert/strict'
import {PerspectiveCamera} from 'three'
import {WORLD_V3_LANDMARKS,V3_MOUNTAIN_LAYERS,V3_FOREST_BANDS} from '../src/world/worldV3.ts'
import {createPlayer} from '../src/world/locomotion.ts'
import {perceiveWorld,worldTarget} from '../src/world/worldPerception.ts'
import {canOccupy} from '../src/world/collision.ts'

test('World v3 landmarks expose unique safe Agent approach points',()=>{
 assert.equal(new Set(WORLD_V3_LANDMARKS.map(v=>v.id)).size,WORLD_V3_LANDMARKS.length)
 const player=createPlayer()
 for(const landmark of WORLD_V3_LANDMARKS){const target=worldTarget(landmark.id,player);assert.ok(target);assert.ok(canOccupy(target.x,target.z,target.y),`${landmark.id} approach must be occupiable`)}
})

test('World v3 adds layered landforms and semantic discoveries within mobile budgets',()=>{
 assert.equal(V3_MOUNTAIN_LAYERS.length,3)
 assert.ok(V3_MOUNTAIN_LAYERS.reduce((sum,layer)=>sum+layer.positions.length,0)<=18)
 assert.ok(V3_FOREST_BANDS.reduce((sum,band)=>sum+band.count,0)<=150)
 const player=createPlayer(),camera=new PerspectiveCamera();camera.position.set(0,7,15);camera.lookAt(0,1,0);camera.updateMatrixWorld()
 const perception=perceiveWorld(player,camera)
 assert.ok(perception.candidates.some(candidate=>candidate.type==='landmark'||candidate.type==='bridge'))
})
