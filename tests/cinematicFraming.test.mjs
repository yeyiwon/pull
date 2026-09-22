import test from 'node:test'
import assert from 'node:assert/strict'
import { idleFramingWeight, cinematicComposition } from '../src/world/cinematicFraming.ts'
test('cinematic drift yields to input, reduced motion and interior',()=>{
 for(const t of [0,6,8,13,3600]){
  assert.equal(idleFramingWeight(t,true,false,0),0)
  assert.equal(idleFramingWeight(t,false,true,0),0)
  assert.equal(idleFramingWeight(t,false,false,1),0)
 }
 assert.equal(idleFramingWeight(7,false,false,0),0)
 assert.equal(idleFramingWeight(13,false,false,0),1)
 assert.ok(idleFramingWeight(10,false,false,0)>.4)
})
test('portrait preserves more sky and landscape preserves breadth',()=>{
 const portrait=cinematicComposition(390/844),landscape=cinematicComposition(844/390)
 assert.ok(portrait.skyLift>landscape.skyLift)
 assert.ok(portrait.side<landscape.side)
 assert.ok(landscape.fov<60)
})
