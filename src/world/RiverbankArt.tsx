import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { DoubleSide, InstancedMesh, Object3D } from 'three'
import { BRIDGE, riverbedHeight, streamCenter, streamWidth } from './terrain.ts'
import { weatheredStone, leafBlade } from './artGeometry.ts'
import { artMaterial, updateArtMaterial } from '../graphics/artMaterial.ts'
import { environmentState as env } from './environmentState.ts'
import { useQuality } from '../graphics/quality.ts'

export default function RiverbankArt(){
 const quality=useQuality(),stones=useRef<InstancedMesh>(null),grass=useRef<InstancedMesh>(null),time=useRef(0)
 const r=useMemo(()=>({stone:weatheredStone(9,false,12),blade:leafBlade(.075,.7,.25),rock:artMaterial('#a3b6a8'),green:Object.assign(artMaterial('#83a28c','leaf'),{side:DoubleSide}),object:new Object3D()}),[])
 useEffect(()=>{
  const o=r.object
  for(let i=0;i<180;i++){
   const cluster=Math.floor(i/6),n=i%6,z=-66+cluster*4.6+Math.sin(n*2.399+cluster)*1.05,side=cluster%2?1:-1,x=streamCenter(z)+side*(streamWidth(z)+.12+Math.cos(n*2.399)*.55)
   // Keep both bridge approaches completely unobstructed, including their silhouette.
   const clear=Math.abs(z-BRIDGE.z)<2.4
   o.position.set(x,riverbedHeight(x,z)+.09,z);o.rotation.set(.1,i*2.399,.06)
   const s=clear?0:.17+(i%7)*.07;o.scale.set(s*1.7,s*.7,s);o.updateMatrix();stones.current?.setMatrixAt(i,o.matrix)
  }
  for(let i=0;i<480;i++){
   const cluster=Math.floor(i/12),n=i%12,z=-62+cluster*2.3+Math.sin(n*2.3)*.42,side=cluster%2?1:-1
   const x=streamCenter(z)+side*(streamWidth(z)+.7+n%3*.12),s=Math.abs(z-BRIDGE.z)<2.4?0:.45+(n%5)*.16
   o.position.set(x,riverbedHeight(x,z),z);o.rotation.set(.1,n*2.399+cluster,n%2?.15:-.15);o.scale.setScalar(s);o.updateMatrix();grass.current?.setMatrixAt(i,o.matrix)
  }
  for(const m of [stones.current,grass.current])if(m){m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere()}
  return()=>{r.stone.dispose();r.blade.dispose();r.rock.dispose();r.green.dispose()}
 },[r])
 useFrame((_,dt)=>{time.current+=dt;updateArtMaterial(r.rock,time.current);updateArtMaterial(r.green,time.current);r.green.color.copy(env.grass).multiplyScalar(1.12);if(grass.current)grass.current.count=quality==='PERFORMANCE'?180:480})
 return <>
  <instancedMesh ref={stones} args={[r.stone,r.rock,180]} receiveShadow/>
  <instancedMesh ref={grass} args={[r.blade,r.green,480]}/>
 </>
}
