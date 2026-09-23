import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {AnimationClip,VectorKeyframeTrack} from 'three'
import {MORU_BODY_URL,moruAnimations} from '../src/characters/assets.ts'
import {prepareBodyAnimation} from '../src/characters/bodyAnimation.ts'
import {groundOffsets} from '../src/characters/bodyProfile.ts'
const audit=JSON.parse(readFileSync(new URL('../docs/moru-final-inventory.json',import.meta.url)))
const hash=b=>createHash('sha256').update(b).digest('hex')
function read(url){const b=readFileSync(new URL('../public'+url,import.meta.url)),n=b.readUInt32LE(12);return {raw:b,j:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(28+n)}}
test('one unchanged canonical body and seventeen mesh-free resources preserve all thirty-four clips',()=>{
 const base=read(MORU_BODY_URL),original=audit.new.find(r=>r.file===audit.canonical)
 assert.equal(hash(base.raw),original.sha256)
 assert.equal(base.j.skins[0].joints.length,28)
 const nodes=base.j.nodes.map(({mesh:_mesh,skin:_skin,weights:_weights,...node})=>node)
 assert.equal(moruAnimations.length,17)
 for(const item of moruAnimations){
  const {j,bin,raw}=read(item.url),source=audit.new.find(r=>item.source===r.file)
  assert.equal(hash(raw),item.sha256);assert.deepEqual(j.nodes,nodes)
  for(const key of ['meshes','images','textures','materials','skins'])assert.equal(j[key],undefined)
  assert.deepEqual(j.animations.map(a=>a.name),[item.name,...item.supportClips])
  j.animations.forEach((a,ai)=>a.samplers.forEach((s,si)=>{for(const field of ['input','output']){
   const accessor=j.accessors[s[field]],v=j.bufferViews[accessor.bufferView],expected=source.samplerChecks[ai][si][field]
   assert.equal(accessor.count,expected.count);assert.equal(accessor.type,expected.type)
   assert.equal(hash(bin.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength)),expected.sha256)
  }}))
 }
})
test('ground adapter preserves source and vertical motion while bounding root drift',()=>{
 const source=new AnimationClip('air_squat',1,[new VectorKeyframeTrack('mixamorigHips.position',[0,1],[.1,-.34,.2,.3,-.33,.5])])
 const before=Array.from(source.tracks[0].values),clip=prepareBodyAnimation(source),values=clip.tracks[0].values
 assert.deepEqual(Array.from(source.tracks[0].values),before)
 assert.ok(Math.abs(values[1]-(-.34+groundOffsets[source.name]))<1e-6)
 assert.ok(Math.abs((values[4]-values[1])-.01)<1e-6)
 assert.equal(values[3],values[0]);assert.equal(values[5],values[2])
})
