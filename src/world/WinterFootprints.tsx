import { useEffect,useMemo,useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { CapsuleGeometry,InstancedMesh,MeshStandardMaterial,Object3D,Vector3 } from 'three'
import type { Player } from './locomotion.ts'
import { environmentState as env } from './environmentState.ts'
import { worldTime } from './worldTime.ts'
import { surfaceHeight,waterDepth } from './terrain.ts'

const CAPACITY=36,LIFETIME=22
export default function WinterFootprints({player}:{player:RefObject<Player>}){
 const mesh=useRef<InstancedMesh>(null),last=useRef(new Vector3()),cursor=useRef(0),step=useRef(0),marks=useRef(Array.from({length:CAPACITY},()=>({x:0,z:0,y:-10,yaw:0,born:-999}))),clock=useRef(0)
 const r=useMemo(()=>({o:new Object3D(),geometry:new CapsuleGeometry(.1,.26,3,8),material:new MeshStandardMaterial({color:'#b9cad5',roughness:.96,metalness:0,transparent:true,opacity:.72})}),[])
 useEffect(()=>()=>{r.geometry.dispose();r.material.dispose()},[r])
 useFrame((_,delta)=>{
  clock.current+=delta;const p=player.current,active=worldTime.realWorld.season==='winter'&&env.snow>.18
  if(last.current.lengthSq()===0||!active)last.current.copy(p.position)
  const moved=Math.hypot(p.position.x-last.current.x,p.position.z-last.current.z)
  if(active&&p.isGrounded&&p.groundState!=='IDLE'&&waterDepth(p.position.x,p.position.z)<.02&&moved>(p.groundState==='RUN'?.48:.68)){
   const forward=new Vector3(0,0,1).applyQuaternion(p.rotation),side=step.current++%2?1:-1,mark=marks.current[cursor.current]
   mark.x=p.position.x+forward.z*.13*side;mark.z=p.position.z-forward.x*.13*side;mark.y=surfaceHeight(mark.x,mark.z)+.018;mark.yaw=Math.atan2(forward.x,forward.z);mark.born=clock.current;cursor.current=(cursor.current+1)%CAPACITY;last.current.copy(p.position)
  }
  if(!mesh.current)return
  let visible=0
  for(const mark of marks.current){const age=clock.current-mark.born;if(!active||age<0||age>LIFETIME)continue;const fade=Math.max(0,1-age/LIFETIME);r.o.position.set(mark.x,mark.y,mark.z);r.o.rotation.set(Math.PI/2,0,-mark.yaw);r.o.scale.set(.72*fade,.5*fade,1);r.o.updateMatrix();mesh.current.setMatrixAt(visible++,r.o.matrix)}
  mesh.current.count=visible;mesh.current.instanceMatrix.needsUpdate=true
 })
 return <instancedMesh ref={mesh} name="WinterMoruFootprints" args={[r.geometry,r.material,CAPACITY]} receiveShadow frustumCulled={false}/>
}
