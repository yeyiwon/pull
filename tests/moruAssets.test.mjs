import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const report = JSON.parse(readFileSync(new URL('../docs/moru-import-report.json', import.meta.url)))
const files = report.map(a => a.file.slice(5, -4))
function read(name) {
 const b=readFileSync(new URL(`../public/moru/moru-${name}.glb`,import.meta.url))
 const len=b.readUInt32LE(12), json=JSON.parse(b.subarray(20,20+len)), bin=b.subarray(28+len)
 return {json,bin}
}
test('all sixteen approved Moru clips share skeleton, bind matrices and skin weights',()=>{
 const assets=files.map(read), base=assets[0]
 const skeleton=j=>j.skins[0].joints.map(i=>j.nodes[i])
 const bytes=(asset,index)=>{const a=asset.json.accessors[index],v=asset.json.bufferViews[a.bufferView];return asset.bin.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength)}
 for(const asset of assets){
  assert.equal(asset.json.skins[0].joints.length,23)
  assert.deepEqual(skeleton(asset.json),skeleton(base.json))
  assert.deepEqual(bytes(asset,asset.json.skins[0].inverseBindMatrices),bytes(base,base.json.skins[0].inverseBindMatrices))
  for(const key of ['JOINTS_0','WEIGHTS_0']) assert.deepEqual(bytes(asset,asset.json.meshes[0].primitives[0].attributes[key]),bytes(base,base.json.meshes[0].primitives[0].attributes[key]))
  assert.equal(asset.json.animations.length,1)
  assert.ok(asset.json.animations[0].channels.length>0)
 }
})

test('animation-only derivatives preserve every source channel and sample', () => {
 for (const entry of report) {
  const source = read(entry.file.slice(5, -4))
  const b = readFileSync(new URL('../public/moru/clips/moru-' + entry.clip.toLowerCase().replaceAll('_', '-') + '.glb', import.meta.url))
  const n=b.readUInt32LE(12), j=JSON.parse(b.subarray(20,20+n)), bin=b.subarray(28+n)
  assert.equal(j.meshes,undefined); assert.equal(j.images,undefined)
  assert.deepEqual(j.animations[0].channels,source.json.animations[0].channels)
  for(let i=0;i<j.animations[0].samplers.length;i++) for(const field of ['input','output']) {
   const original=source.json.accessors[source.json.animations[0].samplers[i][field]], actual=j.accessors[j.animations[0].samplers[i][field]]
   const a=source.json.bufferViews[original.bufferView], v=j.bufferViews[actual.bufferView]
   assert.deepEqual(bin.subarray(v.byteOffset,v.byteOffset+v.byteLength),source.bin.subarray(a.byteOffset??0,(a.byteOffset??0)+a.byteLength))
   assert.equal(actual.count,original.count); assert.equal(actual.type,original.type)
  }
 }
})
