import { useEffect,useMemo,useRef,useState,useSyncExternalStore } from 'react'
import { useFrame,useThree } from '@react-three/fiber'
import { DoubleSide,Group,MeshStandardMaterial,Shape,ShapeGeometry } from 'three'
import { useRendererMode } from '../graphics/rendererV2.ts'
import { environmentState } from './environmentState.ts'
import { gardenStore,growthStage,type GardenPlant,type GardenStage } from './gardenState.ts'
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

const localGarden=[[-5.2,8.9],[-3.3,9.6],[-1.35,9.85],[-5.25,11],[-3.3,11.6],[-1.35,11.8]] as const
const localDecor=[[-6.8,7.4],[-4.8,6.6],[-2.5,7.2],[.1,8.2],[-6.7,12.8],[-4.2,13.5],[-1.4,13.7],[1.2,11.8],[2.3,9.7],[3.6,7.8]] as const
const GARDEN_SPOTS=localGarden.map(([x,z],i)=>({id:`garden-${i+1}`,...homeWorldPoint(x,z)}))
const DECOR_SPOTS=localDecor.map(([x,z],i)=>({id:`decor-${i+1}`,...homeWorldPoint(x,z)}))
const colors:Record<GardenPlant,{petal:string;center:string;leaf:string}>={starbell:{petal:'#d6d5ff',center:'#fff0a8',leaf:'#6f9a72'},moondrop:{petal:'#addde6',center:'#f8e7ba',leaf:'#5f8c7d'},cloverlight:{petal:'#edc7d8',center:'#fff2c5',leaf:'#799566'}}

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
  {stage!=='sprout'&&<mesh geometry={resources.leaf} material={resources.stemMat} position={[-.03,.48,0]} rotation={[.1,Math.PI,-1.05]} scale={.9}/>}
  {stage==='bloom'&&<group position={[0,.83,0]} rotation={[Math.PI/2,0,0]}>{Array.from({length:kind==='cloverlight'?4:kind==='starbell'?5:6},(_,i)=><mesh key={i} geometry={resources.petal} material={resources.petalMat} rotation={[0,0,i*Math.PI*2/(kind==='cloverlight'?4:kind==='starbell'?5:6)]} scale={kind==='moondrop'?[.75,.9,.75]:[.9,.9,.9]}/>)}<mesh material={resources.centerMat}><sphereGeometry args={[.13,12,8]}/></mesh></group>}
 </group>
}
function FlowerPatch({kind}:{kind:GardenPlant}){return <group scale={.72}><Plant kind={kind} stage="bloom"/><group position={[.28,0,.12]} scale={.68}><Plant kind={kind} stage="bloom"/></group></group>}
function GardenSpotCue(){const root=useRef<Group>(null);useFrame(({clock})=>{if(!root.current)return;const wave=(Math.sin(clock.elapsedTime*2.6)+1)/2;root.current.position.y=.035+wave*.018;root.current.scale.setScalar(.88+wave*.12)});return <group ref={root} rotation={[-Math.PI/2,0,0]}><mesh><ringGeometry args={[.48,.54,28]}/><meshBasicMaterial color="#f4dfaa" transparent opacity={.34} depthWrite={false}/></mesh></group>}
export default function GardenGameplay({player}:{player:RefObject<Player>}){
 const mode=useRendererMode(),state=useSyncExternalStore(gardenStore.subscribe,gardenStore.getSnapshot),{gl}=useThree(),rainLatch=useRef(false),[now,setNow]=useState(()=>Date.now()),[nearSpot,setNearSpot]=useState<string|null>(null),nearRef=useRef<string|null>(null)
 useEffect(()=>{const id=window.setInterval(()=>setNow(Date.now()),30_000);return()=>window.clearInterval(id)},[])
 useFrame(()=>{if(environmentState.rain>.24&&!rainLatch.current){rainLatch.current=true;gardenStore.waterAll()}else if(environmentState.rain<.05)rainLatch.current=false
  let closest:string|null=null,distance=INTERACTION_RANGES.GARDEN.action+.22;for(const spot of [...GARDEN_SPOTS,...DECOR_SPOTS]){const next=Math.hypot(player.current.position.x-spot.x,player.current.position.z-spot.z);if(inRange(next,INTERACTION_RANGES.GARDEN.action,nearRef.current===spot.id)&&next<distance){closest=spot.id;distance=next}}
  if(closest!==nearRef.current){nearRef.current=closest;setNearSpot(closest)}
 })
 useEffect(()=>()=>{gl.domElement.style.removeProperty('cursor')},[gl])
 useEffect(()=>{if(mode!=='V4_COZY_TEST'||!nearSpot||aliveWorldStore.getRuntime().nearCollectible||aliveWorldStore.getRuntime().nearNpc){contextAction.clear('garden');return}
  const plant=state.plants.find(value=>value.spotId===nearSpot),decor=state.decorations.find(value=>value.spotId===nearSpot),stage=plant&&growthStage(plant,now,worldTime.realWorld.season),kind=nearSpot.startsWith('garden-')?'garden':'decor'
  const action=kind==='decor'?'PLACE':!plant?'PLANT':stage==='bloom'&&!plant.collectedAt?'COLLECT':'WATER',label=action==='PLACE'?'놓기':action==='PLANT'?'심기':action==='COLLECT'?'꽃 받기':'물 주기'
  contextAction.set('garden',{id:nearSpot,kind:action,label,priority:decor?35:40,perform:()=>gardenStore.select({kind,spotId:nearSpot})});return()=>contextAction.clear('garden')
 },[mode,nearSpot,state,now])
 if(mode!=='V4_COZY_TEST')return null
 const select=(kind:'garden'|'decor',spotId:string)=>(event:{stopPropagation:()=>void;nativeEvent:{pointerId:number}})=>{event.stopPropagation();if(spotId!==nearRef.current)return;blockWorldMovement(event.nativeEvent.pointerId);gardenStore.select({kind,spotId})}
 return <group name="PlayableGardenV1">
  {GARDEN_SPOTS.map(spot=>{const plant=state.plants.find(p=>p.spotId===spot.id),wet=plant&&now-plant.wateredAt<24*3_600_000;return <group key={spot.id} position={[spot.x,surfaceHeight(spot.x,spot.z)+.025,spot.z]} onPointerDown={select('garden',spot.id)} onPointerOver={e=>{e.stopPropagation();gl.domElement.style.cursor='pointer'}} onPointerOut={()=>gl.domElement.style.removeProperty('cursor')}>
   <mesh receiveShadow rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.62,24]}/><meshStandardMaterial color={wet?'#59483e':'#756052'} roughness={1}/></mesh>
   <mesh position={[0,.025,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.54,.66,24]}/><meshStandardMaterial color="#8f795f" roughness={.95}/></mesh>
   {!plant&&nearSpot===spot.id&&!aliveWorldStore.getRuntime().nearNpc&&!aliveWorldStore.getRuntime().nearCollectible&&<GardenSpotCue/>}
   {plant&&<Plant kind={plant.kind} stage={growthStage(plant,now,worldTime.realWorld.season)}/>}
  </group>})}
  {DECOR_SPOTS.map(spot=>{const decor=state.decorations.find(d=>d.spotId===spot.id);return <group key={spot.id} position={[spot.x,surfaceHeight(spot.x,spot.z)+.02,spot.z]} onPointerDown={select('decor',spot.id)} onPointerOver={e=>{e.stopPropagation();gl.domElement.style.cursor='pointer'}} onPointerOut={()=>gl.domElement.style.removeProperty('cursor')}>
   {!decor&&<mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.18,.24,18]}/><meshBasicMaterial color="#ece8c9" transparent opacity={.22}/></mesh>}
   {decor&&<FlowerPatch kind={decor.variant}/>}
  </group>})}
  <group position={[10.5,surfaceHeight(10.5,-1)+.08,-1]} onPointerDown={e=>{e.stopPropagation();blockWorldMovement(e.nativeEvent.pointerId);gardenStore.discover('moondrop')}}>
   {!state.discovered.includes('moondrop')&&<><mesh rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.35,20]}/><meshStandardMaterial color="#91cad4" emissive="#78b9c9" emissiveIntensity={.35}/></mesh><pointLight color="#aeefff" intensity={1.3} distance={2.5}/></>}
  </group>
 </group>
}
