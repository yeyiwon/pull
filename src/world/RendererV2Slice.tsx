import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color,DoubleSide,IcosahedronGeometry,InstancedMesh,MeshStandardMaterial,Object3D } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { artMaterial,updateArtMaterial } from '../graphics/artMaterial.ts'
import { V2_FULL_BUDGET,V2_SLICE_BUDGET,V2_SLICE_TREE_INDICES,useRendererMode } from '../graphics/rendererV2.ts'
import { branch,leafBlade } from './artGeometry.ts'
import { environmentState as env } from './environmentState.ts'
import { surfaceHeight } from './terrain.ts'
import { allowsGroundDetail,allowsTerrestrialDetail } from './ecology.ts'
import { TREES } from './worldLayout.ts'
import { worldTime } from './worldTime.ts'

const GOLDEN_ANGLE=2.399963
function v2Trunk(){
 const parts=[branch([[0,0,0],[-.12,2,.08],[.18,4.5,-.05],[.42,7.5,.15]],.48,.08)]
 for(let i=0;i<9;i++){const a=i*GOLDEN_ANGLE,y=2.4+i*.48,reach=1.45+(i%3)*.55;parts.push(branch([[0,y,0],[Math.cos(a)*.55,y+.7,Math.sin(a)*.55],[Math.cos(a)*reach,y+1.45,Math.sin(a)*reach]],.16,.028))}
 const geometry=mergeGeometries(parts);parts.forEach(part=>part.dispose());return geometry
}
function organicMass(detail=2,seed=0){
 const geometry=new IcosahedronGeometry(1,detail),position=geometry.attributes.position
 for(let i=0;i<position.count;i++){const x=position.getX(i),y=position.getY(i),z=position.getZ(i),noise=1+.11*Math.sin(x*(7+seed)+z*5)+.065*Math.cos(y*(9+seed)-x*4)+.035*Math.sin((x+y+z)*17);position.setXYZ(i,x*noise,y*noise,z*noise)}
 geometry.computeVertexNormals();return geometry
}
function seasonalPalette(season:string){return season==='spring'?['#eebbd0','#f6d3df','#91b978','#739f70']:season==='autumn'?['#c96f3f','#dda84f','#a94e43','#88965c']:season==='winter'?['#718c82','#83938d','#a8b4b4']:['#4f805c','#6d9a61','#89aa70','#3e6d50']}
function updateNightFloor(materials:MeshStandardMaterial[],night:number){const floor=.025*night;for(let i=0;i<materials.length;i++)materials[i].emissiveIntensity=floor*(1-i*.15)}

export default function RendererV2Slice(){
 const mode=useRendererMode(),trunks=useRef<InstancedMesh>(null),foliage=useRef<InstancedMesh>(null),secondary=useRef<InstancedMesh>(null),grass=useRef<InstancedMesh>(null),flowers=useRef<InstancedMesh>(null),rocks=useRef<InstancedMesh>(null),groundDetail=useRef<InstancedMesh>(null)
 const lastSeason=useRef(''),clock=useRef(0)
 const r=useMemo(()=>{const leaves=artMaterial('#ffffff','leaf'),smallLeaves=artMaterial('#ffffff','leaf'),stone=artMaterial('#71808a','stone'),soil=artMaterial('#817566','stone');leaves.emissive.set('#10182a');smallLeaves.emissive.set('#10182a');stone.emissive.set('#0b101c');soil.emissive.set('#090d16');return {object:new Object3D(),color:new Color(),trunk:v2Trunk(),crown:organicMass(2,1),secondaryCrown:organicMass(1,4),rock:organicMass(2,7),groundPebble:organicMass(1,9),blade:leafBlade(.11,.9,.18),flower:new IcosahedronGeometry(.09,1),wood:artMaterial('#67594e','bark'),leaves,smallLeaves,stone,soil,grass:Object.assign(artMaterial('#759273','leaf'),{side:DoubleSide}),petal:new MeshStandardMaterial({color:'#e9c5d8',roughness:.76,metalness:0})}},[])
 useEffect(()=>()=>{for(const geometry of [r.trunk,r.crown,r.secondaryCrown,r.rock,r.groundPebble,r.blade,r.flower])geometry.dispose();for(const material of [r.wood,r.leaves,r.smallLeaves,r.stone,r.soil,r.grass,r.petal])material.dispose()},[r])
 useEffect(()=>{
  if(mode==='V1')return
  const budget=mode==='V2_SLICE'?V2_SLICE_BUDGET:V2_FULL_BUDGET
  const treeIndices=mode==='V2_SLICE'?[...V2_SLICE_TREE_INDICES]:TREES.map((_,index)=>index)
  let treeSlot=0,leafSlot=0,secondarySlot=0
  for(const index of treeIndices){const tree=TREES[index];if(!tree)continue;const [x,z,s,family]=tree
   r.object.position.set(x,surfaceHeight(x,z),z);r.object.rotation.set(0,index*.73,0);r.object.scale.set(s*(.95+family*.07),s*(1.05+(index%3)*.06),s*(.95+family*.05));r.object.updateMatrix();trunks.current?.setMatrixAt(treeSlot++,r.object.matrix)
   for(let n=0;n<18;n++){const a=n*GOLDEN_ANGLE+index*.61,layer=Math.floor(n/6),radius=.45+(n%6)*.38+(family===1?.35:0),height=4.4+layer*1.35-(n%3)*.14
    r.object.position.set(x+Math.cos(a)*radius*s,surfaceHeight(x,z)+(height+.1*Math.sin(a*2))*s,z+Math.sin(a)*radius*s);r.object.rotation.set(n*.11,a,n*.07);r.object.scale.set((1.55+(n%3)*.22)*s,(1.05+layer*.12)*s,(1.4+(n%4)*.16)*s);r.object.updateMatrix();foliage.current?.setMatrixAt(leafSlot++,r.object.matrix)}
   // Smaller satellite masses break the polygon-blob outline and create a real branch/canopy hierarchy.
   for(let n=0;n<28;n++){const a=n*GOLDEN_ANGLE+index*.83,band=n%4,radius=(1.4+band*.48+(family===1?.4:0))*s,height=(3.9+Math.floor(n/7)*1.25+(n%3)*.18)*s
    r.object.position.set(x+Math.cos(a)*radius,surfaceHeight(x,z)+height,z+Math.sin(a)*radius);r.object.rotation.set(a*.18,a,-a*.12);r.object.scale.set((.58+(n%4)*.11)*s,(.42+(n%3)*.09)*s,(.62+(n%5)*.08)*s);r.object.updateMatrix();secondary.current?.setMatrixAt(secondarySlot++,r.object.matrix)}
  }
  let grassSlot=0,flowerSlot=0
  for(let i=0;i<(mode==='V2_SLICE'?900:4300)&&grassSlot<budget.grassInstances;i++){const a=i*GOLDEN_ANGLE,radius=3.5+((i*37)%(mode==='V2_SLICE'?280:1300))/10,x=2+Math.cos(a)*radius,z=-9+Math.sin(a)*radius
   if(!allowsTerrestrialDetail(x,z))continue
   const y=surfaceHeight(x,z);r.object.position.set(x,y+.015,z);r.object.rotation.set(.08,a,(i%7-3)*.035);const scale=.38+(i%11)*.055;r.object.scale.set(scale,.8+(i%9)*.09,scale);r.object.updateMatrix();grass.current?.setMatrixAt(grassSlot++,r.object.matrix)
   if(i%8===0&&flowerSlot<budget.flowerInstances){r.object.position.set(x,y+.5+(i%3)*.08,z);r.object.scale.setScalar(.65+(i%4)*.09);r.object.updateMatrix();flowers.current?.setMatrixAt(flowerSlot++,r.object.matrix)}
  }
  let rockSlot=0,detailSlot=0
  for(let i=0;i<(mode==='V2_SLICE'?260:1500)&&(rockSlot<budget.rockInstances||detailSlot<budget.groundDetailInstances);i++){const a=i*GOLDEN_ANGLE+.4,radius=5+((i*29)%(mode==='V2_SLICE'?250:1320))/10,x=2+Math.cos(a)*radius,z=-9+Math.sin(a)*radius
   if(!allowsGroundDetail(x,z))continue
   const y=surfaceHeight(x,z)
   if(i%5===0&&rockSlot<budget.rockInstances){r.object.position.set(x,y+.08,z);r.object.rotation.set((i%4)*.11,a,(i%3-1)*.13);const s=.18+(i%7)*.055;r.object.scale.set(s*(1+(i%3)*.25),s*.62,s);r.object.updateMatrix();rocks.current?.setMatrixAt(rockSlot++,r.object.matrix)}
   if(detailSlot<budget.groundDetailInstances){r.object.position.set(x,y+.025,z);r.object.rotation.set(0,a,0);const s=.035+(i%6)*.012;r.object.scale.set(s*2.2,s*.42,s*1.4);r.object.updateMatrix();groundDetail.current?.setMatrixAt(detailSlot++,r.object.matrix)}
  }
  if(trunks.current)trunks.current.count=treeSlot;if(foliage.current)foliage.current.count=leafSlot;if(secondary.current)secondary.current.count=secondarySlot;if(grass.current)grass.current.count=grassSlot;if(flowers.current)flowers.current.count=flowerSlot;if(rocks.current)rocks.current.count=rockSlot;if(groundDetail.current)groundDetail.current.count=detailSlot
  for(const mesh of [trunks.current,foliage.current,secondary.current,grass.current,flowers.current,rocks.current,groundDetail.current])if(mesh){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere()}
 },[mode,r])
 useFrame((_,delta)=>{
  if(mode==='V1')return
  clock.current+=delta;for(const material of [r.wood,r.leaves,r.smallLeaves,r.stone,r.soil,r.grass])updateArtMaterial(material,clock.current)
  r.grass.color.copy(env.grass).multiplyScalar(1.08)
  // A tiny coloured floor preserves material identity outside local pools without flattening approved lighting.
  updateNightFloor([r.leaves,r.smallLeaves,r.stone,r.soil],env.night)
  const season=worldTime.realWorld.season;if(season===lastSeason.current||!foliage.current)return;lastSeason.current=season
  const palette=seasonalPalette(season);for(let i=0;i<foliage.current.count;i++){r.color.set(palette[(i*7+Math.floor(i/18))%palette.length]);foliage.current.setColorAt(i,r.color)}if(foliage.current.instanceColor)foliage.current.instanceColor.needsUpdate=true
  if(secondary.current){for(let i=0;i<secondary.current.count;i++){r.color.set(palette[(i*5+Math.floor(i/28)+1)%palette.length]).offsetHSL((i%5-2)*.008,(i%3)*.015,-.025+(i%4)*.012);secondary.current.setColorAt(i,r.color)}if(secondary.current.instanceColor)secondary.current.instanceColor.needsUpdate=true}
  r.petal.color.set(season==='spring'?'#f3c7d9':season==='autumn'?'#d49b50':season==='winter'?'#bdcad0':'#e5d08b')
 })
 if(mode==='V1')return null
 const budget=mode==='V2_SLICE'?V2_SLICE_BUDGET:V2_FULL_BUDGET
 const treeCount=mode==='V2_SLICE'?V2_SLICE_TREE_INDICES.size:TREES.length
 return <group name="RendererV2VerticalSlice">
  <instancedMesh ref={trunks} args={[r.trunk,r.wood,treeCount]} castShadow receiveShadow/>
  <instancedMesh ref={foliage} args={[r.crown,r.leaves,budget.foliageInstances]} castShadow receiveShadow/>
  <instancedMesh ref={secondary} args={[r.secondaryCrown,r.smallLeaves,budget.secondaryFoliageInstances]} castShadow receiveShadow/>
  <instancedMesh ref={grass} args={[r.blade,r.grass,budget.grassInstances]} receiveShadow/>
  <instancedMesh ref={flowers} args={[r.flower,r.petal,budget.flowerInstances]} receiveShadow/>
  <instancedMesh ref={rocks} args={[r.rock,r.stone,budget.rockInstances]} castShadow receiveShadow/>
  <instancedMesh ref={groundDetail} args={[r.groundPebble,r.soil,budget.groundDetailInstances]} receiveShadow/>
 </group>
}
