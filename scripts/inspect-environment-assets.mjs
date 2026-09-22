import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

export function inspectGlb(bytes, contract) {
 if(bytes.length<20||bytes.readUInt32LE(0)!==0x46546c67||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length)throw new Error('Invalid GLB v2 header/length')
 let json, binBytes=0
 for(let offset=12;offset<bytes.length;){
  if(offset+8>bytes.length)throw new Error('Truncated chunk header')
  const length=bytes.readUInt32LE(offset),type=bytes.readUInt32LE(offset+4);offset+=8
  if(length%4||offset+length>bytes.length)throw new Error('Invalid chunk length')
  if(type===0x4e4f534a){if(json)throw new Error('Duplicate JSON chunk');json=JSON.parse(bytes.subarray(offset,offset+length).toString('utf8'))}
  if(type===0x004e4942)binBytes+=length
  offset+=length
 }
 if(!json||json.asset?.version!=='2.0')throw new Error('Missing glTF 2.0 JSON')
 const errors=[],warnings=[],names=new Set((json.nodes??[]).map(n=>n.name))
 for(const name of contract.requiredNodes)if(!names.has(name))errors.push(`Missing node: ${name}`)
 if((json.buffers??[]).some(b=>b.uri))errors.push('External buffers are not allowed in delivery GLB')
 if((json.buffers??[]).reduce((n,b)=>n+b.byteLength,0)>binBytes)errors.push('Binary buffer is missing/truncated')
 if((json.images??[]).some(i=>i.uri||i.bufferView===undefined))errors.push('Textures must be embedded bufferViews')
 for(const view of json.bufferViews??[])if((view.byteOffset??0)+view.byteLength>binBytes)errors.push('bufferView exceeds BIN chunk')
 let triangles=0,primitives=0
 for(const mesh of json.meshes??[])for(const p of mesh.primitives??[]){
  primitives++
  const count=json.accessors?.[p.indices??p.attributes?.POSITION]?.count
  if(count===undefined)errors.push('Primitive has no readable vertex/index accessor')
  else if((p.mode??4)===4)triangles+=count/3
  else errors.push('Export triangle-list primitives')
  if(p.attributes?.NORMAL===undefined)errors.push('Primitive lacks normals')
  if(p.attributes?.TEXCOORD_0===undefined)errors.push('Primitive lacks UV0')
 }
 if(!primitives)errors.push('No mesh primitives')
 if(triangles>contract.triangleBudget)warnings.push(`Triangle budget: ${triangles} > ${contract.triangleBudget}; review before admission`)
 const materials=json.materials??[]
 if(!materials.length)errors.push('No materials')
 if(!materials.some(m=>m.pbrMetallicRoughness?.baseColorTexture))errors.push('No base-color texture; flat-color delivery is not accepted')
 if(contract.requiresNormalMap&&!materials.some(m=>m.normalTexture))errors.push('Hero asset lacks normal/surface-detail map')
 const required=json.extensionsRequired??[]
 if(required.length)warnings.push(`Verify loader support for required extensions: ${required.join(', ')}`)
 if((json.skins??[]).length)warnings.push('Environment contains skins; review necessity')
 return {structuralStatus:errors.length?'REJECTED':'REVIEW_REQUIRED',visualStatus:'NOT_REVIEWED',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),triangles,primitives,materials:materials.map(m=>({name:m.name,baseColor:m.pbrMetallicRoughness?.baseColorFactor,roughness:m.pbrMetallicRoughness?.roughnessFactor,metalness:m.pbrMetallicRoughness?.metallicFactor,baseColorTexture:!!m.pbrMetallicRoughness?.baseColorTexture,normalTexture:!!m.normalTexture,roughnessTexture:!!m.pbrMetallicRoughness?.metallicRoughnessTexture,alphaMode:m.alphaMode??'OPAQUE'})),images:(json.images??[]).length,nodes:[...names].filter(Boolean),errors,warnings}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const project=resolve(dirname(fileURLToPath(import.meta.url)),'..')
 const directory=process.argv[2]
 if(!directory){console.error('Usage: node scripts/inspect-environment-assets.mjs /absolute/delivery-directory');process.exit(2)}
 const manifest=JSON.parse(readFileSync(resolve(project,'docs/environment-slice/assets.json'),'utf8'))
 const results=manifest.assets.map(asset=>{
  const path=resolve(directory,asset.file)
  if(!existsSync(path))return {id:asset.id,file:asset.file,structuralStatus:'MISSING',visualStatus:'NOT_REVIEWED'}
  try{return {id:asset.id,file:asset.file,...inspectGlb(readFileSync(path),asset)}}catch(e){return {id:asset.id,file:asset.file,structuralStatus:'REJECTED',error:e.message}}
 })
 console.log(JSON.stringify({status:results.every(r=>r.structuralStatus==='REVIEW_REQUIRED')?'READY_FOR_VISUAL_REVIEW':'BLOCKED',assets:results},null,2))
 process.exitCode=results.every(r=>r.structuralStatus==='REVIEW_REQUIRED')?0:2
}
