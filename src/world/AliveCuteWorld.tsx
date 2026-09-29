import { useCallback,useEffect,useMemo,useRef,useState,useSyncExternalStore } from 'react'
import { useFrame,useThree } from '@react-three/fiber'
import { Group,MathUtils,MeshStandardMaterial,Quaternion,Vector3 } from 'three'
import type { RefObject } from 'react'
import type { Player } from './locomotion.ts'
import { useRendererMode } from '../graphics/rendererV2.ts'
import { aliveWorldStore,publishResidentPosition,type NpcAction } from './aliveWorldState.ts'
import { environmentState } from './environmentState.ts'
import { worldTime } from './worldTime.ts'
import { branch,leafBlade,weatheredStone } from './artGeometry.ts'
import { homeWorldPoint } from './homeSpace.ts'
import { surfaceHeight } from './terrain.ts'
import WorldInteractionPrompt from './WorldInteractionPrompt.tsx'
import { blockWorldMovement } from './worldPointer.ts'
import { INTERACTION_RANGES,inRange } from './worldInteraction.ts'
import { contextAction } from '../ui/contextAction.ts'
import { RESIDENTS,chooseResidentRoutine,type ResidentAction,type ResidentId,type RoutineChoice } from './residentLife.ts'
import { worldEvents } from './worldEvents.ts'

const point=(x:number,z:number)=>{const p=homeWorldPoint(x,z);return new Vector3(p.x,surfaceHeight(p.x,p.z),p.z)}
const ROUTE=[point(1.4,6.2),point(-4.2,8.1),new Vector3(10.2,surfaceHeight(10.2,-4),-4),point(-1.5,12.3)]
const RESIDENT_POINTS=[...ROUTE,
 new Vector3(8.8,surfaceHeight(8.8,-7.4),-7.4),new Vector3(5.4,surfaceHeight(5.4,-9.5),-9.5),new Vector3(11.8,surfaceHeight(11.8,-2.2),-2.2),
 point(2.7,3.8),point(-2.5,4.7),point(4.4,7.2),
 new Vector3(4.8,surfaceHeight(4.8,-7.8),-7.8),new Vector3(7.1,surfaceHeight(7.1,-8.8),-8.8),new Vector3(9.1,surfaceHeight(9.1,-6.8),-6.8),
]
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

function ResidentVisual({id,root,carried}:{id:ResidentId;root:RefObject<Group|null>;carried:RefObject<Group|null>}){
 const spec=RESIDENTS.find(item=>item.id===id)!,r=useMemo(()=>({body:weatheredStone(.9,true,18),head:weatheredStone(1.9,true,18),ear:leafBlade(.3,1,.15),leg:branch([[0,0,0],[0,-.28,.03],[.02,-.48,.07]],.065,.045,6,6),bodyMat:new MeshStandardMaterial({color:spec.palette.body,roughness:.86}),accentMat:new MeshStandardMaterial({color:spec.palette.accent,roughness:.8}),detailMat:new MeshStandardMaterial({color:spec.palette.detail,emissive:id==='lumi'?'#d6a84e':'#000000',emissiveIntensity:id==='lumi'?.32:0,roughness:.78}),faceMat:new MeshStandardMaterial({color:'#283439',roughness:.72}),cheekMat:new MeshStandardMaterial({color:id==='pebble'?'#be9190':'#c790a1',roughness:.82})}),[id,spec])
 useEffect(()=>()=>{r.body.dispose();r.head.dispose();r.ear.dispose();r.leg.dispose();r.bodyMat.dispose();r.accentMat.dispose();r.detailMat.dispose();r.faceMat.dispose();r.cheekMat.dispose()},[r])
 const long=id==='lumi',round=id==='pebble'
 return <group ref={root} scale={spec.scale}>
  <mesh geometry={r.body} material={r.bodyMat} scale={round?[.58,.5,.52]:[.49,.63,.45]} position={[0,.78,0]} castShadow/>
  <mesh geometry={r.head} material={r.bodyMat} scale={round?[.61,.48,.54]:[.55,.5,.5]} position={[0,1.48,.02]} castShadow/>
  {round?<><mesh material={r.accentMat} position={[-.35,1.66,0]}><sphereGeometry args={[.19,12,10]}/></mesh><mesh material={r.accentMat} position={[.35,1.66,0]}><sphereGeometry args={[.19,12,10]}/></mesh></>:<><mesh geometry={r.ear} material={r.accentMat} position={[-.25,long?1.91:1.8,0]} rotation={[.06,0,.3]} scale={[.78,long?1.2:.82,.78]} castShadow/><mesh geometry={r.ear} material={r.accentMat} position={[.24,long?1.91:1.8,0]} rotation={[.05,Math.PI,-.24]} scale={[.72,long?1.14:.76,.72]} castShadow/></>}
  <mesh geometry={r.leg} material={r.bodyMat} position={[-.2,.52,0]} castShadow/><mesh geometry={r.leg} material={r.bodyMat} position={[.2,.52,0]} castShadow/>
  <mesh material={r.faceMat} position={[-.15,1.51,.49]} scale={[.78,1,1]}><sphereGeometry args={[.064,12,10]}/></mesh><mesh material={r.faceMat} position={[.15,1.51,.49]} scale={[.78,1,1]}><sphereGeometry args={[.064,12,10]}/></mesh>
  <mesh material={r.cheekMat} position={[-.27,1.41,.45]} scale={[1.35,.6,.5]}><sphereGeometry args={[.067,12,8]}/></mesh><mesh material={r.cheekMat} position={[.27,1.41,.45]} scale={[1.35,.6,.5]}><sphereGeometry args={[.067,12,8]}/></mesh>
  <mesh material={r.accentMat} position={[0,.96,.45]} scale={[.72,.16,.28]}><torusGeometry args={[.37,.07,7,18]}/></mesh>
  <group ref={carried} position={[.5,.92,.25]}>{id==='pebble'?<mesh material={r.detailMat} scale={[1,.7,.55]} castShadow><dodecahedronGeometry args={[.18,0]}/></mesh>:<mesh material={r.detailMat} castShadow><boxGeometry args={[.25,.3,.22]}/><pointLight color="#f6d890" intensity={id==='lumi'?1.2:0} distance={2}/></mesh>}</group>
 </group>
}

function ResidentActor({id,player}:{id:'pebble'|'lumi';player:RefObject<Player>}){
 const spec=RESIDENTS.find(item=>item.id===id)!,initialStep=id==='pebble'?1:3,actor=useRef<Group>(null),motion=useRef<Group>(null),carried=useRef<Group>(null),action=useRef<ResidentAction>('IDLE'),near=useRef(false),aware=useRef(false),step=useRef(initialStep),previous=useRef<RoutineChoice['activity']|null>(null),choice=useRef<RoutineChoice>(chooseResidentRoutine(spec,{hour:12,rain:false,snow:false,wind:false,fireworks:false,step:initialStep},null)),dwell=useRef(0),fireworksActive=useRef(false),reaction=useRef(0),tmp=useRef(new Vector3()),{gl}=useThree()
 const runtime=aliveWorldStore.getRuntime(),dialogue=runtime.npcOpen&&runtime.activeResident===id
 const open=useCallback(()=>aliveWorldStore.setRuntime({nearNpc:true,npcOpen:true,activeResident:id,notice:choice.current.situation==='RIVER_WATCH'?'river-watch':'ambient'}),[id])
 useEffect(()=>{if(!near.current||runtime.npcOpen){contextAction.clear(id);return}contextAction.set(id,{id,kind:'TALK',label:'말 걸기',priority:68,perform:open});return()=>contextAction.clear(id)},[id,open,runtime.npcOpen])
 useFrame(({clock},delta)=>{if(!actor.current)return
  publishResidentPosition(id,actor.current.position)
  const hour=worldTime.presentation.hour,rain=environmentState.rain>.18,snow=environmentState.weatherSnow>.2,fireworks=worldEvents.getSnapshot().active.some(event=>event.id==='FIREWORKS')
  if(fireworks!==fireworksActive.current){fireworksActive.current=fireworks;step.current++;choice.current=chooseResidentRoutine(spec,{hour,rain,snow,wind:environmentState.wind>.65,fireworks,step:step.current},previous.current);dwell.current=0}
  const current=choice.current,target=RESIDENT_POINTS[current.routeIndex]??RESIDENT_POINTS[spec.route[0]],distance=actor.current.position.distanceTo(target)
  if(dialogue){action.current='LOOK';holdPlayerForDialogue(player.current,actor.current.position,delta);tmp.current.copy(player.current.position).sub(actor.current.position).setY(0).normalize();actor.current.rotation.y=turnToward(actor.current.rotation.y,Math.atan2(tmp.current.x,tmp.current.z),delta)}
  else if(distance>.18){action.current=current.action==='RUN'?'RUN':'WALK';tmp.current.copy(target).sub(actor.current.position).setY(0).normalize();actor.current.position.addScaledVector(tmp.current,delta*spec.movement*(action.current==='RUN'?2.05:1));actor.current.position.y=surfaceHeight(actor.current.position.x,actor.current.position.z);actor.current.rotation.y=turnToward(actor.current.rotation.y,Math.atan2(tmp.current.x,tmp.current.z),delta)}
  else{dwell.current+=delta;action.current=current.activity==='FIREWORKS'?(Math.floor(clock.elapsedTime/3)%2?'REACT':'LOOK'):current.action;if(current.situation==='DROP_AND_RECOVER'){action.current=dwell.current<1.1?'REACT':dwell.current<2.1?'PICK_UP':'CARRY'}if(current.activity!=='FIREWORKS'&&dwell.current>=current.duration){previous.current=current.activity;step.current++;choice.current=chooseResidentRoutine(spec,{hour,rain,snow,wind:environmentState.wind>.65,fireworks,step:step.current},previous.current);dwell.current=0}}
  const playerDistance=actor.current.position.distanceTo(player.current.position),isNear=inRange(playerDistance,INTERACTION_RANGES.NPC.action,near.current),isAware=inRange(playerDistance,INTERACTION_RANGES.NPC.awareness,aware.current,.5)
  if(isAware!==aware.current){aware.current=isAware;if(isAware)reaction.current=.8}
  if(isNear!==near.current){near.current=isNear;if(isNear)aliveWorldStore.setRuntime({nearNpc:true,activeResident:id});else if(aliveWorldStore.getRuntime().activeResident===id)aliveWorldStore.setRuntime({nearNpc:false,npcOpen:false,activeResident:null})}
  if(reaction.current>0&&!dialogue){reaction.current-=delta;action.current='WAVE'}
  if(motion.current){const moving=action.current==='WALK'||action.current==='RUN',leaning=action.current==='INSPECT'||action.current==='PICK_UP',phase=clock.elapsedTime*(action.current==='RUN'?11:6.5);motion.current.position.y=moving?Math.abs(Math.sin(phase))*.052:Math.sin(phase*.28)*.016;motion.current.rotation.x=leaning?.16:action.current==='SIT'?.1:0;motion.current.rotation.z=action.current==='REACT'||action.current==='WAVE'?Math.sin(clock.elapsedTime*6)*.1:0;motion.current.rotation.y=action.current==='LOOK'?Math.sin(clock.elapsedTime*.65)*.09:0}
  if(carried.current)carried.current.visible=action.current==='CARRY'||action.current==='PLACE'||(id==='lumi'&&action.current!=='REACT'&&action.current!=='PICK_UP')
 })
 const start=RESIDENT_POINTS[spec.route[0]]
 return <group ref={actor} position={start.toArray()} onPointerDown={e=>{e.stopPropagation();blockWorldMovement(e.nativeEvent.pointerId);if(actor.current&&actor.current.position.distanceTo(player.current.position)<4)open()}} onPointerOver={e=>{e.stopPropagation();gl.domElement.style.setProperty('cursor','pointer')}} onPointerOut={()=>gl.domElement.style.removeProperty('cursor')}><ResidentVisual id={id} root={motion} carried={carried}/></group>
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
 const mode=useRendererMode(),state=useSyncExternalStore(aliveWorldStore.subscribe,aliveWorldStore.getSnapshot),actor=useRef<Group>(null),motion=useRef<Group>(null),action=useRef<NpcAction>('IDLE'),targetIndex=useRef(0),dwell=useRef(1.5),near=useRef(false),aware=useRef(false),noticeDwell=useRef(0),fireworksActive=useRef(false),nearSeed=useRef<string|null>(null),[nearSeedId,setNearSeedId]=useState<string|null>(null),[awareNpc,setAwareNpc]=useState(false),tmp=useRef(new Vector3()),{gl}=useThree()
 useEffect(()=>()=>{gl.domElement.style.removeProperty('cursor')},[gl])
 const runtime=aliveWorldStore.getRuntime()
 useEffect(()=>{if(mode!=='V4_COZY'||!runtime.nearNpc||runtime.activeResident!=='mallow'||runtime.npcOpen){contextAction.clear('mallow');return}const ready=state.lostSeeds.status==='RETURN';contextAction.set('mallow',{id:'mallow',kind:ready?'GIVE':'TALK',label:ready?'건네기':'말 걸기',priority:ready||state.lostSeeds.status==='AVAILABLE'?100:70,perform:()=>aliveWorldStore.setRuntime({npcOpen:true,activeResident:'mallow',notice:state.lostSeeds.status==='COMPLETE'?'ambient':null})});return()=>contextAction.clear('mallow')},[mode,runtime.nearNpc,runtime.activeResident,runtime.npcOpen,state.lostSeeds.status])
 useFrame(({clock},delta)=>{if(mode!=='V4_COZY'||!actor.current)return
  publishResidentPosition('mallow',actor.current.position)
  const dialogue=aliveWorldStore.getRuntime().npcOpen&&aliveWorldStore.getRuntime().activeResident==='mallow'
  const hour=worldTime.presentation.hour,rain=environmentState.rain>.18,night=hour>=20||hour<5,fireworks=worldEvents.getSnapshot().active.some(event=>event.id==='FIREWORKS')
  if(fireworks!==fireworksActive.current){fireworksActive.current=fireworks;dwell.current=0}
  const forced=rain?0:night?2:null;if(forced!==null)targetIndex.current=forced
  const target=fireworks?RESIDENT_POINTS[10]:ROUTE[targetIndex.current],distance=actor.current.position.distanceTo(target)
  if(dialogue){action.current=aliveWorldStore.getRuntime().notice==='complete'?'WAVE':'LOOK';holdPlayerForDialogue(player.current,actor.current.position,delta);tmp.current.copy(player.current.position).sub(actor.current.position).setY(0).normalize();actor.current.rotation.y=turnToward(actor.current.rotation.y,Math.atan2(tmp.current.x,tmp.current.z),delta)}
  else if(distance>.16){action.current=rain?'RUN':'WALK';tmp.current.copy(target).sub(actor.current.position).setY(0).normalize();actor.current.position.addScaledVector(tmp.current,delta*(rain?2.1:1.05));actor.current.position.y=surfaceHeight(actor.current.position.x,actor.current.position.z);actor.current.rotation.y=Math.atan2(tmp.current.x,tmp.current.z)}
  else{dwell.current-=delta;action.current=fireworks?(Math.floor(clock.elapsedTime/3)%2?'WAVE':'LOOK'):state.lostSeeds.status==='AVAILABLE'?'REACT':targetIndex.current===0?'WATER':targetIndex.current===1?'INSPECT':night?'LOOK':'IDLE';if(!fireworks&&dwell.current<=0&&forced===null){targetIndex.current=(targetIndex.current+1)%ROUTE.length;dwell.current=2.5+targetIndex.current*.7}}
  const playerDistance=actor.current.position.distanceTo(player.current.position),isNear=inRange(playerDistance,INTERACTION_RANGES.NPC.action,near.current)
  const isAware=inRange(playerDistance,INTERACTION_RANGES.NPC.awareness,aware.current,.5)
  if(isAware!==aware.current){aware.current=isAware;setAwareNpc(isAware)}
  if(isNear!==near.current){near.current=isNear;if(isNear){noticeDwell.current=.72;aliveWorldStore.setRuntime({nearNpc:true,activeResident:'mallow'})}else if(aliveWorldStore.getRuntime().activeResident==='mallow')aliveWorldStore.setRuntime({nearNpc:false,npcOpen:false,activeResident:null})}
  if(!dialogue&&noticeDwell.current>0){noticeDwell.current-=delta;action.current='REACT'}
  let nextSeed:string|null=null,nextDistance=INTERACTION_RANGES.COLLECTIBLE.action+.22;for(const seed of LOST_SEEDS){if(state.lostSeeds.collected.includes(seed.id))continue;const seedDistance=Math.hypot(player.current.position.x-seed.position.x,player.current.position.z-seed.position.z);if(inRange(seedDistance,INTERACTION_RANGES.COLLECTIBLE.action,nearSeed.current===seed.id)&&seedDistance<nextDistance){nextSeed=seed.id;nextDistance=seedDistance}}
  if(nextSeed!==nearSeed.current){nearSeed.current=nextSeed;setNearSeedId(nextSeed);aliveWorldStore.setRuntime({nearCollectible:!!nextSeed})}
  aliveWorldStore.setRuntime({npcAction:action.current})
  if(motion.current){const moving=action.current==='WALK'||action.current==='RUN',phase=clock.elapsedTime*(action.current==='RUN'?11:7);motion.current.position.y=moving?Math.abs(Math.sin(phase))*.055:Math.sin(phase*.22)*.018;motion.current.rotation.x=action.current==='INSPECT'?.15:0;motion.current.rotation.z=action.current==='REACT'||action.current==='WAVE'?Math.sin(clock.elapsedTime*7)*.11:0;motion.current.rotation.y=action.current==='LOOK'?Math.sin(clock.elapsedTime*.8)*.08:0}
 })
 if(mode!=='V4_COZY')return null
 const showPrompt=awareNpc&&(state.lostSeeds.status==='AVAILABLE'||state.lostSeeds.status==='RETURN')&&!runtime.npcOpen
 return <group name="AliveCuteWorldV1">
  <group ref={actor} position={[ROUTE[0].x,ROUTE[0].y,ROUTE[0].z]} onPointerDown={e=>{e.stopPropagation();blockWorldMovement(e.nativeEvent.pointerId);if(actor.current&&actor.current.position.distanceTo(player.current.position)<4)aliveWorldStore.setRuntime({nearNpc:true,npcOpen:true,activeResident:'mallow'})}} onPointerOver={e=>{e.stopPropagation();gl.domElement.style.setProperty('cursor','pointer')}} onPointerOut={()=>gl.domElement.style.removeProperty('cursor')}><MallowVisual root={motion}/>{showPrompt&&<group position={[0,2.45,0]}><WorldInteractionPrompt label="!" compact/></group>}</group>
  <ResidentActor id="pebble" player={player}/><ResidentActor id="lumi" player={player}/>
  {(state.lostSeeds.status==='ACTIVE'||state.lostSeeds.status==='RETURN')&&LOST_SEEDS.filter(seed=>!state.lostSeeds.collected.includes(seed.id)).map((seed,i)=><LostSeed key={seed.id} id={seed.id} position={seed.position} index={i} player={player} near={nearSeedId===seed.id}/>)}
 </group>
}
