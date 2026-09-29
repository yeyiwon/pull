import { useEffect,useRef,useState,useSyncExternalStore } from 'react'
import type { CSSProperties } from 'react'
import { useRendererMode } from '../graphics/rendererV2.ts'
import { aliveWorldStore } from '../world/aliveWorldState.ts'
import { gardenStore } from '../world/gardenState.ts'
import { gameUiMode } from './gameUiMode.ts'
import { environmentState } from '../world/environmentState.ts'
import { worldTime } from '../world/worldTime.ts'
import { RESIDENTS,residentDialogue,type ResidentId } from '../world/residentLife.ts'

const haptic=(pattern:number|number[])=>{if('vibrate'in navigator)navigator.vibrate(pattern)}
function TypedLine({children}:{children:string}){const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches,[shown,setShown]=useState(reduced?children:'');useEffect(()=>{if(reduced)return;let index=0;const id=window.setInterval(()=>{index++;setShown(children.slice(0,index));if(index>=children.length)window.clearInterval(id)},24);return()=>window.clearInterval(id)},[children,reduced]);return <p className="typed-line" onPointerDown={event=>{event.stopPropagation();if(shown.length<children.length)setShown(children)}}>{shown}<i className="dialogue-caret" aria-hidden="true"/></p>}
export default function AliveWorldUI(){
 const mode=useRendererMode(),state=useSyncExternalStore(aliveWorldStore.subscribe,aliveWorldStore.getSnapshot),runtime=aliveWorldStore.getRuntime(),garden=useSyncExternalStore(gardenStore.subscribe,gardenStore.getSnapshot),[reward,setReward]=useState(false),[progressVisible,setProgressVisible]=useState(false),[ambientLine,setAmbientLine]=useState('오늘은 강물 소리가 가까이 들려.'),[talks,setTalks]=useState<Record<ResidentId,number>>({mallow:0,pebble:0,lumi:0}),previousCount=useRef(state.lostSeeds.collected.length),lastAmbient=useRef(-1)
 void garden
 useEffect(()=>{if(!reward)return;const id=window.setTimeout(()=>setReward(false),2400);return()=>window.clearTimeout(id)},[reward])
 useEffect(()=>{gameUiMode.set('npc',runtime.npcOpen?'CONVERSATION':null);return()=>gameUiMode.set('npc',null)},[runtime.npcOpen])
 useEffect(()=>{const count=state.lostSeeds.collected.length;if(count<=previousCount.current){previousCount.current=count;return}previousCount.current=count;setProgressVisible(true);const id=window.setTimeout(()=>setProgressVisible(false),1800);return()=>window.clearTimeout(id)},[state.lostSeeds.collected.length])
 useEffect(()=>{if(!runtime.npcOpen||!runtime.activeResident)return;const id=runtime.activeResident;queueMicrotask(()=>setTalks(current=>({...current,[id]:current[id]+1})));if(id!=='mallow'||state.lostSeeds.status!=='COMPLETE'||runtime.notice==='complete')return;const hour=worldTime.presentation.hour,raining=environmentState.rain>.18,snowing=environmentState.snow>.18;const lines=snowing?['눈이 쌓이면 강가 소리가 조금 조용해져.','오늘 발자국은 오래 남을 것 같아.']:raining?['빗소리를 듣고 있으면 씨앗도 안심하는 것 같아.','비가 그치면 정원 냄새가 더 선명해져.']:hour>=20||hour<5?['밤에는 다리 불빛이 물 위에서 길어 보여.','별이 밝은 날은 강물이 천천히 흐르는 것 같아.']:['오늘은 강물 소리가 가까이 들려.','정원 쪽에 햇빛이 오래 머물고 있어.','조금 걷다가 다시 여기서 쉬려고 해.'];let index=(lastAmbient.current+1)%lines.length;if(index===lastAmbient.current&&lines.length>1)index=(index+1)%lines.length;lastAmbient.current=index;setAmbientLine(lines[index])},[runtime.npcOpen,runtime.activeResident,runtime.notice,state.lostSeeds.status])
 if(mode!=='V4_COZY'||gardenStore.getSelection())return null
 const mission=state.lostSeeds
 const residentId=runtime.activeResident??'mallow',resident=RESIDENTS.find(item=>item.id===residentId)!,close=()=>aliveWorldStore.setRuntime({npcOpen:false,notice:null})
 const residentStyle={'--npc-body':resident.palette.body,'--npc-accent':resident.palette.accent,'--npc-detail':resident.palette.detail} as CSSProperties
 const residentLine=residentId==='mallow'?'':residentDialogue(residentId,{hour:worldTime.presentation.hour,rain:environmentState.rain>.18,snow:environmentState.weatherSnow>.2,favorite:runtime.notice==='river-watch'||residentId==='lumi',repeated:talks[residentId]>1})
 const complete=()=>{if(!aliveWorldStore.complete())return;gardenStore.grantSeed('cloverlight',2);aliveWorldStore.setRuntime({notice:'complete',npcOpen:true});haptic([12,40,18]);setReward(true)}
 return <>
  {mission.status==='ACTIVE'&&progressVisible&&<div className="mission-peek" aria-live="polite"><i/>{mission.collected.length} / 3</div>}
  {runtime.nearNpc&&runtime.npcOpen&&<button className="interaction-dismiss" aria-label="대화 닫기" onClick={close}/>}
  {runtime.nearNpc&&runtime.npcOpen&&<aside className="npc-context" data-resident={residentId} data-expression={residentId!=='mallow'?'happy':mission.status==='COMPLETE'?'happy':mission.status==='AVAILABLE'?'worried':mission.status==='RETURN'?'surprised':'thinking'} style={residentStyle} aria-live="polite"><button className="npc-context-close" aria-label="닫기" onClick={close}>×</button><div className="npc-speaker"><span aria-hidden="true"><b/><b/><i/></span><small>{resident.name.toUpperCase()}</small></div>{residentId!=='mallow'?<><strong>{residentId==='pebble'&&runtime.notice==='river-watch'?'같이 보고 있었구나.':residentId==='pebble'?'강가에서 만났네.':'정리하다 잠깐 쉬는 중이야.'}</strong><TypedLine key={`${residentId}-${residentLine}`}>{residentLine}</TypedLine></>:mission.status==='AVAILABLE'?<><strong>씨앗 주머니가 풀려버렸어.</strong><TypedLine key="available">근처에 흩어진 씨앗 세 알을 같이 찾아줄래?</TypedLine><button onClick={()=>{haptic(8);aliveWorldStore.begin();aliveWorldStore.setRuntime({npcOpen:false})}}>응, 같이 찾아보자</button></>:mission.status==='RETURN'?<><strong>다 찾았구나!</strong><TypedLine key="return">고마워. 정원에 심을 클로버빛 씨앗을 나눠줄게.</TypedLine><button onClick={complete}>씨앗 받기</button></>:mission.status==='COMPLETE'&&runtime.notice==='complete'?<><strong>다시 잘 챙겨둘게.</strong><TypedLine key="complete">클로버빛 씨앗은 네 정원에서 더 예쁘게 필 거야.</TypedLine><button onClick={close}>좋아</button></>:mission.status==='COMPLETE'?<><strong>잠깐 쉬고 있었어.</strong><TypedLine key={ambientLine}>{ambientLine}</TypedLine></>:<><strong>반짝이는 소리가 들려.</strong><TypedLine key="active">집 앞이랑 강가 가까이를 살펴보면 찾을 수 있을 거야.</TypedLine></>}</aside>}
  {reward&&<div className="mission-reward" role="status"><span>✦</span><strong>클로버빛 씨앗 × 2</strong><small>정원에 작은 변화가 남았어.</small></div>}
 </>
}

export function AliveWorldQAControls(){const state=useSyncExternalStore(aliveWorldStore.subscribe,aliveWorldStore.getSnapshot),runtime=aliveWorldStore.getRuntime();return <fieldset className="garden-qa"><legend>Alive & Cute World v1</legend><p>{state.lostSeeds.status} · seeds {state.lostSeeds.collected.length}/3 · Mallow {runtime.npcAction}</p><div><button onClick={()=>aliveWorldStore.begin()}>Start Lost Seeds</button><button onClick={()=>aliveWorldStore.reset()}>Reset Mission</button></div></fieldset>}
