import { useCallback,useEffect,useMemo,useRef,useState,useSyncExternalStore } from 'react'
import { useFrame,useThree } from '@react-three/fiber'
import { Group,MathUtils,MeshStandardMaterial,Quaternion,Vector3 } from 'three'
import type { RefObject } from 'react'
import type { Player } from './locomotion.ts'
import { useRendererMode } from '../graphics/rendererV2.ts'
import { aliveNpcPosition,aliveWorldStore,type NpcAction } from './aliveWorldState.ts'
import { environmentState } from './environmentState.ts'
import { worldTime } from './worldTime.ts'
import { branch,leafBlade,weatheredStone } from './artGeometry.ts'
import { homeWorldPoint } from './homeSpace.ts'
import { surfaceHeight } from './terrain.ts'
import WorldInteractionPrompt from './WorldInteractionPrompt.tsx'
import { blockWorldMovement } from './worldPointer.ts'
import { INTERACTION_RANGES,inRange } from './worldInteraction.ts'
import { contextAction } from '../ui/contextAction.ts'

const point=(x:number,z:number)=>{const p=homeWorldPoint(x,z);return new Vector3(p.x,surfaceHeight(p.x,p.z),p.z)}
const ROUTE=[point(1.4,6.2),point(-4.2,8.1),new Vector3(10.2,surfaceHeight(10.2,-4),-4),point(-1.5,12.3)]
const LOST_SEEDS=[
 {id:'lost-seed-1',position:point(-5.8,9.3)},
 {id:'lost-seed-2',position:point(-.6,12.5)},
 {id:'lost-seed-3',position:new Vector3(10.2,surfaceHeight(10.2,-5.6),-5.6)},
]
const dialogueTurn=new Quaternion()
function holdPlayerForDialogue(player:Player,npc:Vector3,delta:number){player.keys.clear();player.touchX=0;player.touchZ=0;player.jumpRequested=false;const direction=player.position.clone().sub(npc).setY(0).normalize();dialogueTurn.setFromAxisAngle(player.up,Math.atan2(-direction.x,-direction.z));player.rotation.slerp(dialogueTurn,1-Math.exp(-5*Math.min(delta,.05)))}
function turnToward(current:number,target:number,delta:number){const difference=MathUtils.euclideanModulo(target-current+Math.PI,Math.PI*2)-Math.PI;return current+difference*(1-Math.exp(-5*Math.min(delta,.05)))}

function MallowVisual({root}:{root:RefObject<Group|null>}){
 const r=useMemo(()=>({body:weatheredStone(.8,true,20),head:weatheredStone(2.1,true,18),ear:leafBlade(.3,1,.15),leg:branch([[0,0,0],[0,-.28,.04],[.02,-.5,.08]],.065,.045,6,6),bodyMat:new MeshStandardMaterial({color:'#dfc99f',roughness:.86}),earMat:new MeshStandardMaterial({color:'#79956f',roughness:.82}),bagMat:new MeshStandardMaterial({color:'#87664e',roughness:.95}),faceMat:new MeshStandardMaterial({color:'#27362f',roughness:.72}),cheekMat:new MeshStandardMaterial({color:'#c98e87',roughness:.82}),glowMat:new MeshStandardMaterial({color:'#f3ddb1',emissive:'#e9be74',emissiveIntensity:.42,roughness:.72})}),[])
 useEffect(()=>()=>{r.body.dispose();r.head.dispose();r.ear.dispose();r.leg.dispose();r.bodyMat.dispose();r.earMat.dispose();r.bagMat.dispose();r.faceMat.dispose();r.cheekMat.dispose();r.glowMat.dispose()},[r])
 return <group ref={root} scale={.82}>
  <mesh geometry={r.body} material={r.bodyMat} scale={[.5,.64,.46]} position={[0,.78,0]} castShadow/>
  <mesh geometry={r.head} material={r.bodyMat} scale={[.57,.49,.51]} position={[0,1.5,.02]} castShadow/>
  <mesh geometry={r.ear} material={r.earMat} position={[-.24,1.79,-.01]} rotation={[.06,0,.34]} scale={[.82,.8,.82]} castShadow/>
  <mesh geometry={r.ear} material={r.earMat} position={[.23,1.8,-.01]} rotation={[.05,Math.PI,-.22]} scale={[.72,.74,.72]} castShadow/>
  <mesh geometry={r.leg} material={r.bodyMat} position={[-.2,.52,0]} rotation={[.08,0,0]} castShadow/>
  <mesh geometry={r.leg} material={r.bodyMat} position={[.2,.52,0]} rotation={[-.08,0,0]} castShadow/>
  <mesh material={r.bagMat} position={[.48,.82,.03]} rotation={[0,0,-.18]} castShadow><boxGeometry args={[.38,.44,.2]}/></mesh>
  <mesh material={r.faceMat} position={[-.15,1.52,.49]} scale={[.78,1,1]}><sphereGeometry args={[.065,12,10]}/></mesh>
  <mesh material={r.faceMat} position={[.15,1.52,.49]} scale={[.78,1,1]}><sphereGeometry args={[.065,12,10]}/></mesh>
  <mesh material={r.cheekMat} position={[-.28,1.42,.45]} scale={[1.4,.65,.5]}><sphereGeometry args={[.07,12,8]}/></mesh>
  <mesh material={r.cheekMat} position={[.28,1.42,.45]} scale={[1.4,.65,.5]}><sphereGeometry args={[.07,12,8]}/></mesh>
  <mesh material={r.faceMat} position={[0,1.39,.51]} rotation={[0,0,Math.PI/2]} scale={[.65,.3,.35]}><torusGeometry args={[.055,.012,6,12,Math.PI]}/></mesh>
  <mesh material={r.glowMat} position={[-.52,.82,-.04]}><sphereGeometry args={[.14,12,8]}/></mesh>
 </group>
}

function LostSeed({id,position,index,player,near}:{id:string;position:Vector3;index:number;player:RefObject<Player>;near:boolean}){
 const root=useRef<Group>(null),[collecting,setCollecting]=useState(false),progress=useRef(0)
 const pickup=useCallback(()=>{if(!near||collecting)return;setCollecting(true);if('vibrate'in navigator)navigator.vibrate(7)},[near,collecting])
 useEffect(()=>{if(!near||collecting){contextAction.clear(id);return}contextAction.set(id,{id,kind:'PICK_UP',label:'줍기',priority:80,perform:pickup});return()=>contextAction.clear(id)},[id,near,collecting,pickup])
 useFrame((_,delta)=>{if(!collecting||!root.current)return;progress.current=Math.min(1,progress.current+delta/0.34);const eased=1-(1-progress.current)**3;root.current.position.set((player.current.position.x-position.x)*eased,(player.current.position.y-position.y+.75)*eased+Math.sin(progress.current*Math.PI)*.32,(player.current.position.z-position.z)*eased);root.current.scale.setScalar(1-eased*.72);if(progress.current>=1&&aliveWorldStore.collect(id)){setCollecting(false);if('vibrate'in navigator)navigator.vibrate(10)}})
 return <group position={position.toArray()} onPointerDown={e=>{e.stopPropagation();if(!near||collecting)return;blockWorldMovement(e.nativeEvent.pointerId);pickup()}}>
  <group ref={root}><mesh rotation={[0,index*.7,.35]} castShadow><dodecahedronGeometry args={[.16,0]}/><meshStandardMaterial color="#c9a86d" emissive="#9b7742" emissiveIntensity={.15} roughness={.86}/></mesh><pointLight color="#f4dfa5" intensity={near?1:.35} distance={near?1.8:1.2}/></group>
 </group>
}

export default function AliveCuteWorld({player}:{player:RefObject<Player>}){
 const mode=useRendererMode(),state=useSyncExternalStore(aliveWorldStore.subscribe,aliveWorldStore.getSnapshot),actor=useRef<Group>(null),motion=useRef<Group>(null),action=useRef<NpcAction>('IDLE'),targetIndex=useRef(0),dwell=useRef(1.5),near=useRef(false),aware=useRef(false),noticeDwell=useRef(0),nearSeed=useRef<string|null>(null),[nearSeedId,setNearSeedId]=useState<string|null>(null),[awareNpc,setAwareNpc]=useState(false),tmp=useRef(new Vector3()),{gl}=useThree()
 useEffect(()=>()=>{gl.domElement.style.removeProperty('cursor')},[gl])
 const runtime=aliveWorldStore.getRuntime()
 useEffect(()=>{if(mode!=='V4_COZY_TEST'||!runtime.nearNpc||runtime.npcOpen){contextAction.clear('mallow');return}const ready=state.lostSeeds.status==='RETURN';contextAction.set('mallow',{id:'mallow',kind:ready?'GIVE':'TALK',label:ready?'건네기':'말 걸기',priority:ready||state.lostSeeds.status==='AVAILABLE'?100:70,perform:()=>aliveWorldStore.setRuntime({npcOpen:true,notice:state.lostSeeds.status==='COMPLETE'?'ambient':null})});return()=>contextAction.clear('mallow')},[mode,runtime.nearNpc,runtime.npcOpen,state.lostSeeds.status])
 useFrame(({clock},delta)=>{if(mode!=='V4_COZY_TEST'||!actor.current)return
  aliveNpcPosition.x=actor.current.position.x;aliveNpcPosition.y=actor.current.position.y;aliveNpcPosition.z=actor.current.position.z
  const dialogue=aliveWorldStore.getRuntime().npcOpen
  const hour=worldTime.presentation.hour,rain=environmentState.rain>.18,night=hour>=20||hour<5
  const forced=rain?0:night?2:null;if(forced!==null)targetIndex.current=forced
  const target=ROUTE[targetIndex.current],distance=actor.current.position.distanceTo(target)
  if(dialogue){action.current=aliveWorldStore.getRuntime().notice==='complete'?'WAVE':'LOOK';holdPlayerForDialogue(player.current,actor.current.position,delta);tmp.current.copy(player.current.position).sub(actor.current.position).setY(0).normalize();actor.current.rotation.y=turnToward(actor.current.rotation.y,Math.atan2(tmp.current.x,tmp.current.z),delta)}
  else if(distance>.16){action.current=rain?'RUN':'WALK';tmp.current.copy(target).sub(actor.current.position).setY(0).normalize();actor.current.position.addScaledVector(tmp.current,delta*(rain?2.1:1.05));actor.current.position.y=surfaceHeight(actor.current.position.x,actor.current.position.z);actor.current.rotation.y=Math.atan2(tmp.current.x,tmp.current.z)}
  else{dwell.current-=delta;action.current=state.lostSeeds.status==='AVAILABLE'?'REACT':targetIndex.current===1?'INSPECT':night?'LOOK':'IDLE';if(dwell.current<=0&&forced===null){targetIndex.current=(targetIndex.current+1)%ROUTE.length;dwell.current=2.5+targetIndex.current*.7}}
  const playerDistance=actor.current.position.distanceTo(player.current.position),isNear=inRange(playerDistance,INTERACTION_RANGES.NPC.action,near.current)
  const isAware=inRange(playerDistance,INTERACTION_RANGES.NPC.awareness,aware.current,.5)
  if(isAware!==aware.current){aware.current=isAware;setAwareNpc(isAware)}
  if(isNear!==near.current){near.current=isNear;if(isNear)noticeDwell.current=.72;aliveWorldStore.setRuntime({nearNpc:isNear,...(!isNear?{npcOpen:false}:{})})}
  if(!dialogue&&noticeDwell.current>0){noticeDwell.current-=delta;action.current='REACT'}
  let nextSeed:string|null=null,nextDistance=INTERACTION_RANGES.COLLECTIBLE.action+.22;for(const seed of LOST_SEEDS){if(state.lostSeeds.collected.includes(seed.id))continue;const seedDistance=Math.hypot(player.current.position.x-seed.position.x,player.current.position.z-seed.position.z);if(inRange(seedDistance,INTERACTION_RANGES.COLLECTIBLE.action,nearSeed.current===seed.id)&&seedDistance<nextDistance){nextSeed=seed.id;nextDistance=seedDistance}}
  if(nextSeed!==nearSeed.current){nearSeed.current=nextSeed;setNearSeedId(nextSeed);aliveWorldStore.setRuntime({nearCollectible:!!nextSeed})}
  aliveWorldStore.setRuntime({npcAction:action.current})
  if(motion.current){const moving=action.current==='WALK'||action.current==='RUN',phase=clock.elapsedTime*(action.current==='RUN'?11:7);motion.current.position.y=moving?Math.abs(Math.sin(phase))*.055:Math.sin(phase*.22)*.018;motion.current.rotation.x=action.current==='INSPECT'?.15:0;motion.current.rotation.z=action.current==='REACT'||action.current==='WAVE'?Math.sin(clock.elapsedTime*7)*.11:0;motion.current.rotation.y=action.current==='LOOK'?Math.sin(clock.elapsedTime*.8)*.08:0}
 })
 if(mode!=='V4_COZY_TEST')return null
 const showPrompt=awareNpc&&(state.lostSeeds.status==='AVAILABLE'||state.lostSeeds.status==='RETURN')&&!runtime.npcOpen
 return <group name="AliveCuteWorldV1">
  <group ref={actor} position={[ROUTE[0].x,ROUTE[0].y,ROUTE[0].z]} onPointerDown={e=>{e.stopPropagation();blockWorldMovement(e.nativeEvent.pointerId);if(actor.current&&actor.current.position.distanceTo(player.current.position)<4)aliveWorldStore.setRuntime({nearNpc:true,npcOpen:true})}} onPointerOver={e=>{e.stopPropagation();gl.domElement.style.setProperty('cursor','pointer')}} onPointerOut={()=>gl.domElement.style.removeProperty('cursor')}><MallowVisual root={motion}/>{showPrompt&&<group position={[0,2.45,0]}><WorldInteractionPrompt label="!" compact/></group>}</group>
  {(state.lostSeeds.status==='ACTIVE'||state.lostSeeds.status==='RETURN')&&LOST_SEEDS.filter(seed=>!state.lostSeeds.collected.includes(seed.id)).map((seed,i)=><LostSeed key={seed.id} id={seed.id} position={seed.position} index={i} player={player} near={nearSeedId===seed.id}/>)}
 </group>
}
