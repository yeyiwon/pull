import { useEffect,useState,useSyncExternalStore } from 'react'
import { useRendererMode } from '../graphics/rendererV2.ts'
import { gardenStore,growthStage,PLANTS } from '../world/gardenState.ts'
import { worldTime } from '../world/worldTime.ts'
import { gameUiMode } from './gameUiMode.ts'

const feel=(kind:'seed'|'water'|'flower'|'soft'='soft')=>{if(!('vibrate'in navigator))return;navigator.vibrate(kind==='seed'?[5,24,8]:kind==='water'?[7,16,5]:kind==='flower'?[9,22,9]:8)}
function GardenHeader({title}:{title:string}){return <div className="garden-heading"><span><small>GARDEN</small><strong>{title}</strong></span></div>}
function Dismiss({close}:{close:()=>void}){return <button className="interaction-dismiss" aria-label="정원 닫기" onClick={close}/>}
export default function GardenContextUI(){
 const mode=useRendererMode(),state=useSyncExternalStore(gardenStore.subscribe,gardenStore.getSnapshot),selection=gardenStore.getSelection(),moving=gardenStore.getMoving(),[now,setNow]=useState(()=>Date.now())
 useEffect(()=>{const id=window.setInterval(()=>setNow(Date.now()),30_000);return()=>window.clearInterval(id)},[])
 useEffect(()=>{gameUiMode.set('garden',moving?'PLACEMENT':selection?'ITEM_PICKER':null);return()=>gameUiMode.set('garden',null)},[selection,moving])
 if(mode!=='V4_COZY'||!selection)return null
 const close=()=>gardenStore.select(null)
 if(selection.kind==='garden'){
  const plant=state.plants.find(p=>p.spotId===selection.spotId)
  const stage=plant&&growthStage(plant,now,worldTime.realWorld.season)
  return <><Dismiss close={close}/><aside className="garden-context" aria-live="polite"><button className="garden-close" onClick={close} aria-label="닫기">×</button>
   <GardenHeader title={plant?PLANTS.find(p=>p.id===plant.kind)?.name??'작은 꽃':'무엇을 심을까?'}/>
   {!plant&&<div className="garden-actions garden-items">{PLANTS.filter(p=>state.discovered.includes(p.id)).map(p=><button key={p.id} disabled={!state.seeds[p.id]} onClick={()=>{if(gardenStore.plant(selection.spotId,p.id)){feel('seed');close()}}}><span>{p.name}</span><em>{state.seeds[p.id]}</em></button>)}</div>}
   {plant&&<><p>{stage==='seed'?'흙 속에서 쉬는 중':stage==='sprout'?'작은 싹이 올라왔어':stage==='young'?'잎을 펼치는 중':plant.collectedAt?'꽃이 정원에 남아 있어':'활짝 피었어'}</p><div className="garden-actions garden-primary-actions"><button onClick={()=>{gardenStore.water(selection.spotId);feel('water');close()}}>물 주기</button>{stage==='bloom'&&!plant.collectedAt&&<button onClick={()=>{feel();if(gardenStore.collect(selection.spotId))close()}}>꽃 받기</button>}</div></>}
  </aside></>
 }
 const decor=state.decorations.find(d=>d.spotId===selection.spotId)
 return <><Dismiss close={close}/><aside className="garden-context" aria-live="polite"><button className="garden-close" onClick={close} aria-label="닫기">×</button><GardenHeader title={decor?'심어둔 꽃':'꽃심기'}/>
  {decor?<div className="garden-actions garden-primary-actions"><button onClick={()=>{feel();gardenStore.beginMove(selection.spotId);close()}}>옮기기</button><button onClick={()=>{feel();gardenStore.remove(selection.spotId);close()}}>치우기</button></div>:<div className="garden-actions garden-items">{moving?<button onClick={()=>{if(gardenStore.place(selection.spotId,'starbell')){feel('flower');close()}}}>여기로 옮기기</button>:PLANTS.filter(p=>state.inventory[p.id]>0).map(p=><button key={p.id} onClick={()=>{if(gardenStore.place(selection.spotId,p.id)){feel('flower');close()}}}><span>{p.name}</span><em>{state.inventory[p.id]}</em></button>)}{!moving&&state.inventory.starbell+state.inventory.moondrop+state.inventory.cloverlight===0&&<p>피어난 꽃을 받아오면 꾸밀 수 있어.</p>}</div>}
 </aside></>
}

export function GardenQAControls(){const state=useSyncExternalStore(gardenStore.subscribe,gardenStore.getSnapshot);return <fieldset className="garden-qa"><legend>Playable Garden v1</legend><p>{state.plants.length}/6 growing · {state.decorations.length}/10 placed</p><div><button onClick={()=>gardenStore.giveSeeds()}>Give Seeds</button><button onClick={()=>gardenStore.advance(3_600_000)}>+1h</button><button onClick={()=>gardenStore.advance(6*3_600_000)}>+6h</button><button onClick={()=>gardenStore.advance(24*3_600_000)}>+1d</button><button onClick={()=>gardenStore.waterAll()}>Trigger Rain Watering</button><button onClick={()=>gardenStore.clear()}>Clear Test Garden</button></div></fieldset>}
