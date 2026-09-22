import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'
import { ROCKS, TREES, HOME } from '../world/worldLayout.ts'
import { homeWorldPoint } from '../world/homeSpace.ts'
import { BRIDGE, streamCenter, surfaceHeight } from '../world/terrain.ts'
import { graphicsState, QUALITY, useQuality } from './quality.ts'
const vertex='varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}'
const fragment='varying vec2 vUv; void main(){float r=length((vUv-.5)*2.);float a=exp(-r*r*5.)*(1.-smoothstep(.65,1.,r));gl_FragColor=vec4(.055,.065,.09,a*.27);}'
export default function ContactDepth(){
 const quality=useQuality(),group=useRef<Group>(null)
 const patches=useMemo(()=>{
  const furniture=[homeWorldPoint(-2.5,.5),homeWorldPoint(-.9,-.9),homeWorldPoint(-2.5,-2.8)]
  return [[HOME.x,HOME.z,10,9],...ROCKS.map(([x,,z,sx,,sz])=>[x,z,sx*2.5,sz*2.5]),...TREES.map(([x,z,s])=>[x,z,s*4,s*4]),...[-1,1].map(side=>[streamCenter(BRIDGE.z)+side*BRIDGE.halfLength,BRIDGE.z,2,4]),...furniture.map(p=>[p.x,p.z,2.8,2])] 
 },[])
 useFrame(()=>{if(group.current)group.current.visible=QUALITY[quality].contact&&graphicsState.contact})
 return <group ref={group}>{patches.map(([x,z,w,h],i)=><mesh key={i} position={[x,Math.max(.012,surfaceHeight(x,z)+.012)+(i>=12?.03:0),z]} rotation={[-Math.PI/2,0,0]} scale={[w,h,1]} renderOrder={0}>
 <planeGeometry/><shaderMaterial vertexShader={vertex} fragmentShader={fragment} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-1}/>
 </mesh>)}</group>
}
