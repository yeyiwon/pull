import {test} from 'node:test'
import assert from 'node:assert/strict'
import {lakeBasin,streamWidth,streamCenter,BRIDGE,waterDepth} from '../src/world/terrain.ts'
import {TREES} from '../src/world/worldLayout.ts'
test('procedural lake expands away from the unchanged bridge and stays continuous',()=>{
 assert.equal(lakeBasin(BRIDGE.z),0);assert.equal(lakeBasin(28),0);assert.equal(lakeBasin(88),0)
 assert.ok(streamWidth(58)*2>50)
 for(let z=27;z<89;z+=.05)assert.ok(Math.abs(streamWidth(z+.05)-streamWidth(z))<.1)
 assert.ok(waterDepth(streamCenter(58),58)>.3)
})
test('tree groves are dry and outside the five metre lakeside promenade',()=>{
 assert.equal(TREES.length,23)
 for(const [x,z] of TREES){assert.equal(waterDepth(x,z),0);if(z>=28)assert.ok(Math.abs(x-streamCenter(z))-streamWidth(z)>8)}
})
