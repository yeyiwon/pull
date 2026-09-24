import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, DoubleSide, Group, InstancedMesh, Object3D, MeshStandardMaterial, SphereGeometry } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { environmentState as env } from './environmentState.ts'
import { TREES, MUSHROOMS } from './worldLayout.ts'
import { branch, leafBlade, weatheredStone } from './artGeometry.ts'
import { artMaterial, updateArtMaterial } from '../graphics/artMaterial.ts'
import { worldTime } from './worldTime.ts'
import { useQuality } from '../graphics/quality.ts'
import { V2_SLICE_TREE_INDICES,useRendererMode } from '../graphics/rendererV2.ts'

function treeSkeleton(family:number){
 const parts=[branch([[0,-.12,0],[-.25,1.8,.12],[.18,3.5,0],[.65,5.3,-.25],[.2,7.6,-.15]],.5,.06)]
 for(let n=0;n<7;n++){
  const a=n*2.399+family*.7,y=2.8+n*.48,x=Math.cos(a),z=Math.sin(a),reach=(family===2?1.05:family===1?2.5:1.8)+(n%3)*.35
  parts.push(branch([[.05,y,0],[x*.7,y+.65,z*.7],[x*reach,y+1.5,z*reach],[x*(reach+.45),y+2.2,z*(reach+.45)]],.19-n*.013,.023))
  parts.push(branch([[x*reach*.6,y+1.1,z*reach*.6],[x*reach+.35,y+1.7,z*reach-.4],[x*reach+.7,y+2.1,z*reach-.7]],.065,.014))
 }
 for(let n=0;n<5;n++){const a=n*1.256;parts.push(branch([[0,.65,0],[Math.cos(a)*.65,.12,Math.sin(a)*.65],[Math.cos(a)*1.5,-.035,Math.sin(a)*1.5]],.24,.025))}
 const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());return g
}
export default function FantasyGrove() {
 const quality=useQuality(),rendererMode=useRendererMode(), foliage=useRef<InstancedMesh>(null),grass=useRef<InstancedMesh>(null),canopy=useRef<Group>(null)
 const snowCaps=useRef<InstancedMesh>(null),red=useRef<InstancedMesh>(null),green=useRef<InstancedMesh>(null)
 const time=useRef(0),lastSnow=useRef(-1),lastSeason=useRef(''),lastRenderer=useRef('')
 const r=useMemo(()=>({
  object:new Object3D(),color:new Color(),wood:artMaterial('#746553','bark'),
  leaves:artMaterial('#ffffff','leaf'), snow:new MeshStandardMaterial({color:'#dbe5ed',roughness:.95}),bulb:new SphereGeometry(.05,5,3),red:new MeshStandardMaterial({color:'#f39798',emissive:'#d54d5f',emissiveIntensity:1.4,toneMapped:false}),green:new MeshStandardMaterial({color:'#b4ecd0',emissive:'#61b889',emissiveIntensity:1.4,toneMapped:false}), grass:Object.assign(artMaterial('#7d9d82','leaf'),{side:DoubleSide}),cap:artMaterial('#c3a6ac'),
  skeletons:[0,1,2].map(treeSkeleton),crown:weatheredStone(2,true,18),snowCrown:weatheredStone(3,true,10),blade:leafBlade(.14,1,.3),mushroom:weatheredStone(4),
  stems:branch([[0,0,0],[-.12,1,0],[.08,2.2,.1],[0,2.8,0]],.23,.13),
 }),[])
 useEffect(()=>{return()=>{r.skeletons.forEach(g=>g.dispose());r.crown.dispose();r.snowCrown.dispose();r.blade.dispose();r.mushroom.dispose();r.stems.dispose();r.wood.dispose();r.leaves.dispose();r.grass.dispose();r.cap.dispose();r.snow.dispose();r.bulb.dispose();r.red.dispose();r.green.dispose()}},[r])
 useEffect(()=>{
  const mesh=grass.current;if(!mesh)return
  for(let i=0;i<(TREES.length*48);i++){
   const [x,z,s]=TREES[Math.floor(i/48)],a=i*2.399,radius=1.1+(i%11)*.24
   r.object.position.set(x+Math.cos(a)*radius,-.01,z+Math.sin(a)*radius)
   r.object.rotation.set(.12, a, (i%5-2)*.12);r.object.scale.setScalar((.32+(i%7)*.08)*s)
   r.object.updateMatrix();mesh.setMatrixAt(i,r.object.matrix)
  }mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere()
 },[r])
 useFrame((_,delta)=>{
  time.current+=delta;updateArtMaterial(r.wood,time.current);updateArtMaterial(r.leaves,time.current);updateArtMaterial(r.grass,time.current);updateArtMaterial(r.cap,time.current)
  r.grass.color.copy(env.grass).multiplyScalar(1.12)
  const season=worldTime.realWorld.season
  if(snowCaps.current)snowCaps.current.visible=env.snow>.02
  if(red.current)red.current.visible=rendererMode==='V1'||rendererMode==='V2_SLICE'&&season==='winter'&&env.night>.2
  if(green.current)green.current.visible=rendererMode==='V1'||rendererMode==='V2_SLICE'&&season==='winter'&&env.night>.2
  if(grass.current)grass.current.count=rendererMode==='V2_FULL'||rendererMode==='V3_FULL'?0:quality==='PERFORMANCE'?(TREES.length*24):(TREES.length*48)
  if(canopy.current)canopy.current.rotation.z=Math.sin(time.current*.23)*.003
  if(foliage.current && (Math.abs(lastSnow.current-env.snow)>.002||lastSeason.current!==season||lastRenderer.current!==rendererMode)){
   lastSnow.current=env.snow;lastSeason.current=season;lastRenderer.current=rendererMode
   for(let i=0;i<(TREES.length*20);i++){
    const tree=Math.floor(i/20),n=i%20,[x,z,s,family]=TREES[tree],a=n*2.399+family*.7
    const radius=(family===2?.25:.6)+(n%5)*(family===2?.22:.48),y=(family===2?4.2:5.3)+(n%4)*(family===2?1.1:.56)-Math.max(0,radius-1)*.35
    r.object.position.set(x+(Math.cos(a)*radius+.2)*s,y*s,z+Math.sin(a)*radius*s)
    r.object.rotation.set(n*.13,a,n*.07)
    const winter=family===2?1:Math.max(.68,1-env.snow*.32),replaced=rendererMode==='V2_FULL'||rendererMode==='V3_FULL'||rendererMode==='V2_SLICE'&&V2_SLICE_TREE_INDICES.has(tree)
    r.object.scale.set((1.3+n%3*.22)*s*winter,(.85+n%3*.16)*s*winter,(1.2+n%4*.14)*s*winter);if(replaced)r.object.scale.setScalar(0)
    r.object.updateMatrix();foliage.current.setMatrixAt(i,r.object.matrix)
    const palette=season==='spring'?(family===2?['#6d9872','#88aa78']:['#f3c5d8','#efb2cf','#ffe0e5']):season==='autumn'?['#bd733b','#d5a349','#b34d40','#8e9b63']:season==='winter'?['#708a7b','#7a8b83']:['#6e9c67','#8baa6b','#507f5c']
    r.color.set(palette[(tree+n)%palette.length]);foliage.current.setColorAt(i,r.color)
    r.object.position.setY(r.object.position.y+(.68+(n%3)*.12)*s*winter)
    r.object.scale.set((1.28+n%3*.22)*s*winter, (.13+env.snow*.16)*s*env.snow,(1.18+n%4*.14)*s*winter)
    if(env.snow<.02)r.object.scale.setScalar(0)
    r.object.updateMatrix();snowCaps.current?.setMatrixAt(i,r.object.matrix)
    if(n<10){const angle=n*2.4,radial=(1.5+(n%3)*.25)*s;r.object.position.set(x+Math.cos(angle)*radial,(3.1+n*.33)*s,z+Math.sin(angle)*radial);r.object.scale.setScalar(1);r.object.updateMatrix();red.current?.setMatrixAt(tree*10+n,r.object.matrix);r.object.position.setY(r.object.position.y+.16*s);r.object.position.setX(r.object.position.x+.13*s);r.object.updateMatrix();green.current?.setMatrixAt(tree*10+n,r.object.matrix)}
   }
   for(const mesh of [snowCaps.current,red.current,green.current])if(mesh){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere()}
   foliage.current.instanceMatrix.needsUpdate=true;if(foliage.current.instanceColor)foliage.current.instanceColor.needsUpdate=true
  }
 })
 return <>
  {TREES.map(([x,z,s,family],i)=>(rendererMode==='V2_FULL'||rendererMode==='V3_FULL'||rendererMode==='V2_SLICE'&&V2_SLICE_TREE_INDICES.has(i))?null:<mesh key={i} position={[x,0,z]} scale={s} geometry={r.skeletons[family]} material={r.wood} castShadow={quality!=='PERFORMANCE'||i<5} receiveShadow/>)}
  <group ref={canopy}><instancedMesh ref={foliage} args={[r.crown,r.leaves,(TREES.length*20)]} frustumCulled={false} castShadow={quality!=='PERFORMANCE'} receiveShadow/></group>
  <instancedMesh ref={snowCaps} args={[r.snowCrown,r.snow,TREES.length*20]} frustumCulled={false} receiveShadow/>
  <instancedMesh ref={red} args={[r.bulb,r.red,TREES.length*10]}/><instancedMesh ref={green} args={[r.bulb,r.green,TREES.length*10]}/>
  <instancedMesh ref={grass} args={[r.blade,r.grass,(TREES.length*48)]} frustumCulled={false}/>
  {MUSHROOMS.map(([x,z,s],i)=><group key={i} position={[x,0,z]} scale={s} rotation={[0,i,0]}>
   <mesh geometry={r.stems} material={r.wood} castShadow/>
   <mesh geometry={r.mushroom} material={r.cap} position={[.12,2.65,0]} scale={[2.1,.55,1.85]} castShadow receiveShadow/>
   <mesh geometry={r.mushroom} material={r.wood} position={[.12,2.44,0]} scale={[1.85,.12,1.65]}/>
  </group>)}
 </>
}
