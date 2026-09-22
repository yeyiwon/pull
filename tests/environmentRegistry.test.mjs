import test from 'node:test'
import assert from 'node:assert/strict'
import {parseEnvironmentRegistry,lodAt,ASSET_CATEGORIES} from '../src/environment/registry.ts'
import {VEGETATION} from '../src/environment/vegetationRegistry.ts'
const entry=()=>({id:'oak',category:'tree',url:'/environment/oak.glb',season:['spring','summer'],scaleRange:[.5,2],placementType:'manual',placements:[{position:[0,0,0],rotation:[0,0,0],scale:1}],lod:[{distance:20,url:'/environment/oak-low.glb'}],materialResponse:{wetness:true,snow:true}})
test('registry supports all requested categories and data-only transforms',()=>{
 assert.deepEqual(ASSET_CATEGORIES,['house','landmark','tree','rock','vegetation','prop','accessory'])
 assert.equal(parseEnvironmentRegistry({version:1,assets:[entry()]})[0].placements[0].scale,1)
 assert.deepEqual(parseEnvironmentRegistry({version:1,assets:[]}),[])
})
test('invalid assets cannot trigger remote loads or unsafe transforms',()=>{
 for(const patch of [{url:'https://example.com/x.glb'},{url:'/environment/../secret.glb'},{scaleRange:[2,1]},{placements:[{position:[NaN,0,0],rotation:[0,0,0],scale:1}]},{category:'accessory'},{lod:[{distance:0,url:'/environment/x.glb'}]}])assert.throws(()=>parseEnvironmentRegistry({version:1,assets:[{...entry(),...patch}]}))
 assert.throws(()=>parseEnvironmentRegistry({version:1,assets:[entry(),entry()]}))
})
test('LOD hysteresis keeps boundary camera movement stable',()=>{
 const lod=entry().lod
 assert.equal(lodAt(21,lod,0),0);assert.equal(lodAt(23,lod,0),1)
 assert.equal(lodAt(19,lod,1),1);assert.equal(lodAt(17,lod,1),0)
})
test('vegetation has ordered depth tiers and bounded seasonal density',()=>{
 for(const v of Object.values(VEGETATION)){assert.ok(v.near<v.mid&&v.mid<v.far);for(const d of Object.values(v.season))assert.ok(d>=0&&d<=1)}
})
