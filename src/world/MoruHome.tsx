import { NIGHT_TUNING, nightValue, nightCorrection } from '../graphics/nightTuning.ts'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, Float32BufferAttribute, Group, Shape, ShapeGeometry, MeshStandardMaterial, PointLight } from 'three'
import HomeCraft from './HomeCraft.tsx'
import { artMaterial } from '../graphics/artMaterial.ts'
import { HOME } from './worldLayout.ts'
import { DOOR, homeState } from './homeSpace.ts'
import { environmentState as env } from './environmentState.ts'
import { worldTime } from './worldTime.ts'
import { artificialLightLevel,getRendererMode } from '../graphics/rendererV2.ts'
function opacity(material: MeshStandardMaterial, value: number) { material.opacity = value }
function glow(material: MeshStandardMaterial, value: number) { material.emissiveIntensity = value }
function setWeather(roof:MeshStandardMaterial,wall:MeshStandardMaterial,wet:number){roof.roughness=.65-wet*.3;roof.color.set('#344858').multiplyScalar(1-wet*.2);wall.roughness=.9-wet*.1}
function dirty(geometry: BufferGeometry) { geometry.attributes.position.needsUpdate = true }
const PATH = Array.from({length: 9}, (_, i) => i)

export default function MoruHome({detail}:{detail?:ReactNode}) {
  const door = useRef<Group>(null), lamp = useRef<PointLight>(null), entrance = useRef<PointLight>(null)
  const time = useRef(0)
  const windowMaterial = useRef<MeshStandardMaterial>(null)
  const r = useMemo(() => {
    const smoke = new BufferGeometry(); smoke.setAttribute('position',new Float32BufferAttribute(new Float32Array(24),3))
    const shape=new Shape();shape.moveTo(-4.1,4.5);shape.lineTo(0,5.75);shape.lineTo(4.1,4.5);shape.closePath()
    return { smoke, gable:new ShapeGeometry(shape),
      wall: Object.assign(artMaterial('#c9c9b8','plaster'),{transparent:true}),
      roof: new MeshStandardMaterial({color:'#344858',roughness:.65,metalness:.15,transparent:true}),
      snow: new MeshStandardMaterial({color:'#e5edf3',transparent:true,opacity:0,depthWrite:false}),
      bulbs: new MeshStandardMaterial({color:'#fff0c9',emissive:'#ffd597',emissiveIntensity:.2,toneMapped:false,userData:{managedGlow:true}}),
    }
  },[])
  useEffect(()=>()=>{ r.smoke.dispose();r.gable.dispose();r.wall.dispose();r.roof.dispose();r.snow.dispose();r.bulbs.dispose() },[r])
  useFrame((_,delta)=>{
    time.current+=delta
    if(door.current) door.current.rotation.y=-homeState.doorOpen*Math.PI*.53
    opacity(r.wall,1-homeState.cutaway*.87);opacity(r.roof,1-homeState.cutaway*.98);opacity(r.snow,env.snow*(1-homeState.cutaway))
    setWeather(r.roof,r.wall,env.wetness)
    const festive = worldTime.realWorld.month===12 ? 1.25 : 1
    const v2=getRendererMode()!=='V1',houseLevel=artificialLightLevel(env.night)
    glow(r.bulbs,v2?.06+houseLevel*(.93+env.snow*.18)*festive:.12+env.night*(2.9+env.snow*.8)*festive)
    if(lamp.current) lamp.current.intensity=v2?houseLevel*26:(6+env.night*nightValue(520,NIGHT_TUNING.interiorLightIntensity,env.night))*(1+env.warmth*.25)
    if(windowMaterial.current) windowMaterial.current.emissiveIntensity=v2?houseLevel*.53:NIGHT_TUNING.windowEmissive*nightCorrection(env.night)
    if(entrance.current) entrance.current.intensity=v2?houseLevel*51:env.night*nightValue(820,NIGHT_TUNING.houseLightIntensity,env.night)
    const pos=r.smoke.attributes.position
    for(let i=0;i<8;i++){const a=(time.current*.09+i/8)%1;pos.setXYZ(i,-2.5+Math.sin(a*3+time.current*.08)*a*(.5+env.wind*2),6+a*3,-1.5+a*(.4+env.wind))}
    dirty(r.smoke)
  })
  return <group position={[HOME.x,0,HOME.z]} rotation={[0,HOME.yaw,0]}>
    {detail ?? <HomeCraft />}
    <mesh position={[0,-.015,0]} receiveShadow><boxGeometry args={[8,.09,7]}/><meshStandardMaterial color="#aa9981" roughness={.85}/></mesh>
    {/* A real hollow shell. Camera cutaway reveals the same room after walking in. */}
    {[[-4,2.3,0,.25,4.6,7],[4,2.3,0,.25,4.6,7],[0,2.3,-3.5,8,4.6,.25],[-1.7,.45,3.5,4.6,.9,.2],[3.55,2.3,3.5,.9,4.6,.2],[1.8,4.05,3.5,2.5,1.1,.2]].map(([x,y,z,w,h,d],i)=><mesh key={i} position={[x,y,z]} material={r.wall} castShadow receiveShadow><boxGeometry args={[w,h,d]}/></mesh>)}
    <mesh position={[-1.7,2.7,3.53]}><boxGeometry args={[4.5,3.3,.035]}/><meshStandardMaterial ref={windowMaterial} userData={{managedGlow:true}} emissive="#ffd8a0" emissiveIntensity={0} color="#c4e2df" transparent opacity={.15} roughness={.1} metalness={.1} depthWrite={false}/></mesh>
    {[-3.95,-1.7,.55].map(x=><mesh key={x} position={[x,2.7,3.6]}><boxGeometry args={[.085,3.5,.1]}/><meshStandardMaterial color="#756d59"/></mesh>)}
    <mesh position={[-1.7,2.8,3.6]}><boxGeometry args={[4.6,.075,.1]}/><meshStandardMaterial color="#756d59"/></mesh>
    <group ref={door} position={[DOOR.x-DOOR.width/2,0,DOOR.z+.06]}>
      <mesh position={[DOOR.width/2,1.72,0]} castShadow><boxGeometry args={[DOOR.width,3.44,.14]}/><meshStandardMaterial color="#688d89" roughness={.65}/></mesh>
      <mesh position={[DOOR.width-.2,1.6,.11]}><sphereGeometry args={[.07,10,8]}/><meshStandardMaterial color="#eed6a2" metalness={.7} roughness={.25}/></mesh>
      <mesh position={[DOOR.width/2,2.35,.085]}><circleGeometry args={[.5,32]}/><meshStandardMaterial color="#f9d5a0" emissive="#bf9663" emissiveIntensity={1.1} toneMapped={false}/></mesh>
    </group>
    {[-1,1].map(side=><group key={side} position={[side*2.15,4.93,0]} rotation={[0,0,-side*.34]}>
      <mesh material={r.roof} castShadow><boxGeometry args={[4.65,.2,8]}/></mesh>
      <mesh material={r.snow} position={[0,.17,0]}><boxGeometry args={[4.62,.13,7.97]}/></mesh>
    </group>)}
    {[-1,1].map(side=><mesh key={`gable-${side}`} geometry={r.gable} material={r.wall} position={[0,0,side*3.5]} rotation={[0,side<0?Math.PI:0,0]}/>)}
    <mesh position={[-2.5,5.4,-1.5]} material={r.roof} castShadow><boxGeometry args={[.65,1.4,.7]}/></mesh>
    <points geometry={r.smoke}><shaderMaterial transparent depthWrite={false} vertexShader="void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=min(55.,320./max(1.,-p.z));}" fragmentShader="void main(){float r=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(.65,.72,.78,exp(-r*r*5.)*.09);}"/></points>
    <mesh position={[0,.005,4.5]} receiveShadow><boxGeometry args={[8.6,.07,2]}/><meshStandardMaterial color="#b4aa91" roughness={.88}/></mesh>
    {/* Atelier: shelf, books, sofa, low table and a warm floor lamp. */}
    <group position={[-2.5,0,-2.8]}>
      {[.35,1.4,2.45,3.5].map(y=><mesh key={y} position={[0,y,0]}><boxGeometry args={[2.3,.1,.65]}/><meshStandardMaterial color="#806d55"/></mesh>)}
      {[-1.12,1.12].map(x=><mesh key={x} position={[x,1.95,0]}><boxGeometry args={[.1,3.8,.65]}/><meshStandardMaterial color="#806d55"/></mesh>)}
      {Array.from({length:12},(_,i)=><mesh key={i} position={[-.9+(i%4)*.44,.85+Math.floor(i/4)*1.05,0]} rotation={[0,0,(i%3-1)*.08]}><boxGeometry args={[.22,.75+(i%2)*.1,.42]}/><meshStandardMaterial color={['#819e9a','#b6a08c','#76748d'][i%3]}/></mesh>)}
    </group>
    <mesh position={[-2.5,.5,.5]} castShadow><boxGeometry args={[2.2,1,1.3]}/><meshStandardMaterial color="#84988c" roughness={1}/></mesh>
    <mesh position={[-2.5,1.2,0]} castShadow><boxGeometry args={[2.3,1,.3]}/><meshStandardMaterial color="#a6b4a0" roughness={1}/></mesh>
    <mesh position={[-.9,.65,-.9]} castShadow><cylinderGeometry args={[.7,.6,.14,24]}/><meshStandardMaterial color="#bba786"/></mesh>
    <mesh position={[-.9,.28,-.9]}><cylinderGeometry args={[.09,.2,.58,12]}/><meshStandardMaterial color="#82735f"/></mesh>
    <mesh position={[2.8,1.25,-2.4]}><cylinderGeometry args={[.045,.07,2.5,10]}/><meshStandardMaterial color="#8f846e"/></mesh>
    <mesh position={[2.8,2.6,-2.4]} material={r.bulbs}><coneGeometry args={[.65,.55,24,1,true]}/></mesh>
    <pointLight ref={entrance} position={[1.8,2.7,4.3]} intensity={0} color="#ffd2a0" distance={19} decay={2}/>
    <pointLight ref={lamp} position={[2.8,2.55,-2.4]} color="#ffdab0" distance={12} decay={2}/>
    <mesh position={[.4,.038,.1]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[2,48]}/><meshStandardMaterial color="#b7a499" roughness={1}/></mesh>
    {PATH.map(i=><group key={i} position={[DOOR.x+Math.sin(i*.5)*.35,0,5.5+i*.85]}>
      <mesh scale={[.58,.04,.32]} receiveShadow><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color="#b9bca8" roughness={.9}/></mesh>
      {i%2===0&&<group position={[-1.1,.25,0]}><mesh><cylinderGeometry args={[.13,.17,.5,10]}/><meshStandardMaterial color="#536c69"/></mesh><mesh position={[0,.29,0]} material={r.bulbs}><sphereGeometry args={[.12,10,8]}/></mesh></group>}
    </group>)}
    {Array.from({length:19},(_,i)=><mesh key={i} position={[-4.2+i*.47,4.23+Math.sin(i/18*Math.PI)*.28,3.9]} material={r.bulbs}><sphereGeometry args={[.045,6,4]}/></mesh>)}
    <group position={[-3.3,0,4.5]}><mesh position={[0,.35,0]}><cylinderGeometry args={[.36,.25,.7,16]}/><meshStandardMaterial color="#a8968c"/></mesh><mesh position={[0,1,0]} scale={[.6,.8,.6]}><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color="#779b86"/></mesh></group>
  </group>
}
