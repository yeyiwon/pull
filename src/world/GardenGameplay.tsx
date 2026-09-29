import { useEffect,useMemo,useRef,useState,useSyncExternalStore } from 'react'
import { useFrame,useThree } from '@react-three/fiber'
import { Color,DoubleSide,Group,Mesh,MeshBasicMaterial,MeshStandardMaterial,Shape,ShapeGeometry } from 'three'
import { useRendererMode } from '../graphics/rendererV2.ts'
import { environmentState } from './environmentState.ts'
import { gardenStore,growthRemainingMs,growthStage,PLANTS,soilMoisture,type GardenPlant,type GardenStage } from './gardenState.ts'
import { homeWorldPoint } from './homeSpace.ts'
import { branch,leafBlade } from './artGeometry.ts'
import { surfaceHeight } from './terrain.ts'
import { worldTime } from './worldTime.ts'
import type { Player } from './locomotion.ts'
import type { RefObject } from 'react'
import { blockWorldMovement } from './worldPointer.ts'
import { INTERACTION_RANGES,inRange } from './worldInteraction.ts'
import { aliveWorldStore } from './aliveWorldState.ts'
import { contextAction } from '../ui/contextAction.ts'
import { HOME } from './worldLayout.ts'

const localGarden=[[6.4,9.25],[8.5,9.25],[10.6,9.25],[6.4,11.3],[8.5,11.3],[10.6,11.3]] as const
const localDecor=[[-6.8,7.4],[-4.8,6.6],[-2.5,7.2],[.1,8.2],[-6.7,12.8],[-4.2,13.5],[-1.4,13.7],[1.2,11.8],[2.3,9.7],[3.6,7.8]] as const
const GARDEN_SPOTS=localGarden.map(([x,z],i)=>({id:`garden-${i+1}`,...homeWorldPoint(x,z)}))
const DECOR_SPOTS=localDecor.map(([x,z],i)=>({id:`decor-${i+1}`,...homeWorldPoint(x,z)}))
const colors:Record<GardenPlant,{petal:string;center:string;leaf:string}>={starbell:{petal:'#d6d5ff',center:'#fff0a8',leaf:'#6f9a72'},moondrop:{petal:'#addde6',center:'#f8e7ba',leaf:'#5f8c7d'},cloverlight:{petal:'#edc7d8',center:'#fff2c5',leaf:'#799566'}}
const gardenCenter=homeWorldPoint(8.5,10.3)
function compactRemaining(ms:number){const minutes=Math.max(1,Math.ceil(ms/60_000));return minutes<60?`${minutes}분`:`${Math.ceil(minutes/60)}시간`}

function GardenPlotFrame(){
 const wood='#9b7b58'
 return <group name="HomeGardenPlot" position={[gardenCenter.x,surfaceHeight(gardenCenter.x,gardenCenter.z)+.035,gardenCenter.z]} rotation={[0,HOME.yaw,0]}>
  {([[-3.3,-2.55],[-1.05,-2.55],[1.05,-2.55],[3.3,-2.55],[-3.3,2.55],[-1.1,2.55],[1.1,2.55],[3.3,2.55],[-3.3,0],[3.3,0]] as const).map(([x,z],index)=><mesh key={index} position={[x,.55,z]} castShadow><boxGeometry args={[.16,1.1,.16]}/><meshStandardMaterial color={wood} roughness={.94}/></mesh>)}
  <mesh position={[0,.72,2.55]} castShadow><boxGeometry args={[6.7,.12,.12]}/><meshStandardMaterial color={wood} roughness={.94}/></mesh>
  <mesh position={[-3.3,.72,0]} castShadow><boxGeometry args={[.12,.12,5.2]}/><meshStandardMaterial color={wood} roughness={.94}/></mesh>
  <mesh position={[3.3,.72,0]} castShadow><boxGeometry args={[.12,.12,5.2]}/><meshStandardMaterial color={wood} roughness={.94}/></mesh>
  {[-2.18,2.18].map(x=><mesh key={x} position={[x,.72,-2.55]} castShadow><boxGeometry args={[2.28,.12,.12]}/><meshStandardMaterial color={wood} roughness={.94}/></mesh>)}
  <group position={[2.6,1.18,-2.62]} rotation={[0,0,.035]}><mesh castShadow><boxGeometry args={[1.35,.58,.11]}/><meshStandardMaterial color="#b99668" roughness={.9}/></mesh>{[-.35,.35].map(x=><mesh key={x} position={[x,-.55,0]}><boxGeometry args={[.09,.75,.09]}/><meshStandardMaterial color={wood} roughness={.95}/></mesh>)}</group>
 </group>
}

function PlantMarker({kind}:{kind:GardenPlant}){
 const palette=colors[kind]
 return <group position={[.45,.08,.44]} rotation={[0,-.32,0]}>
  <mesh position={[0,.17,0]} castShadow><boxGeometry args={[.045,.34,.045]}/><meshStandardMaterial color="#75563f" roughness={.94}/></mesh>
  <mesh position={[0,.34,0]} castShadow><boxGeometry args={[.28,.19,.045]}/><meshStandardMaterial color="#b28a60" roughness={.9}/></mesh>
  <mesh position={[0,.34,.026]}><circleGeometry args={[.052,12]}/><meshStandardMaterial color={palette.petal} emissive={palette.petal} emissiveIntensity={.12} roughness={.72}/></mesh>
 </group>
}

function petalGeometry(){const s=new Shape();s.moveTo(0,0);s.bezierCurveTo(.18,.08,.28,.42,0,.65);s.bezierCurveTo(-.28,.42,-.18,.08,0,0);return new ShapeGeometry(s,5)}
function Plant({kind,stage}:{kind:GardenPlant;stage:GardenStage}){
 const group=useRef<Group>(null),resources=useMemo(()=>({stem:branch([[0,0,0],[.03,.35,0],[-.03,.8,.02]],.055,.025,7,6),leaf:leafBlade(.18,.52,.09),petal:petalGeometry(),stemMat:new MeshStandardMaterial({color:colors[kind].leaf,roughness:.8}),petalMat:new MeshStandardMaterial({color:colors[kind].petal,roughness:.7,side:DoubleSide}),centerMat:new MeshStandardMaterial({color:colors[kind].center,emissive:colors[kind].center,emissiveIntensity:.08,roughness:.65})}),[kind])
 useEffect(()=>()=>{resources.stem.dispose();resources.leaf.dispose();resources.petal.dispose();resources.stemMat.dispose();resources.petalMat.dispose();resources.centerMat.dispose()},[resources])
 useFrame(({clock})=>{if(group.current)group.current.rotation.z=Math.sin(clock.elapsedTime*1.1+kind.length)*.025})
 if(stage==='seed')return null
 const scale=stage==='sprout'?.54:stage==='young'?.82:1
 return <group ref={group} scale={scale}>
  <mesh geometry={resources.stem} material={resources.stemMat} castShadow/>
  <mesh geometry={resources.leaf} material={resources.stemMat} position={[.03,.25,.02]} rotation={[.2,0,-1.15]} scale={.75}/>
  <mesh geometry={resources.leaf} material={resources.stemMat} position={[-.03,stage==='sprout'?.28:.48,0]} rotation={[.1,Math.PI,-1.05]} scale={stage==='sprout'?.62:.9}/>
  {stage==='bloom'&&<group position={[0,.83,0]} rotation={[Math.PI/2,0,0]}>{Array.from({length:kind==='cloverlight'?4:kind==='starbell'?5:6},(_,i)=><mesh key={i} geometry={resources.petal} material={resources.petalMat} rotation={[0,0,i*Math.PI*2/(kind==='cloverlight'?4:kind==='starbell'?5:6)]} scale={kind==='moondrop'?[.75,.9,.75]:[.9,.9,.9]}/>)}<mesh material={resources.centerMat}><sphereGeometry args={[.13,12,8]}/></mesh></group>}
 </group>
}
function FlowerPatch({kind}:{kind:GardenPlant}){return <group scale={.72}><Plant kind={kind} stage="bloom"/><group position={[.28,0,.12]} scale={.68}><Plant kind={kind} stage="bloom"/></group></group>}
function GardenSpotCue(){const root=useRef<Group>(null);useFrame(({clock})=>{if(!root.current)return;const wave=(Math.sin(clock.elapsedTime*2.6)+1)/2;root.current.position.y=.035+wave*.018;root.current.scale.setScalar(.88+wave*.12)});return <group ref={root} rotation={[-Math.PI/2,0,0]}><mesh><ringGeometry args={[.48,.54,28]}/><meshBasicMaterial color="#f4dfaa" transparent opacity={.34} depthWrite={false}/></mesh></group>}
function GardenActionEffect({kind}:{kind:'SEED'|'WATER'|'FLOWER'}){
 const root=useRef<Group>(null),ring=useRef<Mesh>(null),elapsed=useRef(0),count=kind==='FLOWER'?8:kind==='WATER'?7:6
 useFrame((_,delta)=>{if(!root.current)return;elapsed.current+=delta;const t=Math.min(1,elapsed.current/(kind==='FLOWER'?.82:.68));root.current.visible=t<1
  root.current.children.slice(1).forEach((child,index)=>{const angle=index/count*Math.PI*2+(kind==='FLOWER'?t*2.4:0),radius=kind==='FLOWER'?.34*(1-t*.45):kind==='SEED'?.08+t*.26:.12+index%2*.11;child.position.x=Math.cos(angle)*radius;child.position.z=Math.sin(angle)*radius;child.position.y=kind==='WATER'?.82-(t*(1.1+index*.03))%1:kind==='SEED'?.62-t*(.72+index*.025):.08+Math.sin(t*Math.PI)*(.42+index*.025);child.rotation.x+=delta*(2+index*.12);child.rotation.z+=delta*(kind==='FLOWER'?3.2:1.4);child.scale.setScalar(Math.max(.05,1-t*.58))})
  if(ring.current){ring.current.scale.setScalar(.65+t*.85);const material=ring.current.material as MeshBasicMaterial;material.opacity=(1-t)*(kind==='WATER'?.34:.2)}
 })
 const color=kind==='WATER'?'#9ee7f0':kind==='FLOWER'?'#edc7d8':'#c7a66a'
 return <group ref={root} position={[0,.04,0]}><mesh ref={ring} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.28,.34,24]}/><meshBasicMaterial color={color} transparent opacity={.28} depthWrite={false}/></mesh>{Array.from({length:count},(_,index)=><mesh key={index} position={[0,.3,0]} rotation={kind==='FLOWER'?[Math.PI/2,0,index/count*Math.PI*2]:[0,0,index*.7]}>{kind==='FLOWER'?<circleGeometry args={[.055,8]}/>:kind==='WATER'?<sphereGeometry args={[.035,7,5]}/>:<dodecahedronGeometry args={[.035,0]}/>}<meshBasicMaterial color={index%2?color:kind==='WATER'?'#d8fbff':kind==='FLOWER'?'#fff0c7':'#806344'} transparent opacity={.9} depthWrite={false}/></mesh>)}</group>
}
export default function GardenGameplay({player}:{player:RefObject<Player>}){
 const mode=useRendererMode(),state=useSyncExternalStore(gardenStore.subscribe,gardenStore.getSnapshot),{gl}=useThree(),rainLatch=useRef(false),[now,setNow]=useState(()=>Date.now()),[nearSpot,setNearSpot]=useState<string|null>(null),nearRef=useRef<string|null>(null)
 useEffect(()=>{const id=window.setInterval(()=>setNow(Date.now()),30_000);return()=>window.clearInterval(id)},[])
 useFrame(()=>{if(environmentState.rain>.24&&!rainLatch.current){rainLatch.current=true;gardenStore.waterAll()}else if(environmentState.rain<.05)rainLatch.current=false
  let closest:string|null=null,distance=INTERACTION_RANGES.GARDEN.action+.22;for(const spot of [...GARDEN_SPOTS,...DECOR_SPOTS]){const next=Math.hypot(player.current.position.x-spot.x,player.current.position.z-spot.z);if(inRange(next,INTERACTION_RANGES.GARDEN.action,nearRef.current===spot.id)&&next<distance){closest=spot.id;distance=next}}
  if(closest!==nearRef.current){nearRef.current=closest;setNearSpot(closest)}
 })
 useEffect(()=>()=>{gl.domElement.style.removeProperty('cursor')},[gl])
 useEffect(()=>{if(mode!=='V4_COZY'||!nearSpot||aliveWorldStore.getRuntime().nearCollectible||aliveWorldStore.getRuntime().nearNpc){contextAction.clear('garden');return}
  const plant=state.plants.find(value=>value.spotId===nearSpot),decor=state.decorations.find(value=>value.spotId===nearSpot),stage=plant&&growthStage(plant,now,worldTime.realWorld.season),kind=nearSpot.startsWith('garden-')?'garden':'decor'
  const action=kind==='decor'?'PLACE':!plant?'PLANT':'INSPECT'
  const plantName=plant?PLANTS.find(item=>item.id===plant.kind)?.name??'꽃':null
  const label=kind==='decor'?'꽃심기':!plant?'꽃심기':stage==='bloom'?`${plantName} · 다 자람`:`${plantName} · ${compactRemaining(growthRemainingMs(plant,now,worldTime.realWorld.season))}`
  contextAction.set('garden',{id:nearSpot,kind:action,label,priority:decor?35:40,perform:()=>gardenStore.select({kind,spotId:nearSpot})});return()=>contextAction.clear('garden')
 },[mode,nearSpot,state,now])
 if(mode!=='V4_COZY')return null
 const select=(kind:'garden'|'decor',spotId:string)=>(event:{stopPropagation:()=>void;nativeEvent:{pointerId:number}})=>{event.stopPropagation();if(spotId!==nearRef.current)return;blockWorldMovement(event.nativeEvent.pointerId);gardenStore.select({kind,spotId})}
 return <group name="PlayableGardenV1">
  <GardenPlotFrame/>
  {GARDEN_SPOTS.map(spot=>{const plant=state.plants.find(p=>p.spotId===spot.id),moisture=soilMoisture(plant,now),soilColor=new Color('#8a684f').lerp(new Color('#4b352c'),moisture);return <group key={spot.id} position={[spot.x,surfaceHeight(spot.x,spot.z)+.025,spot.z]} rotation={[0,HOME.yaw,0]} onPointerDown={select('garden',spot.id)} onPointerOver={e=>{e.stopPropagation();gl.domElement.style.cursor='pointer'}} onPointerOut={()=>gl.domElement.style.removeProperty('cursor')}>
   <mesh position={[0,-.035,0]} receiveShadow castShadow><boxGeometry args={[1.42,.14,1.42]}/><meshStandardMaterial color="#765d49" roughness={.98}/></mesh>
   <mesh position={[0,.045,0]} receiveShadow><boxGeometry args={[1.24,.08,1.24]}/><meshStandardMaterial color={soilColor} roughness={1-moisture*.22}/></mesh>
   {!plant&&<>{[-.19,.03,.2].map((x,index)=><mesh key={x} position={[x,.012,(index-1)*.07]} rotation={[-Math.PI/2,0,index*.18]}><planeGeometry args={[.18,.012]}/><meshBasicMaterial color="#6d4f3d" transparent opacity={.28}/></mesh>)}</>}
   {plant&&growthStage(plant,now,worldTime.realWorld.season)==='seed'&&<group><mesh position={[0,.035,0]} scale={[1,.28,1]} castShadow><sphereGeometry args={[.25,14,8]}/><meshStandardMaterial color={soilColor} roughness={.92}/></mesh><mesh position={[0,.11,0]} rotation={[.2,0,.55]}><capsuleGeometry args={[.035,.09,4,7]}/><meshStandardMaterial color="#b99358" roughness={.8}/></mesh></group>}
   {plant&&<PlantMarker kind={plant.kind}/>}
   {!plant&&nearSpot===spot.id&&!aliveWorldStore.getRuntime().nearNpc&&!aliveWorldStore.getRuntime().nearCollectible&&<GardenSpotCue/>}
   {plant&&<Plant kind={plant.kind} stage={growthStage(plant,now,worldTime.realWorld.season)}/>}
   {plant&&plant.plantedAt>=now-1_200&&<GardenActionEffect key={`seed-${plant.plantedAt}`} kind="SEED"/>}
   {plant&&plant.wateredAt>plant.plantedAt&&plant.wateredAt>=now-1_200&&<GardenActionEffect key={`water-${plant.wateredAt}`} kind="WATER"/>}
  </group>})}
  {DECOR_SPOTS.map(spot=>{const decor=state.decorations.find(d=>d.spotId===spot.id);return <group key={spot.id} position={[spot.x,surfaceHeight(spot.x,spot.z)+.02,spot.z]} onPointerDown={select('decor',spot.id)} onPointerOver={e=>{e.stopPropagation();gl.domElement.style.cursor='pointer'}} onPointerOut={()=>gl.domElement.style.removeProperty('cursor')}>
   {!decor&&<mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.18,.24,18]}/><meshBasicMaterial color="#ece8c9" transparent opacity={.22}/></mesh>}
   {decor&&<FlowerPatch kind={decor.variant}/>}
   {decor&&decor.createdAt>=now-1_200&&<GardenActionEffect key={`flower-${decor.createdAt}`} kind="FLOWER"/>}
  </group>})}
  <group position={[10.5,surfaceHeight(10.5,-1)+.08,-1]} onPointerDown={e=>{e.stopPropagation();blockWorldMovement(e.nativeEvent.pointerId);gardenStore.discover('moondrop')}}>
   {!state.discovered.includes('moondrop')&&<><mesh rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.35,20]}/><meshStandardMaterial color="#91cad4" emissive="#78b9c9" emissiveIntensity={.35}/></mesh><pointLight color="#aeefff" intensity={1.3} distance={2.5}/></>}
  </group>
 </group>
}
