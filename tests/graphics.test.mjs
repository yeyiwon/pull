import test from 'node:test'
import assert from 'node:assert/strict'
import { Vector3 } from 'three'
import { BRIDGE, streamCenter, surfaceHeight } from '../src/world/terrain.ts'
import { RING, HALO_ARCS } from '../src/world/worldLayout.ts'
import { moveWithCollisions } from '../src/world/collision.ts'
import { QUALITY, setQuality, getQuality } from '../src/graphics/quality.ts'

test('locked bridge crossing and arch still match the playable surface',()=>{
 assert.equal(BRIDGE.z,-9);assert.equal(BRIDGE.halfWidth,1.65)
 assert.ok(Math.abs(streamCenter(-9) - (-.8120905017521374)) < 1e-9)
 assert.equal(surfaceHeight(streamCenter(-9),-9),.42)
 for(const sign of [-1,1])assert.ok(surfaceHeight(streamCenter(-9)+sign*BRIDGE.halfLength*.999,-9)<.002)
})
test('quality defaults and switching do not change the world layout or crossing',()=>{
 const before={...BRIDGE},ring={...RING}
 for(const q of Object.keys(QUALITY)){setQuality(q);assert.equal(getQuality(),q)}
 assert.deepEqual(BRIDGE,before);assert.deepEqual(RING,ring)
 assert.equal(QUALITY.PERFORMANCE.bloom,0);assert.equal(QUALITY.PERFORMANCE.contact,false)
 assert.ok(QUALITY.PERFORMANCE.particles<QUALITY.DREAM.particles)
 setQuality('BEAUTIFUL')
})
test('halo keeps the traversable opening and does not use old thick collision footprint',()=>{
 assert.equal(HALO_ARCS.length,2)
 const p=new Vector3(RING.x,6,RING.z+3);moveWithCollisions(p,new Vector3(0,0,-1),6)
 assert.ok(p.z<RING.z-2.9)
})
