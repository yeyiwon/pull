import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, DoubleSide, Group, InstancedMesh, Object3D } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { environmentState as env } from './environmentState.ts'
import { TREES, MUSHROOMS } from './worldLayout.ts'
import { branch, leafBlade, weatheredStone } from './artGeometry.ts'
import { artMaterial, updateArtMaterial } from '../graphics/artMaterial.ts'
import { useQuality } from '../graphics/quality.ts'

function treeSkeleton(family:number){
 const parts=[branch([[0,-.12,0],[-.25,1.8,.12],[.18,3.5,0],[.65,5.3,-.25],[.2,7.6,-.15]],.5,.06)]
 for(let n=0;n<7;n++){
  const a=n*2.399+family*.7,y=2.8+n*.48,x=Math.cos(a),z=Math.sin(a),reach=1.8+(n%3)*.35
  parts.push(branch([[.05,y,0],[x*.7,y+.65,z*.7],[x*reach,y+1.5,z*reach],[x*(reach+.45),y+2.2,z*(reach+.45)]],.19-n*.013,.023))
  parts.push(branch([[x*reach*.6,y+1.1,z*reach*.6],[x*reach+.35,y+1.7,z*reach-.4],[x*reach+.7,y+2.1,z*reach-.7]],.065,.014))
 }
 for(let n=0;n<5;n++){const a=n*1.256;parts.push(branch([[0,.65,0],[Math.cos(a)*.65,.12,Math.sin(a)*.65],[Math.cos(a)*1.5,-.035,Math.sin(a)*1.5]],.24,.025))}
 const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());return g
}
export default function FantasyGrove() {
 const quality=useQuality(), foliage=useRef<InstancedMesh>(null),grass=useRef<InstancedMesh>(null),canopy=useRef<Group>(null)
 const time=useRef(0),lastSnow=useRef(-1)
 const r=useMemo(()=>({
  object:new Object3D(),color:new Color(),wood:artMaterial('#6b776d','bark'),
  leaves:artMaterial('#9eb89b','leaf'), grass:Object.assign(artMaterial('#7d9d82','leaf'),{side:DoubleSide}),cap:artMaterial('#c3a6ac'),
  skeletons:[0,1,2].map(treeSkeleton),crown:weatheredStone(2,true,18),blade:leafBlade(.14,1,.3),mushroom:weatheredStone(4),
  stems:branch([[0,0,0],[-.12,1,0],[.08,2.2,.1],[0,2.8,0]],.23,.13),
 }),[])
 useEffect(()=>{return()=>{r.skeletons.forEach(g=>g.dispose());r.crown.dispose();r.blade.dispose();r.mushroom.dispose();r.stems.dispose();r.wood.dispose();r.leaves.dispose();r.grass.dispose();r.cap.dispose()}},[r])
 useEffect(()=>{
  const mesh=grass.current;if(!mesh)return
  for(let i=0;i<240;i++){
   const [x,z,s]=TREES[Math.floor(i/48)],a=i*2.399,radius=1.1+(i%11)*.24
   r.object.position.set(x+Math.cos(a)*radius,-.01,z+Math.sin(a)*radius)
   r.object.rotation.set(.12, a, (i%5-2)*.12);r.object.scale.setScalar((.32+(i%7)*.08)*s)
   r.object.updateMatrix();mesh.setMatrixAt(i,r.object.matrix)
  }mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere()
 },[r])
 useFrame((_,delta)=>{
  time.current+=delta;updateArtMaterial(r.wood,time.current);updateArtMaterial(r.leaves,time.current);updateArtMaterial(r.grass,time.current);updateArtMaterial(r.cap,time.current)
  r.leaves.color.copy(env.foliage);r.grass.color.copy(env.grass).multiplyScalar(1.12)
  if(grass.current)grass.current.count=quality==='PERFORMANCE'?120:240
  if(canopy.current)canopy.current.rotation.z=Math.sin(time.current*.23)*.003
  if(foliage.current && Math.abs(lastSnow.current-env.snow)>.002){
   lastSnow.current=env.snow
   for(let i=0;i<100;i++){
    const tree=Math.floor(i/20),n=i%20,[x,z,s,family]=TREES[tree],a=n*2.399+family*.7
    const radius=.6+(n%5)*.48,y=5.3+(n%4)*.56-Math.max(0,radius-1)*.35
    r.object.position.set(x+(Math.cos(a)*radius+.2)*s,y*s,z+Math.sin(a)*radius*s)
    r.object.rotation.set(n*.13,a,n*.07)
    const winter=family===2?1:Math.max(.001,1-env.snow*1.15)
    r.object.scale.set((.85+n%3*.18)*s*winter,(.42+n%3*.11)*s*winter,(.78+n%4*.1)*s*winter)
    r.object.updateMatrix();foliage.current.setMatrixAt(i,r.object.matrix)
    r.color.setHSL(.08,.08,.65+(n%5)*.035);foliage.current.setColorAt(i,r.color)
   }
   foliage.current.instanceMatrix.needsUpdate=true;if(foliage.current.instanceColor)foliage.current.instanceColor.needsUpdate=true
  }
 })
 return <>
  {TREES.map(([x,z,s,family],i)=><mesh key={i} position={[x,0,z]} scale={s} geometry={r.skeletons[family]} material={r.wood} castShadow receiveShadow/>)}
  <group ref={canopy}><instancedMesh ref={foliage} args={[r.crown,r.leaves,100]} frustumCulled={false} castShadow receiveShadow/></group>
  <instancedMesh ref={grass} args={[r.blade,r.grass,240]} frustumCulled={false}/>
  {MUSHROOMS.map(([x,z,s],i)=><group key={i} position={[x,0,z]} scale={s} rotation={[0,i,0]}>
   <mesh geometry={r.stems} material={r.wood} castShadow/>
   <mesh geometry={r.mushroom} material={r.cap} position={[.12,2.65,0]} scale={[2.1,.55,1.85]} castShadow receiveShadow/>
   <mesh geometry={r.mushroom} material={r.wood} position={[.12,2.44,0]} scale={[1.85,.12,1.65]}/>
  </group>)}
 </>
}
