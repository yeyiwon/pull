import test from 'node:test'
import assert from 'node:assert/strict'
import {MeshStandardMaterial,Texture,SRGBColorSpace,Group,Mesh,BoxGeometry} from 'three'
import {applyMoruMaterial,prepareMoruRendering,MORU_RENDERING_PROFILE} from '../src/characters/renderingProfile.ts'
import {appearanceAssets} from '../src/characters/appearanceAssets.ts'
import {appearanceGroundOffsets} from '../src/characters/appearanceGroundOffsets.ts'
import {readFileSync} from 'node:fs'
test('shared profile preserves original PBR textures/color/emission and source material',()=>{
 const map=new Texture();map.colorSpace=SRGBColorSpace
 const source=new MeshStandardMaterial({map,color:'#b0a0c0',roughness:1,metalness:1}),environment=new Texture()
 const adapted=applyMoruMaterial(source,environment)
 assert.notEqual(adapted,source);assert.equal(adapted.map,map);assert.equal(adapted.envMap,environment)
 assert.equal(source.envMap,null);assert.equal(source.roughness,1);assert.ok(adapted.color.equals(source.color))
 assert.ok(adapted.emissive.equals(source.emissive));assert.equal(adapted.metalness,source.metalness)
 assert.ok(MORU_RENDERING_PROFILE.environmentNight>0&&MORU_RENDERING_PROFILE.environmentNight<MORU_RENDERING_PROFILE.environmentDay)
})
test('all registered appearances retain one shared clip directory and measured offsets',()=>{
 assert.equal(Object.keys(appearanceAssets).length,19)
 for(const [id,url] of Object.entries(appearanceAssets)){
  const data=readFileSync(new URL('../public'+url,import.meta.url));const n=data.readUInt32LE(12),j=JSON.parse(data.subarray(20,20+n))
  assert.equal(j.skins[0].joints.length,28);assert.equal(j.materials.length,1)
  if(id!=='base')assert.equal(Object.keys(appearanceGroundOffsets[id]).length,17)
 }
})
test('an unknown future outfit automatically receives the shared profile without mutating cached resources',()=>{
 const scene=new Group(),map=new Texture();map.colorSpace=SRGBColorSpace
 const source=new MeshStandardMaterial({map}),geometry=new BoxGeometry(),mesh=new Mesh(geometry,[source,source]);scene.name='future-outfit-not-in-registry';scene.add(mesh)
 const materials=prepareMoruRendering(scene)
 assert.equal(materials.length,1);assert.equal(mesh.receiveShadow,false);assert.equal(mesh.castShadow,true)
 assert.notEqual(mesh.geometry,geometry);assert.notEqual(materials[0],source);assert.notEqual(materials[0].map,map)
 assert.equal(materials[0].map.image,map.image);assert.equal(source.envMapIntensity,1)
 assert.equal(materials[0].envMapIntensity,MORU_RENDERING_PROFILE.environmentDay)
 assert.equal(mesh.material[0],mesh.material[1])
})
