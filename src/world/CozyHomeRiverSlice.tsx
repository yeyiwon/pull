import { useEffect,useRef,useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group,PointLight } from 'three'
import { useRendererMode } from '../graphics/rendererV2.ts'
import { environmentState as env } from './environmentState.ts'
import { worldTime } from './worldTime.ts'
import { BRIDGE,streamCenter,surfaceHeight,WATER_Y } from './terrain.ts'
import { homeWorldPoint } from './homeSpace.ts'
import { HOME } from './worldLayout.ts'

const HERO_TREES=[[-2.5,-20.5,1.05],[20,-16,1.15],[-5.5,2.5,.92]] as const
const FISH=[[-.9,-2.5,.1],[.7,1.5,1.7],[-.6,5.5,3.1],[.8,-6,4.4]] as const
// The Phase 1 tree blockout exposed a candy-like crown and hanging branch artifacts.
// Keep it out of the visual comparison until an authored V4 tree passes admission.
const SHOW_V4_TREE_BLOCKOUT=false

function seasonColors(){
 const season=worldTime.realWorld.season
 if(season==='spring')return {leaf:'#78a86e',leaf2:'#a3bf7a',petal:['#f3b9ce','#f4df9d','#c7b7e7'],accent:'#c66f75'}
 if(season==='autumn')return {leaf:'#b16b3f',leaf2:'#d19b4e',petal:['#e7a55d','#c96755','#e1c47b'],accent:'#a44d3f'}
 if(season==='winter')return {leaf:'#607c70',leaf2:'#82958a',petal:['#d9e3e7','#b9c9d4','#d7c6dc'],accent:'#9f3f43'}
 return {leaf:'#55865c',leaf2:'#7ca069',petal:['#f0c56f','#e7a7b7','#b8b2df'],accent:'#cb7661'}
}

function HeroTree({x,z,scale,index}:{x:number;z:number;scale:number;index:number}){
 const crown=useRef<Group>(null),palette=seasonColors(),snow=worldTime.realWorld.season==='winter'
 useFrame(({clock})=>{if(crown.current)crown.current.rotation.z=Math.sin(clock.elapsedTime*.35+index*1.7)*(.018+env.wind*.025)})
 return <group position={[x,surfaceHeight(x,z),z]} scale={scale}>
  <mesh position={[0,2.6,0]} rotation={[0,0,index%2?.08:-.06]} castShadow receiveShadow><cylinderGeometry args={[.38,.62,5.3,9]}/><meshStandardMaterial color="#775f49" roughness={.94}/></mesh>
  {[[-1,3.7,0,.13],[1,4.2,.25,-.12],[-.7,4.8,-.35,.18]].map(([bx,by,bz,rz],i)=><mesh key={i} position={[bx,by,bz]} rotation={[0,index*.8,rz]} castShadow><cylinderGeometry args={[.11,.2,2.5,7]}/><meshStandardMaterial color="#775f49" roughness={.94}/></mesh>)}
  <group ref={crown}>
   {[[0,6,0,2.2,1.65],[-1.35,5.55,.1,1.5,1.25],[1.45,5.7,-.2,1.65,1.35],[-.45,6.85,-.25,1.45,1.15],[.65,6.7,.65,1.25,1]].map(([cx,cy,cz,sx,sy],i)=><group key={i}>
    <mesh position={[cx,cy,cz]} scale={[sx,sy,sx*.92]} castShadow receiveShadow><sphereGeometry args={[1,18,12]}/><meshStandardMaterial color={i%2?palette.leaf2:palette.leaf} roughness={.88}/></mesh>
    {snow&&<mesh position={[cx,cy+.42*sy,cz-.05]} scale={[sx*.88,sy*.3,sx*.82]}><sphereGeometry args={[1,14,8]}/><meshStandardMaterial color="#e5edf1" roughness={.94}/></mesh>}
   </group>)}
  </group>
  {[0,1,2].map(i=><mesh key={i} position={[(i-1)*.58,.1,Math.sin(i*2)*.28]} rotation={[Math.PI/2,0,i]} scale={[.75,.75,1]} receiveShadow><torusGeometry args={[.65,.12,6,18,Math.PI*.72]}/><meshStandardMaterial color="#6e5642" roughness={1}/></mesh>)}
 </group>
}

function HomeDetails(){
 const p=seasonColors(),winter=worldTime.realWorld.season==='winter',light=useRef<PointLight>(null)
 useFrame(()=>{if(light.current)light.current.intensity=env.night*18})
 return <group name="CozyHomeMicroScene">
  {/* Mailbox marks the home boundary at a readable mobile scale. */}
  <group position={[15.1,surfaceHeight(15.1,-17.2),-17.2]} rotation={[0,-.45,0]}>
   <mesh position={[0,.9,0]} castShadow><cylinderGeometry args={[.08,.11,1.8,8]}/><meshStandardMaterial color="#6f5946" roughness={.9}/></mesh>
   <mesh position={[0,1.75,0]} castShadow><boxGeometry args={[.85,.65,.65]}/><meshStandardMaterial color={p.accent} roughness={.72}/></mesh>
   <mesh position={[0,1.92,.34]}><boxGeometry args={[.63,.08,.03]}/><meshStandardMaterial color="#e6d8bd" roughness={.8}/></mesh>
   {winter&&<mesh position={[0,2.12,0]} scale={[.5,.1,.38]}><sphereGeometry args={[1,12,7]}/><meshStandardMaterial color="#e8eff3"/></mesh>}
  </group>
  <pointLight ref={light} position={[12.4,1.2,-17.2]} color="#ffd2a2" intensity={0} distance={7} decay={2}/>
 </group>
}

function TerraceScene(){
 const center=homeWorldPoint(-3.3,10.35),iron='#353d3c',stone='#b7aa91'
 return <group name="HomeTerrace" position={[center.x,surfaceHeight(center.x,center.z)+.035,center.z]} rotation={[0,HOME.yaw,0]}>
  {Array.from({length:6},(_,index)=><mesh key={index} position={[-1.66+index*.665,0,0]} receiveShadow><boxGeometry args={[.61,.1,3.25]}/><meshStandardMaterial color={index%2?stone:'#c1b59c'} roughness={.92}/></mesh>)}
  <group position={[0,.02,0]}>
   <mesh position={[0,.76,0]} castShadow receiveShadow><cylinderGeometry args={[.72,.72,.075,28]}/><meshStandardMaterial color={iron} metalness={.62} roughness={.34}/></mesh>
   <mesh position={[0,.38,0]} castShadow><cylinderGeometry args={[.055,.075,.76,10]}/><meshStandardMaterial color={iron} metalness={.7} roughness={.3}/></mesh>
   <mesh position={[0,.08,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.42,.035,7,20]}/><meshStandardMaterial color={iron} metalness={.7} roughness={.3}/></mesh>
  </group>
  {[-1.6,1.6].map((x,index)=><group key={x} position={[x,0,0]} rotation={[0,index?-Math.PI/2:Math.PI/2,0]}>
   <mesh position={[0,.63,0]} castShadow><cylinderGeometry args={[.43,.43,.08,20]}/><meshStandardMaterial color={iron} metalness={.58} roughness={.38}/></mesh>
   {[-.27,.27].flatMap(px=>[-.22,.22].map(pz=><mesh key={`${px}:${pz}`} position={[px,.31,pz]} rotation={[0,0,px*.08]} castShadow><cylinderGeometry args={[.025,.04,.62,7]}/><meshStandardMaterial color={iron} metalness={.65} roughness={.34}/></mesh>))}
   <mesh position={[0,1.16,-.34]} rotation={[0,0,Math.PI/2]} castShadow><torusGeometry args={[.45,.04,7,22,Math.PI]}/><meshStandardMaterial color={iron} metalness={.65} roughness={.34}/></mesh>
   <mesh position={[0,.92,-.34]} castShadow><cylinderGeometry args={[.035,.035,.55,7]}/><meshStandardMaterial color={iron} metalness={.65} roughness={.34}/></mesh>
  </group>)}
  <group position={[0,.82,0]}>{[-.18,0,.18].map((x,index)=><mesh key={x} position={[x,.04+index*.015,0]} rotation={[0,index*.7,.12]}><sphereGeometry args={[.055,8,5]}/><meshStandardMaterial color={index===1?'#f0d5df':'#e8c77c'} roughness={.72}/></mesh>)}</group>
 </group>
}

function PathAndRiverLife(){
 const fish=useRef<Group>(null),life=useRef<Group>(null),fireflies=useRef<Group>(null)
 useFrame(({clock})=>{const t=clock.elapsedTime,season=worldTime.realWorld.season;if(fish.current){fish.current.position.x=Math.sin(t*.32)*.7;fish.current.rotation.y=Math.sin(t*.32)>.0?0:Math.PI}if(life.current){life.current.visible=(season==='spring'||season==='summer')&&env.night<.45;life.current.position.y=.9+Math.sin(t*.8)*.16;life.current.rotation.y=t*.22}if(fireflies.current)fireflies.current.visible=env.night>.45&&season!=='winter'})
 return <group name="CozyPathRiverMicroScene">
  {/* Bridge threshold details remain clear of the traversal surface. */}
  {[-1,1].map(side=>{const x=streamCenter(BRIDGE.z)+side*(BRIDGE.halfLength+.75);return <group key={side} position={[x,surfaceHeight(x,BRIDGE.z),BRIDGE.z+2.15]}><mesh position={[0,.22,0]} scale={[.65,.28,.5]} castShadow receiveShadow><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color="#718078" roughness={.92}/></mesh><mesh position={[.2,.43,0]} scale={[.42,.1,.32]}><sphereGeometry args={[1,10,6]}/><meshStandardMaterial color="#58765b" roughness={1}/></mesh></group>})}
  {FISH.map(([side,z,phase],i)=><group key={i} ref={i===0?fish:undefined} position={[streamCenter(z)+side*(1.1+i*.22),WATER_Y-.13,z]} rotation={[0,phase,0]}><mesh scale={[.38,.12,.16]}><sphereGeometry args={[1,10,6]}/><meshStandardMaterial color={i%2?'#d6a669':'#718fa1'} roughness={.48}/></mesh><mesh position={[-.38,0,0]} rotation={[0,0,Math.PI/4]} scale={[.16,.02,.16]}><planeGeometry args={[1,1]}/><meshStandardMaterial color={i%2?'#c99158':'#637f90'} side={2}/></mesh></group>)}
  <group ref={life} visible={false} position={[streamCenter(3)+3,.9,3]}><mesh scale={[.22,.035,.13]} rotation={[0,0,.15]}><sphereGeometry args={[1,8,5]}/><meshStandardMaterial color="#79a69d"/></mesh>{[-1,1].map(side=><mesh key={side} position={[0,0,side*.18]} rotation={[Math.PI/2,0,side*.25]} scale={[.3,.12,.3]}><planeGeometry/><meshStandardMaterial color="#c9d9d0" transparent opacity={.72} side={2}/></mesh>)}</group>
  <group ref={fireflies} visible={false}>{Array.from({length:6},(_,i)=><mesh key={i} position={[streamCenter(4)+(i-2.5)*1.1,.7+(i%3)*.38,2+i*.75]}><sphereGeometry args={[.035,6,4]}/><meshStandardMaterial color="#fff2a8" emissive="#e9d869" emissiveIntensity={2.2} toneMapped={false}/></mesh>)}</group>
 </group>
}

export default function CozyHomeRiverSlice(){
 const mode=useRendererMode()
 const [,setSeason]=useState(worldTime.realWorld.season)
 useEffect(()=>{if(mode!=='V4_COZY')return;const timer=window.setInterval(()=>setSeason(current=>current===worldTime.realWorld.season?current:worldTime.realWorld.season),250);return()=>window.clearInterval(timer)},[mode])
 if(mode!=='V4_COZY')return null
 return <group name="V4CozyHomeBridgeRiver">
  <HomeDetails/>
  <TerraceScene/>
  <PathAndRiverLife/>
  {SHOW_V4_TREE_BLOCKOUT&&HERO_TREES.map(([x,z,scale],i)=><HeroTree key={i} x={x} z={z} scale={scale} index={i}/>)}
 </group>
}
