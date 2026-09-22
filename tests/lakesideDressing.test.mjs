import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LAKESIDE_TREES,LAKESIDE_MEADOWS,acceptsLakesidePlant,SEASON_FOLIAGE,LAMP_SEASONS,isCherryTree } from '../src/world/lakesideDressing.ts'
import { connectedPromenadeRoute } from '../src/world/lakesideRoute.ts'
test('dense groves retain walkable promenade and distinct clearings',()=>{
 assert.ok(LAKESIDE_TREES.length>=107)
 for(const [x,z,s] of LAKESIDE_TREES)assert.ok(acceptsLakesidePlant(x,z,2.2*s))
 for(const p of connectedPromenadeRoute().getSpacedPoints(600))assert.equal(acceptsLakesidePlant(p.x,p.z),false)
 assert.ok(LAKESIDE_MEADOWS.length>LAKESIDE_TREES.length)
 assert.ok(new Set(LAKESIDE_TREES.map(t=>t[2])).size>4)
})
test('seasonal foliage varies within each season and lamp core remains warm',()=>{
 assert.equal(new Set(Object.values(SEASON_FOLIAGE).flat()).size,16)
 assert.equal(Object.keys(LAMP_SEASONS).length,4)
 for(const p of Object.values(LAMP_SEASONS))assert.notEqual(p.core,p.light)
})

test("spring selects seven of each ten trees for blossom canopy",()=>{assert.equal(Array.from({length:100},(_,i)=>isCherryTree(i)).filter(Boolean).length,70)})
