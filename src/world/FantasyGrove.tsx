import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, DoubleSide, InstancedMesh, Object3D } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { environmentState as env } from './environmentState.ts'
import { worldTime } from './worldTime.ts'
import { riverbedHeight } from './terrain.ts'
import { SEASON_FOLIAGE,isCherryTree } from './lakesideDressing.ts'
import type { DressingTree } from './lakesideDressing.ts'
import { TREES, MUSHROOMS } from './worldLayout.ts'
import { branch, leafBlade, weatheredStone } from './artGeometry.ts'
import { artMaterial, updateArtMaterial } from '../graphics/artMaterial.ts'
import { useQuality } from '../graphics/quality.ts'

function treeSkeleton(family:number,lowCost=false){
 const twig=(points:number[][],radius:number,end:number)=>branch(points,radius,end,lowCost?9:18,lowCost?6:9)
 const parts=[twig([[0,-.12,0],[-.25,1.8,.12],[.18,3.5,0],[.65,5.3,-.25],[.2,7.6,-.15]],.5,.06)]
 for(let n=0;n<7;n++){
  const a=n*2.399+family*.7,y=2.8+n*.48,x=Math.cos(a),z=Math.sin(a),reach=1.8+(n%3)*.35
  parts.push(twig([[.05,y,0],[x*.7,y+.65,z*.7],[x*reach,y+1.5,z*reach],[x*(reach+.45),y+2.2,z*(reach+.45)]],.19-n*.013,.023))
  parts.push(twig([[x*reach*.6,y+1.1,z*reach*.6],[x*reach+.35,y+1.7,z*reach-.4],[x*reach+.7,y+2.1,z*reach-.7]],.065,.014))
 }
 for(let n=0;n<5;n++){const a=n*1.256;parts.push(twig([[0,.65,0],[Math.cos(a)*.65,.12,Math.sin(a)*.65],[Math.cos(a)*1.5,-.035,Math.sin(a)*1.5]],.24,.025))}
 const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());return g
}
export default function FantasyGrove({trees=TREES,dressed=false}:{trees?:readonly DressingTree[];dressed?:boolean}) {
 const quality=useQuality(), foliage=useRef<InstancedMesh>(null),grass=useRef<InstancedMesh>(null)
 const trunks=useRef<(InstancedMesh|null)[]>([])
 const time=useRef(0),lastSnow=useRef(-1),lastBloom=useRef(-1),lastSpring=useRef(false),lastSeason=useRef(''),foliageTick=useRef(0)
 const r=useMemo(()=>({
  object:new Object3D(),color:new Color(),wood:artMaterial('#6b776d','bark'),
  leaves:artMaterial('#9eb89b','leaf'), grass:Object.assign(artMaterial('#7d9d82','leaf'),{side:DoubleSide}),cap:artMaterial('#c3a6ac'),
  skeletons:[0,1,2].map(n=>treeSkeleton(n,dressed)),crown:weatheredStone(2,true,dressed?10:18),blade:leafBlade(.14,1,.3),mushroom:weatheredStone(4),
  stems:branch([[0,0,0],[-.12,1,0],[.08,2.2,.1],[0,2.8,0]],.23,.13),
 }),[dressed])
 useEffect(()=>{return()=>{r.skeletons.forEach(g=>g.dispose());r.crown.dispose();r.blade.dispose();r.mushroom.dispose();r.stems.dispose();r.wood.dispose();r.leaves.dispose();r.grass.dispose();r.cap.dispose()}},[r])
 useEffect(()=>{
  if(dressed)for(let family=0;family<3;family++){
   const trunk=trunks.current[family];if(!trunk)continue
   let index=0
   for(const [x,z,s,f] of trees){if(f!==family)continue
    r.object.position.set(x,riverbedHeight(x,z),z);r.object.rotation.set(0,x*.23,0);r.object.scale.setScalar(s);r.object.updateMatrix();trunk.setMatrixAt(index++,r.object.matrix)
   }trunk.count=index;trunk.instanceMatrix.needsUpdate=true;trunk.computeBoundingSphere()
  }
  const mesh=grass.current;if(!mesh)return
  for(let i=0;i<trees.length*48;i++){
   const [x,z,s]=trees[Math.floor(i/48)],a=i*2.399,radius=1.1+(i%11)*.24
   r.object.position.set(x+Math.cos(a)*radius,riverbedHeight(x+Math.cos(a)*radius,z+Math.sin(a)*radius),z+Math.sin(a)*radius)
   r.object.rotation.set(.12, a, (i%5-2)*.12);r.object.scale.setScalar((.32+(i%7)*.08)*s)
   r.object.updateMatrix();mesh.setMatrixAt(i,r.object.matrix)
  }mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere()
 },[r,trees,dressed])
 useFrame((_,delta)=>{
  time.current+=delta;updateArtMaterial(r.wood,time.current);updateArtMaterial(r.leaves,time.current);updateArtMaterial(r.grass,time.current);updateArtMaterial(r.cap,time.current)
  r.leaves.color.set('#ffffff');r.grass.color.copy(env.grass).multiplyScalar(1.12)
  if(grass.current)grass.current.count=quality==='PERFORMANCE'?trees.length*24:trees.length*48
  const season=worldTime.realWorld.season,spring=season==='spring'
  foliageTick.current+=delta
  if(foliage.current && foliageTick.current>.15 && (lastSeason.current!==season || Math.abs(lastSnow.current-env.snow)>.002 || Math.abs(lastBloom.current-env.bloom)>.002 || lastSpring.current!==spring)){
   foliageTick.current=0;lastSeason.current=season;lastSnow.current=env.snow;lastBloom.current=env.bloom;lastSpring.current=spring
   for(let i=0;i<trees.length*20;i++){
    const tree=Math.floor(i/20),n=i%20,[x,z,s,family]=trees[tree],a=n*2.399+family*.7
    const radius=.6+(n%5)*.48,y=5.3+(n%4)*.56-Math.max(0,radius-1)*.35
    r.object.position.set(x+(Math.cos(a)*radius+.2)*s,riverbedHeight(x,z)+y*s,z+Math.sin(a)*radius*s)
    r.object.rotation.set(n*.13,a,n*.07)
    const winter=family===2?1:Math.max(.001,1-(dressed&&season==='winter'?.92:env.snow)*1.15)
    const fullness=1+(spring?env.bloom*.24:0)
    r.object.scale.set((.85+n%3*.18)*s*winter*fullness,(.42+n%3*.11)*s*winter*fullness,(.78+n%4*.1)*s*winter*fullness)
    r.object.updateMatrix();foliage.current.setMatrixAt(i,r.object.matrix)
    r.color.copy(env.foliage).lerp(env.flower,spring&&family!==2?(n%3===0?.92:.38)*env.bloom:0);if(dressed){r.color.set(spring&&isCherryTree(tree)?['#e9c3d2','#f2d7df','#dcb1c6'][tree%3]:SEASON_FOLIAGE[season][family===2?3:tree%3]).multiplyScalar(.88+(n%5)*.045)};foliage.current.setColorAt(i,r.color)
   }
   foliage.current.instanceMatrix.needsUpdate=true;if(foliage.current.instanceColor)foliage.current.instanceColor.needsUpdate=true
  }
 })
 return <>
  {!dressed&&trees.map(([x,z,s,family],i)=><mesh key={i} position={[x,riverbedHeight(x,z),z]} scale={s} geometry={r.skeletons[family]} material={r.wood} castShadow={quality!=='PERFORMANCE'} receiveShadow/>)}
  {dressed&&r.skeletons.map((g,i)=><instancedMesh key={i} ref={m=>{trunks.current[i]=m}} args={[g,r.wood,trees.length]} receiveShadow castShadow={quality!=='PERFORMANCE'}/>)}
  <instancedMesh ref={foliage} args={[r.crown,r.leaves,trees.length*20]} frustumCulled={false} castShadow={quality!=='PERFORMANCE'} receiveShadow/>
  <instancedMesh ref={grass} args={[r.blade,r.grass,trees.length*48]} frustumCulled={false}/>
  {!dressed&&MUSHROOMS.map(([x,z,s],i)=><group key={i} position={[x,riverbedHeight(x,z),z]} scale={s} rotation={[0,i,0]}>
   <mesh geometry={r.stems} material={r.wood} castShadow/>
   <mesh geometry={r.mushroom} material={r.cap} position={[.12,2.65,0]} scale={[2.1,.55,1.85]} castShadow receiveShadow/>
   <mesh geometry={r.mushroom} material={r.wood} position={[.12,2.44,0]} scale={[1.85,.12,1.65]}/>
  </group>)}
 </>
}
