import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Color } from 'three'
import { phaseAt, sampleTime } from '../src/world/worldTime.ts'
import { createPlayer, movePlayer, setTouchIntent, requestAction } from '../src/world/locomotion.ts'

test('local phases, wraparound, and continuous profile boundaries', () => {
 for (const [h, phase] of [[0,'NIGHT'],[5,'DAWN'],[7,'MORNING'],[10,'DAY'],[17,'SUNSET'],[19,'EVENING'],[21,'NIGHT']]) assert.equal(phaseAt(h), phase)
 assert.equal(sampleTime(24).hour, 0)
 for (const h of [0,5,7,10,17,19,21,24]) {
   const a=sampleTime(h-.00001), b=sampleTime(h+.00001)
   for (const key of ['top','horizon','fog','light']) {
     const ca=new Color(a.from[key]).lerp(new Color(a.to[key]),a.blend)
     const cb=new Color(b.from[key]).lerp(new Color(b.to[key]),b.blend)
     assert.ok(Math.abs(ca.r-cb.r)+Math.abs(ca.g-cb.g)+Math.abs(ca.b-cb.b)<.001)
   }
   assert.ok(Math.abs(a.daylight-b.daylight)<.001)
 }
 assert.ok(sampleTime(12).sunY>.99); assert.ok(sampleTime(0).sunY<-.99)
})
test('touch and keyboard use the same camera-relative movement and actions', () => {
 const a=createPlayer(), b=createPlayer(); a.cameraYaw=b.cameraYaw=Math.PI/2
 a.keys.add('KeyW'); setTouchIntent(b,0,-.6)
 movePlayer(a,.1); movePlayer(b,.1)
 assert.ok(a.position.distanceTo(b.position)<1e-8)
 setTouchIntent(b,0,-1); movePlayer(b,.1); assert.equal(b.groundState,'RUN')
 assert.equal(requestAction(b,'WAVE'),true); assert.equal(b.touchZ,0)
 movePlayer(b,.1); assert.equal(b.groundState,'IDLE')
 b.jumpRequested=true; movePlayer(b,.1); assert.equal(requestAction(b,'WAVE'),false)
})
