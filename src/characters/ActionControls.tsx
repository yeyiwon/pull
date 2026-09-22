import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import type { Player } from '../world/locomotion.ts'
import { worldInterface } from '../ui/interface.ts'
import { conversationSession } from '../conversation/session.ts'
import { MORU_ACTIONS } from './actions.ts'
import type { MoruActionId } from './actions.ts'
import { moru } from './expression.ts'

const dances = [
  ['bubbleDance', '둥실둥실'], ['funnyDance', '장난스럽게'],
  ['loveDance', '살랑살랑'], ['superloveDance', '마음껏'],
  ['podGroove', '작은 리듬'], ['youGroove', '함께 리듬'],
] as const
export default function ActionControls({disabled}:{player:RefObject<Player>;disabled:boolean}) {
  const [panel,setPanel]=useState<'special'|'dance'|null>(null)
  useEffect(()=>{
    if(panel)return
    const timer=window.setTimeout(()=>worldInterface.open(null),panel?20000:10000)
    return()=>window.clearTimeout(timer)
  },[panel])
  const perform=(id:MoruActionId)=>{if(moru.perform(id)&&!panel)worldInterface.open(null)}
  return <div className="moru-context" aria-label="모루와 함께">
    <div className="moru-context-row">
      <button disabled={disabled} onClick={()=>{worldInterface.open(null);conversationSession.open()}}>말 걸기</button>
      <button disabled={disabled} aria-label="춤 고르기" aria-expanded={panel==='dance'} onClick={()=>setPanel(panel==='dance'?null:'dance')}>♪</button>
      <button disabled={disabled} aria-label="특별한 움직임" aria-expanded={panel==='special'} onClick={()=>setPanel(panel==='special'?null:'special')}>···</button>
    </div>
    {panel==='dance'&&<div className="moru-dances" role="group" aria-label="춤 고르기">{dances.map(([id,label])=><button key={id} onClick={()=>perform(id)}>{label}</button>)}</div>}
    {panel==='special'&&<div className="moru-specials" role="group" aria-label="특별한 움직임">{MORU_ACTIONS.filter(a=>a.id==='skip'||a.id==='penguin').map(a=><button key={a.id} onClick={()=>perform(a.id)}>{a.label}</button>)}</div>}
  </div>
}
