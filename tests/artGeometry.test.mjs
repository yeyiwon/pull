import test from 'node:test'
import assert from 'node:assert/strict'
import { branch, weatheredStone, leafBlade } from '../src/world/artGeometry.ts'

test('authored environmental geometry has finite vertices, normals and valid indices',()=>{
 const geometries=[weatheredStone(0),weatheredStone(3,true,18),leafBlade(),branch([[0,0,0],[.2,2,0],[1,4,.3]],.4,.02)]
 for(const geometry of geometries){
  for(const name of ['position','normal'])assert.ok(Array.from(geometry.attributes[name].array).every(Number.isFinite))
  assert.ok(Array.from(geometry.index.array).every(i=>i>=0&&i<geometry.attributes.position.count))
  geometry.computeBoundingBox();assert.ok(geometry.boundingBox.max.y>geometry.boundingBox.min.y)
  geometry.dispose()
 }
})
test('weathered stone has a flattened base and repeatable geometry',()=>{
 const a=weatheredStone(4),b=weatheredStone(4)
 assert.deepEqual(a.attributes.position.array,b.attributes.position.array)
 for(let i=0;i<a.attributes.position.count;i++)assert.ok(a.attributes.position.getY(i)>=-.580001)
 a.dispose();b.dispose()
})
