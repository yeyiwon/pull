import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { DoubleSide, InstancedMesh, MeshStandardMaterial, Object3D } from 'three'
import { environmentState as env } from './environmentState.ts'
import { worldTime } from './worldTime.ts'
import { homeLocalX, homeLocalZ } from './homeSpace.ts'
import { QUALITY, useQuality } from '../graphics/quality.ts'
import { HOME } from './worldLayout.ts'
import { petalGeometry,ginkgoGeometry,snowflakeGeometry,mapleGeometry } from './seasonGeometry.ts'
import { heroLab } from '../environment/heroLab.ts'
import { LAKESIDE_TREES,isCherryTree } from './lakesideDressing.ts'
import { surfaceHeight } from './terrain.ts'
import type { Player } from './locomotion.ts'
const wrap=(v:number,n:number)=>((v%n)+n)%n
export default function SeasonalDetails({player}:{player:RefObject<Player>}) {
 const quality=useQuality()
 const petal=useRef<InstancedMesh>(null),leaf=useRef<InstancedMesh>(null),snow=useRef<InstancedMesh>(null),rain=useRef<InstancedMesh>(null),fallen=useRef<InstancedMesh>(null),flies=useRef<InstancedMesh>(null)
 const maple=useRef<InstancedMesh>(null)
 const light=useRef<MeshStandardMaterial>(null),time=useRef(0)
 const r=useMemo(()=>({object:new Object3D(),maple:mapleGeometry(),petal:petalGeometry(),leaf:ginkgoGeometry(),snow:snowflakeGeometry()}),[])
 useEffect(()=>()=>{r.maple.dispose();r.petal.dispose();r.leaf.dispose();r.snow.dispose()},[r])
 useFrame((_,delta)=>{
  time.current+=delta;const t=time.current,o=r.object,p=player.current.position
  const spring=worldTime.realWorld.season==='spring'?env.bloom:0
  for(let family=0;family<5;family++){
   const mesh=family===0?petal.current:family===1?leaf.current:family===2?snow.current:family===3?rain.current:maple.current;if(!mesh)continue
   const count=Math.floor((family===2?180:family===3?72:family===0?160:64)*QUALITY[quality].particles);mesh.count=count
   for(let i=0;i<count;i++){
    const a=i*2.399,layer=i%3,fall=family===3?9:family===2?.32+layer*.12:.3
    let x=p.x+Math.sin(a)* (layer===0?5:layer===1?13:27)+Math.sin(t*.18+a)*env.wind*2
    let z=p.z+Math.cos(a*1.3)*(layer===0?5:layer===1?13:27)
    let y=wrap(i*.713-t*fall,11)+.15
    if((family===0||family===1||family===4)&&heroLab.layoutV3()){
     const tree=LAKESIDE_TREES[(i*7)%LAKESIDE_TREES.length],drift=wrap(i*.41+t*(.35+env.wind),9)-4.5
     x=tree[0]+drift;z=tree[1]+Math.sin(a+t*.21)*2.8;y=surfaceHeight(x,z)+1.4+wrap(i*.31-t*.09,4)
    }
    o.position.set(x+env.wind*(11-y)*.3,y,z)
    o.rotation.set(family===3?0:Math.sin(t*.4+a)*.8,family===3?0:a+t*.13,family===3?-env.wind*.2:Math.sin(t*.3+a)*.6)
    const sheltered=Math.abs(homeLocalX(x,z))<4&&Math.abs(homeLocalZ(x,z))<3.5&&y<5.8*HOME.scale
    const fromCherry=family!==0||!heroLab.layoutV3()||isCherryTree((i*7)%LAKESIDE_TREES.length)
    const enabled=Number(!sheltered&&fromCherry)*Math.max(0,Math.min(1,(family===0?spring*(40+env.shower*8):(family===1||family===4)?env.leafFall*(52+env.shower*12):family===2?Math.max(env.snowAmount,env.shower*env.snow)*170:env.rain*72)-i))
    const scale=(family===3?.7+(i%5)*.09:family===2?.19:(family===1||family===4)?.23:.21)*(layer===0?.85:1)*enabled
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
  <instancedMesh ref={petal} args={[r.petal,undefined,160]} frustumCulled={false}><meshStandardMaterial color="#ffd4e7" side={DoubleSide} roughness={.8}/></instancedMesh>
  <instancedMesh ref={leaf} args={[r.leaf,undefined,64]} frustumCulled={false}><meshStandardMaterial color="#eac46a" side={DoubleSide} roughness={.9}/></instancedMesh>
  <instancedMesh ref={maple} args={[r.maple,undefined,64]} frustumCulled={false}><meshStandardMaterial color="#c0774d" side={DoubleSide} roughness={.9}/></instancedMesh>
  <instancedMesh ref={snow} args={[r.snow,undefined,180]} frustumCulled={false}><meshStandardMaterial color="#e8f6ff" emissive="#b8d4e8" emissiveIntensity={.16} side={DoubleSide} roughness={.6}/></instancedMesh>
  <instancedMesh ref={rain} args={[undefined,undefined,72]} frustumCulled={false}><cylinderGeometry args={[.004,.006,.38,4]}/><meshBasicMaterial color="#b9d6e8" transparent opacity={.24} depthWrite={false}/></instancedMesh>
  <instancedMesh ref={fallen} args={[r.leaf,undefined,32]} frustumCulled={false}><meshStandardMaterial color="#d2b799" side={DoubleSide} roughness={1}/></instancedMesh>
  <instancedMesh ref={flies} args={[undefined,undefined,32]} frustumCulled={false}><sphereGeometry args={[1,6,4]}/><meshStandardMaterial ref={light} userData={{managedGlow:true}} color="#e8f4b3" emissive="#d8f4a0" toneMapped={false}/></instancedMesh>
 </>
}
