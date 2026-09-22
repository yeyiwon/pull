import test from 'node:test'
import assert from 'node:assert/strict'
import { HERO_PATHS, PATH_SEGMENTS, pathDistance, acceptsPlant } from '../src/environment/heroLayout.ts'
import { BRIDGE, streamCenter } from '../src/world/terrain.ts'
import { homeWorldPoint } from '../src/world/homeSpace.ts'
import { environmentAssets } from '../src/environment/assetCatalog.ts'

test('visual paths meet locked bridge endpoints and existing porch',()=>{
 const west=HERO_PATHS[0].getPoint(1),east=HERO_PATHS[1].getPoint(0),porch=HERO_PATHS[1].getPoint(1),target=homeWorldPoint(1.8,5.5)
 assert.ok(Math.abs(west.x-(streamCenter(BRIDGE.z)-BRIDGE.halfLength))<1e-8)
 assert.ok(Math.abs(east.x-(streamCenter(BRIDGE.z)+BRIDGE.halfLength))<1e-8)
 assert.ok(Math.abs(west.z-BRIDGE.z)<1e-8);assert.ok(Math.abs(east.z-BRIDGE.z)<1e-8)
 assert.ok(Math.hypot(porch.x-target.x,porch.z-target.z)<1e-8)
 assert.equal(PATH_SEGMENTS.length,12)
})
test('vegetation keeps deck, path centers and home interior clear',()=>{
 for(let x=streamCenter(BRIDGE.z)-BRIDGE.halfLength-1;x<streamCenter(BRIDGE.z)+BRIDGE.halfLength+1;x+=.5) assert.equal(acceptsPlant(x,BRIDGE.z),false)
 for(const s of PATH_SEGMENTS){assert.ok(pathDistance(s.x,s.y)<1e-8);assert.equal(acceptsPlant(s.x,s.y),false)}
 assert.equal(acceptsPlant(10,-24),false)
})
test('unavailable hero art remains explicit and never triggers missing-asset fetches',()=>{
 for(const asset of Object.values(environmentAssets)){assert.equal(asset.url,null);assert.ok(asset.specification.length>30)}
})
