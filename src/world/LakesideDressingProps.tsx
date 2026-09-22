import { useEffect,useMemo,useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { InstancedMesh,MeshStandardMaterial,Object3D,SphereGeometry } from 'three'
import { LAKESIDE_TREES,LAKESIDE_MEADOWS,acceptsLakesidePlant } from './lakesideDressing.ts'
import { riverbedHeight } from './terrain.ts'
import { weatheredStone } from './artGeometry.ts'
import { artMaterial,updateArtMaterial } from '../graphics/artMaterial.ts'
import { environmentState as env } from './environmentState.ts'
import { worldTime } from './worldTime.ts'

function setGlow(material:MeshStandardMaterial,value:number){material.emissiveIntensity=value}
export default function LakesideDressingProps(){
 const stones=useRef<InstancedMesh>(null),lights=useRef<InstancedMesh>(null)
 const r=useMemo(()=>({stone:weatheredStone(5,false,12),material:artMaterial('#909082'),bulb:new SphereGeometry(.035,6,4),glow:new MeshStandardMaterial({color:'#fff0d8',emissive:'#ffe5bc',emissiveIntensity:.8,toneMapped:false,userData:{managedGlow:true}}),object:new Object3D()}),[])
 useEffect(()=>{
  let n=0
  for(let i=0;i<LAKESIDE_MEADOWS.length*2;i++){
   const [cx,cz]=LAKESIDE_MEADOWS[i%LAKESIDE_MEADOWS.length],a=i*2.399,x=cx+Math.sin(a)*3,z=cz+Math.cos(a)*4,s=.25+(i%5)*.15
   if(Math.hypot(x,z)<6||!acceptsLakesidePlant(x,z,s))continue
   r.object.position.set(x,riverbedHeight(x,z)+s*.22,z);r.object.rotation.set(.05,a,0);r.object.scale.set(s,s*.5,s*.8);r.object.updateMatrix();stones.current?.setMatrixAt(n++,r.object.matrix)
  }
  if(stones.current){stones.current.count=n;stones.current.instanceMatrix.needsUpdate=true;stones.current.computeBoundingSphere()}
  n=0
  // Winter strings on a few near-path trunks, not a floating particle field.
  for(const [x,z,s] of LAKESIDE_TREES.filter((t,i)=>t[1]<95&&i%5===0).slice(0,10))for(let i=0;i<28;i++){
   const a=i*.9,y=.7+i*.1;r.object.position.set(x+Math.cos(a)*.4*s,riverbedHeight(x,z)+y*s,z+Math.sin(a)*.4*s);r.object.rotation.set(0,0,0);r.object.scale.setScalar(1);r.object.updateMatrix();lights.current?.setMatrixAt(n++,r.object.matrix)
  }
  if(lights.current){lights.current.count=n;lights.current.instanceMatrix.needsUpdate=true;lights.current.computeBoundingSphere()}
  return()=>{r.stone.dispose();r.material.dispose();r.bulb.dispose();r.glow.dispose()}
 },[r])
 useFrame(({clock})=>{updateArtMaterial(r.material,clock.elapsedTime);if(lights.current)lights.current.visible=worldTime.realWorld.season==='winter'&&env.night>.2;setGlow(r.glow,.3+env.night*.9)})
 return <group name="LakesideDressingProps">
  <instancedMesh ref={stones} args={[r.stone,r.material,LAKESIDE_MEADOWS.length*2]} receiveShadow/>
  <instancedMesh ref={lights} args={[r.bulb,r.glow,280]} visible={false}/>
 </group>
}
