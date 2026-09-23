import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { DoubleSide, InstancedMesh, MeshStandardMaterial, Object3D } from 'three'
import { environmentState as env } from './environmentState.ts'
import { worldTime } from './worldTime.ts'
import { homeLocalX, homeLocalZ } from './homeSpace.ts'
import { QUALITY, useQuality } from '../graphics/quality.ts'
import { weatherCoordinate, snowfallCount, SNOW_CAPACITY } from './precipitation.ts'
import { HOME, TREES } from './worldLayout.ts'
import { petalGeometry,ginkgoGeometry,mapleGeometry,snowflakeGeometry } from './seasonGeometry.ts'
import { surfaceHeight } from './terrain.ts'
import type { Player } from './locomotion.ts'
const LEAF_CAPACITY=TREES.length*8
const wrap=(v:number,n:number)=>((v%n)+n)%n
export default function SeasonalDetails({player}:{player:RefObject<Player>}) {
 const quality=useQuality()
 const maple=useRef<InstancedMesh>(null)
 const petal=useRef<InstancedMesh>(null),leaf=useRef<InstancedMesh>(null),snow=useRef<InstancedMesh>(null),rain=useRef<InstancedMesh>(null),fallen=useRef<InstancedMesh>(null),flies=useRef<InstancedMesh>(null)
 const light=useRef<MeshStandardMaterial>(null),time=useRef(0)
 const r=useMemo(()=>({object:new Object3D(),petal:petalGeometry(),leaf:ginkgoGeometry(),maple:mapleGeometry(),snow:snowflakeGeometry()}),[])
 useEffect(()=>()=>{r.petal.dispose();r.leaf.dispose();r.maple.dispose();r.snow.dispose()},[r])
 useFrame((_,delta)=>{
  time.current+=delta;const t=time.current,o=r.object,p=player.current.position
  const spring=worldTime.realWorld.season==='spring'?env.bloom:0
  for(let family=0;family<5;family++){
   const mesh=family===0?petal.current:family===1?leaf.current:family===2?snow.current:family===3?rain.current:maple.current;if(!mesh)continue
   const count=family===2?snowfallCount(Math.max(env.snowAmount,env.shower*env.snow),QUALITY[quality].particles):Math.floor((family===3?72:LEAF_CAPACITY)*QUALITY[quality].particles);mesh.count=count
   for(let i=0;i<count;i++){
    const a=i*2.399,layer=i%3,fall=family===3?9:family===2?.6+layer*.2:.3
    const airborneLeaf=family===0||family===1||family===4
    const tree=TREES[i%TREES.length], phase=wrap(i*.713-t*(.16+layer*.045),8)/8
    const drift=Math.sin(t*.18+a)*env.wind*2
    const x=airborneLeaf?tree[0]+Math.sin(a)*3+Math.sin(t*.32+a)*1.2+drift+phase*env.wind*4:weatherCoordinate((i*.61803398875%1)*48-24+drift,p.x)
    const z=airborneLeaf?tree[1]+Math.cos(a*1.3)*3+Math.sin(t*.23+a)*1.1:weatherCoordinate((i*.754877666%1)*48-24+Math.sin(t*.11+a)*env.wind,p.z)
    const y=airborneLeaf?.35+phase*(6*tree[2])+Math.sin(t*.8+a)*.18:wrap(i*.713-t*fall,11)+.15
    o.position.set(x+env.wind*(11-y)*.3,y,z)
    o.rotation.set(family===3?0:Math.sin(t*.4+a)*.8,family===3?0:a+t*.13,family===3?-env.wind*.2:Math.sin(t*.3+a)*.6)
    const sheltered=Math.abs(homeLocalX(x,z))<4&&Math.abs(homeLocalZ(x,z))<3.5&&y<5.8
    const enabled=Number(!sheltered)*Math.max(0,Math.min(1,(airborneLeaf?count*(family===0?worldTime.realWorld.season==='spring'?Math.min(1,spring+.35):0:worldTime.realWorld.season==='autumn'?Math.max(.55,env.leafFall):0):family===2?count:env.rain*72)-i))
    const scale=(family===3?1:family===2?.075:family===1||family===4?.28:.22)*(layer===0?1.3:1)*enabled
    o.scale.setScalar(scale);o.updateMatrix();mesh.setMatrixAt(i,o.matrix)
   }
   mesh.instanceMatrix.needsUpdate=true
  }
  if(fallen.current){for(let i=0;i<32;i++){
   const a=i*2.399,x=HOME.x+Math.sin(a)*(4+i%4),z=HOME.z+5+Math.cos(a)*4
   o.position.set(x,surfaceHeight(x,z)+.025,z);o.rotation.set(-Math.PI/2,0,a)
   o.scale.setScalar(Number(!(Math.abs(homeLocalX(x,z))<4&&Math.abs(homeLocalZ(x,z))<3.5))*.13*Math.max(spring,env.leafFall)*Math.max(0,Math.min(1,env.richness*32-i)));o.updateMatrix();fallen.current.setMatrixAt(i,o.matrix)
  }fallen.current.instanceMatrix.needsUpdate=true}
  if(light.current)light.current.emissiveIntensity=1.7+Math.sin(t*.7)*.3
  if(flies.current){flies.current.count=Math.floor(32*QUALITY[quality].particles);for(let i=0;i<flies.current.count;i++){
   const a=i*2.399; o.position.set(HOME.x-7+Math.sin(a)*6+Math.sin(t*.3+a),.7+(i%5)*.3+Math.sin(t*.4+a)*.3,HOME.z+7+Math.cos(a)*6)
   o.rotation.set(0,0,0);o.scale.setScalar(.035*env.fireflies*(.7+Math.sin(t+a)*.3));o.updateMatrix();flies.current.setMatrixAt(i,o.matrix)
  }flies.current.instanceMatrix.needsUpdate=true}
 })
 return <>
  <instancedMesh ref={petal} args={[r.petal,undefined,LEAF_CAPACITY]} frustumCulled={false}><meshStandardMaterial color="#ffd4e7" side={DoubleSide} roughness={.8}/></instancedMesh>
  <instancedMesh ref={leaf} args={[r.leaf,undefined,LEAF_CAPACITY]} frustumCulled={false}><meshStandardMaterial color="#eac46a" side={DoubleSide} roughness={.9}/></instancedMesh>
  <instancedMesh ref={maple} args={[r.maple,undefined,LEAF_CAPACITY]} frustumCulled={false}><meshStandardMaterial color="#ce713d" side={DoubleSide} roughness={.9}/></instancedMesh>
  <instancedMesh ref={snow} args={[r.snow,undefined,SNOW_CAPACITY]} frustumCulled={false}><meshStandardMaterial color="#e8f6ff" emissive="#b8d4e8" emissiveIntensity={.16} side={DoubleSide} roughness={.6}/></instancedMesh>
  <instancedMesh ref={rain} args={[undefined,undefined,72]} frustumCulled={false}><cylinderGeometry args={[.008,.013,.65,4]}/><meshBasicMaterial color="#b9d6e8" transparent opacity={.4} depthWrite={false}/></instancedMesh>
  <instancedMesh ref={fallen} args={[r.leaf,undefined,32]} frustumCulled={false}><meshStandardMaterial color="#d2b799" side={DoubleSide} roughness={1}/></instancedMesh>
  <instancedMesh ref={flies} args={[undefined,undefined,32]} frustumCulled={false}><sphereGeometry args={[1,6,4]}/><meshStandardMaterial ref={light} userData={{managedGlow:true}} color="#e8f4b3" emissive="#d8f4a0" toneMapped={false}/></instancedMesh>
 </>
}
