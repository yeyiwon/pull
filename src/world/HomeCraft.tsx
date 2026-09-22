import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, InstancedMesh, MeshStandardMaterial, Object3D } from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { branch, leafBlade, weatheredStone } from './artGeometry.ts'
import { artMaterial, updateArtMaterial } from '../graphics/artMaterial.ts'
import { homeState, DOOR } from './homeSpace.ts'
import { environmentState as env } from './environmentState.ts'

function cutaway(m:MeshStandardMaterial,opacity:number){m.opacity=opacity}

// Decorative shell only; the doorway, interior and collision shell remain authoritative.
export default function HomeCraft(){
 const tiles=useRef<InstancedMesh>(null),time=useRef(0)
 const r=useMemo(()=>({
  tile:new RoundedBoxGeometry(.72,.12,.64,2,.055),block:new RoundedBoxGeometry(1,1,1,2,.06),
  stone:weatheredStone(7),leaf:leafBlade(.12,.5,.13),
  vine:branch([[-3.85,0,3.76],[-4.1,1.2,3.8],[-3.8,2.3,3.8],[-3.95,3.7,3.8],[-3.3,4.4,3.8]],.035,.014),
  slate:Object.assign(artMaterial('#506876'),{transparent:true}),wood:Object.assign(artMaterial('#8a7461','bark'),{transparent:true}),
  masonry:artMaterial('#929d91'),green:artMaterial('#7b9580','leaf'),
  curtain:new MeshStandardMaterial({color:'#d5c9b6',roughness:1,transparent:true}),object:new Object3D(),color:new Color(),
 }),[])
 useEffect(()=>{
  if(tiles.current){let i=0
   for(const side of [-1,1])for(let row=0;row<6;row++)for(let col=0;col<13;col++){
    const localX=-1.9+row*.72,angle=-side*.34
    r.object.position.set(side*2.15+localX*Math.cos(angle),4.93+localX*Math.sin(angle)+.16+(5-row)*.004,-3.72+col*.61+(row%2)*.06)
    r.object.rotation.set(0,0,angle);r.object.scale.set(1,1+(col%3)*.08,1)
    r.object.updateMatrix();tiles.current.setMatrixAt(i,r.object.matrix)
    r.color.setHSL(.55+(col%3)*.008,.11,.55+(i%5)*.035);tiles.current.setColorAt(i++,r.color)
   }tiles.current.instanceMatrix.needsUpdate=true;tiles.current.computeBoundingSphere()
  }
  return()=>{r.tile.dispose();r.block.dispose();r.stone.dispose();r.leaf.dispose();r.vine.dispose();r.slate.dispose();r.wood.dispose();r.masonry.dispose();r.green.dispose();r.curtain.dispose()}
 },[r])
 useFrame((_,dt)=>{
  time.current+=dt;updateArtMaterial(r.slate,time.current);updateArtMaterial(r.wood,time.current);updateArtMaterial(r.masonry,time.current);updateArtMaterial(r.green,time.current)
  cutaway(r.slate,1-homeState.cutaway*.98);cutaway(r.wood,1-homeState.cutaway*.87);cutaway(r.curtain,.9-homeState.cutaway*.8)
 })
 return <>
  <instancedMesh ref={tiles} args={[r.tile,r.slate,156]} castShadow receiveShadow/>
  {/* Thick fascia follows the approved roof profile; no change to roof footprint. */}
  {[-1,1].map(side=><group key={side}>
   {[-3.94,3.94].map(z=><mesh key={z} geometry={r.block} material={r.wood} position={[side*2.15,4.87,z]} rotation={[0,0,-side*.34]} scale={[4.7,.23,.19]} castShadow/>)}
   <mesh geometry={r.block} material={r.wood} position={[side*4.22,4.17,0]} scale={[.18,.23,7.95]}/>
  </group>)}
  <mesh geometry={r.block} material={r.slate} position={[0,5.72,0]} scale={[.28,.22,8.08]} castShadow/>
  {/* Foundation courses sit inside the existing footprint and below the walkable threshold. */}
  {[-1,1].map(side=>Array.from({length:9},(_,i)=><mesh key={`${side}-${i}`} geometry={r.stone} material={r.masonry} position={[side*4.03,.13,-3.2+i*.8]} scale={[.21,.24,.45]} receiveShadow/>))}
  {[-3.92,.64,3.08,3.94].map(x=><mesh key={x} geometry={r.block} material={r.wood} position={[x,2.28,3.61]} scale={[.17,4.48,.24]} castShadow/>)}
  {[.86,4.46].map(y=><mesh key={y} geometry={r.block} material={r.wood} position={[-1.64,y,3.64]} scale={[4.74,.19,.26]}/>)}
  {[-2.82,-.58].map(x=><mesh key={x} geometry={r.block} material={r.wood} position={[x,2.69,3.66]} scale={[.085,3.46,.19]}/>)}
  <mesh geometry={r.block} material={r.masonry} position={[-1.65,.86,3.78]} scale={[4.83,.16,.5]} receiveShadow/>
  {/* Pleated curtain ribbons leave the real room visible through the glazing. */}
  {[-3.66,.26].map(x=>Array.from({length:5},(_,i)=><mesh key={`${x}-${i}`} geometry={r.block} material={r.curtain} position={[x+i*.065,2.68,3.4+Math.sin(i*2)*.055]} scale={[.11,3.2,.055]}/>))}
  <mesh geometry={r.block} material={r.wood} position={[DOOR.x,3.57,3.64]} scale={[2.63,.22,.26]}/>
  <mesh geometry={r.block} material={r.masonry} position={[DOOR.x,.055,3.74]} scale={[2.4,.11,.46]} receiveShadow/>
  {/* Masonry chimney cap and individual courses replace the plain extrusion. */}
  {[0,1,2,3].map(i=><mesh key={i} geometry={r.block} material={r.masonry} position={[-2.5,5.1+i*.3,-1.5]} scale={[.73,.26,.79]} castShadow/>)}
  <mesh geometry={r.block} material={r.slate} position={[-2.5,6.12,-1.5]} scale={[.96,.16,1.02]} castShadow/>
  <mesh geometry={r.vine} material={r.green}/>
  {Array.from({length:14},(_,i)=><mesh key={i} geometry={r.leaf} material={r.green} position={[-3.95+Math.sin(i*.7)*.15,.4+i*.26,3.8]} rotation={[.45,0,(i%2?1:-1)*.7]}/>)}
  <group position={[3.42,2.65,3.85]}>
   <mesh geometry={r.block} material={r.wood} scale={[.38,.64,.28]} castShadow/>
   <mesh geometry={r.block} position={[0,0,.16]} scale={[.23,.4,.025]}><meshStandardMaterial color="#e9d8b6" emissive="#f2bc76" emissiveIntensity={.35+env.night*.4}/></mesh>
  </group>
 </>
}
