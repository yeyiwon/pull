import { useEffect,useMemo,useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color,ConeGeometry,Group,InstancedMesh,MeshStandardMaterial,Object3D,PointLight,SphereGeometry } from 'three'
import { branch,leafBlade } from './artGeometry.ts'
import { artMaterial,updateArtMaterial } from '../graphics/artMaterial.ts'
import { worldTime } from './worldTime.ts'
import { environmentState as env } from './environmentState.ts'
import { useQuality } from '../graphics/quality.ts'
import { riverbedHeight } from './terrain.ts'
const WINTER_TREE={x:-6,z:-29,radius:2.8}
function shine(material:MeshStandardMaterial,value:number){material.emissiveIntensity=value}
export default function WinterTree(){
 const quality=useQuality()
 const group=useRef<Group>(null),needles=useRef<InstancedMesh>(null),bulbs=useRef<InstancedMesh>(null),ornaments=useRef<InstancedMesh>(null),ice=useRef<InstancedMesh>(null),light=useRef<PointLight>(null)
 const r=useMemo(()=>({object:new Object3D(),color:new Color(),trunk:branch([[0,0,0],[.06,3,0],[-.03,6,0],[0,9,0]],.22,.025),needle:leafBlade(.06,.62,.08),bulb:new SphereGeometry(.045,6,4),ornament:new SphereGeometry(.11,10,7),ice:new ConeGeometry(.27,1,6),wood:artMaterial('#695d4d','bark'),green:artMaterial('#617866','leaf'),glow:new MeshStandardMaterial({color:'#fff0d9',emissive:'#ffe0ad',emissiveIntensity:1,toneMapped:false,userData:{managedGlow:true}}),metal:new MeshStandardMaterial({color:'#d8c8ad',metalness:.45,roughness:.32}),frost:new MeshStandardMaterial({color:'#b4d2e3',roughness:.18,metalness:.08,transparent:true,opacity:.65})}),[])
 useEffect(()=>{
  for(let i=0;i<2400;i++){
   const layer=i%24,y=.7+layer*.33,a=i*2.399963,radial=.22+((i*37)%101)/101*.78,radius=(1-y/9.2)*3.1*radial
   r.object.position.set(Math.cos(a)*radius,y+radius*.17,Math.sin(a)*radius);r.object.rotation.set(.9,a,Math.sin(a)*.3);r.object.scale.setScalar(.7+(i%5)*.13);r.object.updateMatrix();needles.current?.setMatrixAt(i,r.object.matrix)
   r.color.set(['#7b9678','#607f67','#496753'][i%3]);needles.current?.setColorAt(i,r.color)
  }
  for(let i=0;i<220;i++){
   const y=.85+i/220*7.6,a=i*.47,radius=(1-y/9.2)*3.05
   r.object.position.set(Math.cos(a)*radius,y,Math.sin(a)*radius);r.object.rotation.set(0,0,0);r.object.scale.setScalar(.8+i%3*.15);r.object.updateMatrix();bulbs.current?.setMatrixAt(i,r.object.matrix)
  }
  for(let i=0;i<32;i++){
   const y=1+(i%8)*.83,a=i*2.4,radius=(1-y/9.2)*2.65
   r.object.position.set(Math.cos(a)*radius,y,Math.sin(a)*radius);r.object.scale.setScalar(.7+i%3*.2);r.object.updateMatrix();ornaments.current?.setMatrixAt(i,r.object.matrix)
  }
  for(let i=0;i<18;i++){
   const a=i*2.4,radius=3.1+(i%3)*.32,h=.5+(i%4)*.3
   r.object.position.set(Math.cos(a)*radius,h*.5-.05,Math.sin(a)*radius);r.object.rotation.set(.1*Math.sin(a),a,.1*Math.cos(a));r.object.scale.set(.7,h,.65);r.object.updateMatrix();ice.current?.setMatrixAt(i,r.object.matrix)
  }
  for(const m of [needles.current,bulbs.current,ornaments.current,ice.current])if(m){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.computeBoundingSphere()}
  return()=>{for(const g of [r.trunk,r.needle,r.bulb,r.ornament,r.ice])g.dispose();for(const m of [r.wood,r.green,r.glow,r.metal,r.frost])m.dispose()}
 },[r])
 useFrame(({clock})=>{if(needles.current)needles.current.count=quality==='PERFORMANCE'?1200:2400;if(group.current)group.current.visible=worldTime.realWorld.season==='winter';updateArtMaterial(r.wood,clock.elapsedTime);updateArtMaterial(r.green,clock.elapsedTime);shine(r.glow,.2+env.night*1.9);if(light.current)light.current.intensity=env.night*32})
 return <group ref={group} name="WinterIlluminationTree" position={[WINTER_TREE.x,riverbedHeight(WINTER_TREE.x,WINTER_TREE.z),WINTER_TREE.z]}>
  <mesh geometry={r.trunk} material={r.wood} castShadow/>
  <instancedMesh ref={needles} args={[r.needle,r.green,2400]} receiveShadow/>
  <instancedMesh ref={bulbs} args={[r.bulb,r.glow,220]}/>
  <instancedMesh ref={ornaments} args={[r.ornament,r.metal,32]} receiveShadow/>
  <instancedMesh ref={ice} args={[r.ice,r.frost,18]}/>
  <pointLight ref={light} position={[0,2,0]} color="#f3dfcf" intensity={0} distance={15} decay={2}/>
 </group>
}
