import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RING, HALO_ARCS } from '../world/worldLayout.ts'
import { branch } from '../world/artGeometry.ts'
import { artMaterial, updateArtMaterial } from './artMaterial.ts'
import { BufferGeometry, Float32BufferAttribute } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

function carvedArc(start:number,arc:number,seed:number){
 const p:number[]=[],indices:number[]=[],cross=[[-1,-.7],[-.8,-1],[.8,-1],[1,-.7],[1,.7],[.8,1],[-.8,1],[-1,.7]]
 for(let i=0;i<=12;i++){
  const t=i/12,a=start+arc*t,width=.29+.065*Math.sin(a*4+seed),depth=.23
  for(const [u,v] of cross){const r=RING.radius+u*width+Math.sin(a*5)*.045;p.push(Math.cos(a)*r,Math.sin(a)*r,v*depth+Math.sin(a*3)*.06)}
  if(i<12)for(let j=0;j<8;j++){const k=i*8+j,n=i*8+(j+1)%8;indices.push(k,n,k+8,n,n+8,k+8)}
 }
 for(let j=1;j<7;j++){indices.push(0,j+1,j,96,96+j,96+j+1)}
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(p,3));g.setIndex(indices);g.computeVertexNormals();return g
}

// The same aperture and center remain; separately carved voussoirs break its perfect outline.
export default function WorldHalo(){
 const time=useRef(0)
 const r=useMemo(()=>{
  const parts=HALO_ARCS.flatMap(([start,arc],side)=>Array.from({length:9},(_,i)=>{
   return carvedArc(start+arc*i/9,arc*.988/9,i+side)

  }))
  const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose())
  const roots=branch([[-2,-8.3,0],[-3,-6.5,.05],[-5,-4.8,.1],[-6.7,-1.3,.16]],.12,.018)
  return {geometry,roots,stone:artMaterial('#a5b6aa'),moss:artMaterial('#708c78','bark')}
 },[])
 useEffect(()=>()=>{r.geometry.dispose();r.roots.dispose();r.stone.dispose();r.moss.dispose()},[r])
 useFrame((_,dt)=>{time.current+=dt;updateArtMaterial(r.stone,time.current);updateArtMaterial(r.moss,time.current)})
 return <group position={[RING.x,RING.y,RING.z]} rotation={[0,RING.yaw,RING.tilt]} scale={[1,1.2,.65]}>
  <mesh geometry={r.geometry} material={r.stone} castShadow receiveShadow/>
  <mesh geometry={r.roots} material={r.moss}/>
 </group>
}
