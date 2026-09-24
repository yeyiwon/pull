import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { InstancedMesh,Object3D,PlaneGeometry,ShaderMaterial } from 'three'
import { ROCKS, TREES, HOME } from '../world/worldLayout.ts'
import { homeWorldPoint } from '../world/homeSpace.ts'
import { BRIDGE, streamCenter, surfaceHeight } from '../world/terrain.ts'
import { graphicsState, QUALITY, useQuality } from './quality.ts'
const vertex='varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}'
const fragment='varying vec2 vUv; void main(){float r=length((vUv-.5)*2.);float a=exp(-r*r*5.)*(1.-smoothstep(.65,1.,r));gl_FragColor=vec4(.055,.065,.09,a*.27);}'
export default function ContactDepth(){
 const quality=useQuality(),mesh=useRef<InstancedMesh>(null)
 const patches=useMemo(()=>{
  const furniture=[homeWorldPoint(-2.5,.5),homeWorldPoint(-.9,-.9),homeWorldPoint(-2.5,-2.8)]
  return [[HOME.x,HOME.z,10*HOME.scale,9*HOME.scale],...ROCKS.map(([x,,z,sx,,sz])=>[x,z,sx*2.5,sz*2.5]),...TREES.map(([x,z,s])=>[x,z,s*4,s*4]),...[-1,1].map(side=>[streamCenter(BRIDGE.z)+side*BRIDGE.halfLength,BRIDGE.z,2,4]),...furniture.map(p=>[p.x,p.z,2.8*HOME.scale,2*HOME.scale])]
 },[])
 const resources=useMemo(()=>({object:new Object3D(),geometry:new PlaneGeometry(),material:new ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1})}),[])
 useEffect(()=>{const target=mesh.current;if(target){patches.forEach(([x,z,w,h],i)=>{resources.object.position.set(x,Math.max(.012,surfaceHeight(x,z)+.012)+(i>=12?.03:0),z);resources.object.rotation.set(-Math.PI/2,0,0);resources.object.scale.set(w,h,1);resources.object.updateMatrix();target.setMatrixAt(i,resources.object.matrix)});target.instanceMatrix.needsUpdate=true;target.computeBoundingSphere()}return()=>{resources.geometry.dispose();resources.material.dispose()}},[patches,resources])
 useFrame(()=>{if(mesh.current)mesh.current.visible=QUALITY[quality].contact&&graphicsState.contact})
 return <instancedMesh ref={mesh} args={[resources.geometry,resources.material,patches.length]} renderOrder={0}/>
}
