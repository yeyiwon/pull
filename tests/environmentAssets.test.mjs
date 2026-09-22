import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectGlb } from '../scripts/inspect-environment-assets.mjs'
const contract={requiredNodes:['HomeRoot'],triangleBudget:10,requiresNormalMap:true}
function glb(data){const raw=Buffer.from(JSON.stringify(data));const json=Buffer.alloc(Math.ceil(raw.length/4)*4,32);raw.copy(json);const b=Buffer.alloc(20+json.length);b.writeUInt32LE(0x46546c67);b.writeUInt32LE(2,4);b.writeUInt32LE(b.length,8);b.writeUInt32LE(json.length,12);b.writeUInt32LE(0x4e4f534a,16);json.copy(b,20);return b}
test('asset admission rejects malformed GLB and does not call flat-color geometry production',()=>{
 assert.throws(()=>inspectGlb(Buffer.from('invalid'),contract),/Invalid/)
 const r=inspectGlb(glb({asset:{version:'2.0'},nodes:[{name:'HomeRoot'}]}),contract)
 assert.equal(r.structuralStatus,'REJECTED');assert.equal(r.visualStatus,'NOT_REVIEWED')
 assert.ok(r.errors.includes('No mesh primitives'));assert.ok(r.errors.some(e=>e.includes('base-color')))
})
test('external textures and missing door hierarchy remain blocking',()=>{
 const r=inspectGlb(glb({asset:{version:'2.0'},images:[{uri:'texture.png'}]}),contract)
 assert.ok(r.errors.some(e=>e.includes('Missing node')))
 assert.ok(r.errors.some(e=>e.includes('embedded')))
})
