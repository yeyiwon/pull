import { useEffect,useMemo,useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color,DoubleSide,InstancedMesh,Object3D,PointLight } from 'three'
import { leafBlade } from './artGeometry.ts'
import { petalGeometry } from './seasonGeometry.ts'
import { artMaterial,updateArtMaterial } from '../graphics/artMaterial.ts'
import { environmentState as env } from './environmentState.ts'
import { worldTime } from './worldTime.ts'
import { LAMP_SEASONS } from './lakesideDressing.ts'
import { HOME } from './worldLayout.ts'
const BEDS=[[-4.8,3.1],[-3.6,5.9],[4.9,2.8],[4.6,6.1]] as const
export default function HomeGarden(){
 const grass=useRef<InstancedMesh>(null),flowers=useRef<InstancedMesh>(null),flies=useRef<InstancedMesh>(null)
 const left=useRef<PointLight>(null),right=useRef<PointLight>(null)
 const r=useMemo(()=>{const leaf=artMaterial('#8a9c71','leaf'),flower=artMaterial('#eed4d9','leaf');leaf.side=DoubleSide;flower.side=DoubleSide;return {leaf,flower,blade:leafBlade(.05,.65,.035),petal:petalGeometry(),o:new Object3D(),color:new Color()}},[])
 useEffect(()=>{
  for(let i=0;i<320;i++){
   const [x,z]=BEDS[i%4],a=i*2.399,d=.18+((i*17)%31)/31*.7
   r.o.position.set(x+Math.cos(a)*d,0,z+Math.sin(a)*d);r.o.rotation.set(.1, a,Math.sin(a)*.12);r.o.scale.set(.8, .65+(i%7)*.17,.8);r.o.updateMatrix();grass.current?.setMatrixAt(i,r.o.matrix)
  }
  for(let i=0;i<120;i++){
   const [x,z]=BEDS[i%4],a=Math.floor(i/5)*2.399+i%5*1.256,d=.2+(Math.floor(i/5)%5)*.1
   r.o.position.set(x+Math.cos(Math.floor(i/5)*2.399)*d+Math.cos(a)*.035,.32+(Math.floor(i/5)%3)*.09,z+Math.sin(Math.floor(i/5)*2.399)*d+Math.sin(a)*.035);r.o.rotation.set(-Math.PI/2,0,a);r.o.scale.setScalar(.32);r.o.updateMatrix();flowers.current?.setMatrixAt(i,r.o.matrix)
  }
  for(const mesh of [grass.current,flowers.current])if(mesh){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere()}
  return()=>{r.leaf.dispose();r.flower.dispose();r.blade.dispose();r.petal.dispose()}
 },[r])
 useFrame(({clock})=>{
  const season=worldTime.realWorld.season,t=clock.elapsedTime,winter=season==='winter'
  updateArtMaterial(r.leaf,t);updateArtMaterial(r.flower,t)
  r.leaf.color.set(winter?'#9f9989':season==='autumn'?'#a49765':'#8a9c71')
  if(flowers.current)flowers.current.visible=!winter
  for(const light of [left.current,right.current])if(light){light.intensity=env.night*24;light.color.set(LAMP_SEASONS[season].light)}
  if(flies.current){flies.current.visible=!winter&&env.night>.1;for(let i=0;i<18;i++){
   const [x,z]=BEDS[i%4],a=i*2.399;r.o.position.set(x+Math.sin(a+t*.18)*.8,.4+(i%4)*.2+Math.sin(a+t*.32)*.15,z+Math.cos(a+t*.13)*.65);r.o.rotation.set(0,0,0);r.o.scale.setScalar(.012*(.3+.7*Math.pow((1+Math.sin(t*.7+a))/2,2))*env.night*(1-env.rain*.7));r.o.updateMatrix();flies.current.setMatrixAt(i,r.o.matrix)
  }flies.current.instanceMatrix.needsUpdate=true}
 })
 return <group name="HomeGarden">
  <instancedMesh ref={grass} args={[r.blade,r.leaf,320]} receiveShadow/>
  <instancedMesh ref={flowers} args={[r.petal,r.flower,120]} receiveShadow/>
  <instancedMesh ref={flies} args={[undefined,undefined,18]} frustumCulled={false}><sphereGeometry args={[1,6,4]}/><meshBasicMaterial color="#e3ebaa" toneMapped={false}/></instancedMesh>
  <pointLight ref={left} position={[-5,3.7/HOME.scale,5.4]} distance={11} decay={2}/>
  <pointLight ref={right} position={[5,3.7/HOME.scale,5.4]} distance={11} decay={2}/>
 </group>
}
