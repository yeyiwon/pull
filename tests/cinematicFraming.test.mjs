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

import { skyTargetHeight } from '../src/world/cinematicFraming.ts'
import { PerspectiveCamera, Vector3 } from 'three'
test('sky view keeps Moru feet and head in portrait, landscape and desktop frame',()=>{
 for(const aspect of [390/844,844/390,16/9])for(const ground of [0,3])for(const pitch of [-.01,-.2,-.55]){
  const {fov,skyLift}=cinematicComposition(aspect)
  const distance=Math.max(8.3,Math.min(11.5,5.2/aspect))
  const camera=new PerspectiveCamera(fov,aspect,.1,1000)
  camera.position.set(0,ground+1.3,distance)
  const requested=ground+1.3+skyLift+Math.sin(-pitch)*distance
  camera.lookAt(0,skyTargetHeight(camera.position.y,ground,distance,requested,fov),0)
  camera.updateMatrixWorld(true)
  const feet=new Vector3(0,ground,0).project(camera)
  const head=new Vector3(0,ground+2.8,0).project(camera)
  assert.ok(feet.y>=-.821,`feet cropped: ${aspect} ${pitch} ${feet.y}`)
  assert.ok(head.y<1&&head.y>feet.y)
  assert.ok(new Vector3(0,ground+1.3,0).project(camera).y<0,'Moru stays below center')
 }
})
