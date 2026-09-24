import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { useFrame } from '@react-three/fiber'
import { DoubleSide, Group, Quaternion, Vector3 } from 'three'
import type { Mesh, MeshBasicMaterial } from 'three'
import { surfaceHeight } from './terrain.ts'
import { tapDestination } from './tapDestination.ts'

const up=new Vector3(0,0,1)
function groundPose(point:Vector3){
 const d=.18,hx=surfaceHeight(point.x+d,point.z)-surfaceHeight(point.x-d,point.z),hz=surfaceHeight(point.x,point.z+d)-surfaceHeight(point.x,point.z-d)
 const normal=new Vector3(-hx,2*d,-hz).normalize()
 return {position:new Vector3(point.x,surfaceHeight(point.x,point.z)+.035,point.z),quaternion:new Quaternion().setFromUnitVectors(up,normal)}
}
export default function TapRipple(){
 const destination=useSyncExternalStore(tapDestination.subscribe,tapDestination.getSnapshot,tapDestination.getSnapshot),group=useRef<Group>(null),age=useRef(0)
 const pose=useMemo(()=>destination.point?groundPose(destination.point):null,[destination])
 useEffect(()=>{age.current=0},[destination.revision])
 useFrame((_,delta)=>{
  const node=group.current;if(!node)return
  age.current+=delta;const progress=Math.min(1,age.current/.82),fade=(1-progress)**1.7
  node.visible=progress<1;node.scale.setScalar(.65+progress*1.5)
  for(let i=0;i<node.children.length;i++){const material=(node.children[i] as Mesh).material as MeshBasicMaterial;material.opacity=fade*(.34-i*.07)}
 })
 if(!pose)return null
 return <group key={destination.revision} ref={group} position={pose.position} quaternion={pose.quaternion} renderOrder={4}>
  {[.24,.39,.54].map((radius,i)=><mesh key={radius}>
   <ringGeometry args={[radius,radius+.018,48]}/>
   <meshBasicMaterial color={i===0?'#fff8f1':i===1?'#d9c9f3':'#b9d9ef'} transparent opacity={.3} depthWrite={false} side={DoubleSide} toneMapped={false}/>
  </mesh>)}
 </group>
}
