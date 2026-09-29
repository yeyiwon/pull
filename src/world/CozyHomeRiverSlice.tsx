import { useEffect,useMemo,useRef,useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group,InstancedMesh,MeshStandardMaterial,Object3D,PointLight } from 'three'
import { useRendererMode } from '../graphics/rendererV2.ts'
import { environmentState as env } from './environmentState.ts'
import { worldTime } from './worldTime.ts'
import { BRIDGE,streamCenter,surfaceHeight,WATER_Y } from './terrain.ts'
import { DOOR,homeWorldPoint } from './homeSpace.ts'

const FLOWER_CLUSTERS=[[-.8,-17.4],[4.2,-16.6],[14.7,-17.2],[8.8,-12.8],[2.2,-7.4]] as const
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

function CozyFlowers(){
 const stems=useRef<InstancedMesh>(null),leaves=useRef<InstancedMesh>(null),petals=useRef<InstancedMesh>(null),centers=useRef<InstancedMesh>(null),object=useMemo(()=>new Object3D(),[]),petalMaterial=useRef<MeshStandardMaterial>(null)
 useEffect(()=>{let flower=0,petal=0;for(let cluster=0;cluster<FLOWER_CLUSTERS.length;cluster++){const [cx,cz]=FLOWER_CLUSTERS[cluster],base=surfaceHeight(cx,cz);for(let i=0;i<5;i++){const a=i*2.399+cluster*.8,r=.18+(i%3)*.16,h=.48+(i%3)*.12,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r
  object.position.set(x,base+h/2,z);object.rotation.set(0,a,(i-2)*.025);object.scale.set(1,h/.6,1);object.updateMatrix();stems.current?.setMatrixAt(flower,object.matrix)
  object.position.set(x+.07,base+h*.55,z);object.rotation.set(0,a,-.7);object.scale.set(.12,.24,.08);object.updateMatrix();leaves.current?.setMatrixAt(flower,object.matrix)
  object.position.set(x,base+h,z);object.rotation.set(0,a,0);object.scale.setScalar(.075);object.updateMatrix();centers.current?.setMatrixAt(flower,object.matrix)
  for(let n=0;n<6;n++){const angle=n*Math.PI/3;object.position.set(x+Math.cos(angle)*.1,base+h,z+Math.sin(angle)*.1);object.rotation.set(0,-angle,0);object.scale.set(.13,.045,.075);object.updateMatrix();petals.current?.setMatrixAt(petal++,object.matrix)}flower++}}
  for(const mesh of [stems.current,leaves.current,petals.current,centers.current])if(mesh){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere()}
 },[object])
 useFrame(({clock})=>{if(petalMaterial.current){const p=seasonColors();petalMaterial.current.color.set(worldTime.realWorld.season==='winter'?'#dce6e8':p.petal[Math.floor(clock.elapsedTime/9)%3])}})
 return <group name="CozyAuthoredFlowerBeds">
  <instancedMesh ref={stems} args={[undefined,undefined,25]}><cylinderGeometry args={[.018,.026,.6,6]}/><meshStandardMaterial color="#597d56" roughness={.9}/></instancedMesh>
  <instancedMesh ref={leaves} args={[undefined,undefined,25]}><sphereGeometry args={[1,8,5]}/><meshStandardMaterial color="#6f9364" roughness={.88}/></instancedMesh>
  <instancedMesh ref={petals} args={[undefined,undefined,150]}><sphereGeometry args={[1,8,5]}/><meshStandardMaterial ref={petalMaterial} color="#f3b9ce" roughness={.72}/></instancedMesh>
  <instancedMesh ref={centers} args={[undefined,undefined,25]}><sphereGeometry args={[1,8,6]}/><meshStandardMaterial color="#d7a64e" roughness={.7}/></instancedMesh>
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
  {/* Watering can and boots sit together beside the flower bed, implying daily care. */}
  <group position={[7.2,surfaceHeight(7.2,-18),-18]} rotation={[0,.3,0]}>
   <mesh position={[0,.28,0]} castShadow><cylinderGeometry args={[.3,.36,.5,12]}/><meshStandardMaterial color="#789b91" metalness={.18} roughness={.58}/></mesh>
   <mesh position={[.43,.38,0]} rotation={[0,0,-.75]}><cylinderGeometry args={[.08,.17,.75,8]}/><meshStandardMaterial color="#789b91" metalness={.18} roughness={.58}/></mesh>
   <mesh position={[-.38,.53,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.25,.045,7,18,Math.PI]}/><meshStandardMaterial color="#657f77"/></mesh>
  </group>
  {[-.28,.28].map((x,i)=><mesh key={i} position={[9.3+x,.24,-18.35+i*.08]} rotation={[0,-.2+i*.12,0]} castShadow><boxGeometry args={[.32,.48,.55]}/><meshStandardMaterial color="#8f6c56" roughness={.95}/></mesh>)}
  {/* A short fence frames the garden without enclosing the whole yard. */}
  <group position={[3.1,0,-18.7]} rotation={[0,.08,0]}>{[-1.8,0,1.8].map(x=><mesh key={x} position={[x,.55,0]} castShadow><boxGeometry args={[.14,1.1,.14]}/><meshStandardMaterial color="#b49a75" roughness={.94}/></mesh>)}{[.38,.78].map(y=><mesh key={y} position={[0,y,0]}><boxGeometry args={[3.8,.12,.1]}/><meshStandardMaterial color="#b49a75" roughness={.94}/></mesh>)}</group>
  <pointLight ref={light} position={[12.4,1.2,-17.2]} color="#ffd2a2" intensity={0} distance={7} decay={2}/>
 </group>
}

function PathAndRiverLife(){
 const fish=useRef<Group>(null),life=useRef<Group>(null),fireflies=useRef<Group>(null)
 const season=worldTime.realWorld.season
 const start=homeWorldPoint(DOOR.x,5.5),endX=streamCenter(BRIDGE.z)+BRIDGE.halfLength
 useFrame(({clock})=>{const t=clock.elapsedTime,season=worldTime.realWorld.season;if(fish.current){fish.current.position.x=Math.sin(t*.32)*.7;fish.current.rotation.y=Math.sin(t*.32)>.0?0:Math.PI}if(life.current){life.current.visible=(season==='spring'||season==='summer')&&env.night<.45;life.current.position.y=.9+Math.sin(t*.8)*.16;life.current.rotation.y=t*.22}if(fireflies.current)fireflies.current.visible=env.night>.45&&season!=='winter'})
 return <group name="CozyPathRiverMicroScene">
  {Array.from({length:10},(_,i)=>{const t=i/9,x=start.x+(endX-start.x)*t+Math.sin(i*1.7)*.28,z=start.z+(BRIDGE.z-start.z)*t,y=surfaceHeight(x,z);return <mesh key={i} position={[x,y+.025,z]} rotation={[-Math.PI/2,0,i*.51]} scale={[.72+(i%3)*.09,.48+(i%2)*.06,1]} receiveShadow><circleGeometry args={[.75,12]}/><meshStandardMaterial color={season==='winter'?'#b7c2c2':'#aaa58d'} roughness={.96}/></mesh>})}
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
 const materials=useMemo(()=>({wood:new MeshStandardMaterial({color:'#8c7158',roughness:.9}),cream:new MeshStandardMaterial({color:'#d9ceb5',roughness:.92})}),[])
 useEffect(()=>()=>{materials.wood.dispose();materials.cream.dispose()},[materials])
 useEffect(()=>{if(mode!=='V4_COZY')return;const timer=window.setInterval(()=>setSeason(current=>current===worldTime.realWorld.season?current:worldTime.realWorld.season),250);return()=>window.clearInterval(timer)},[mode])
 if(mode!=='V4_COZY')return null
 return <group name="V4CozyHomeBridgeRiver">
  <HomeDetails/>
  <PathAndRiverLife/>
  {SHOW_V4_TREE_BLOCKOUT&&HERO_TREES.map(([x,z,scale],i)=><HeroTree key={i} x={x} z={z} scale={scale} index={i}/>)}
  <CozyFlowers/>
  {/* One small stool near the porch, large enough to read but outside the doorway. */}
  <group position={[6.2,surfaceHeight(6.2,-18.5),-18.5]}><mesh position={[0,.48,0]} material={materials.cream}><cylinderGeometry args={[.48,.42,.13,18]}/></mesh>{[-.28,.28].map(x=><mesh key={x} position={[x,.24,0]} material={materials.wood}><boxGeometry args={[.09,.48,.09]}/></mesh>)}</group>
 </group>
}
