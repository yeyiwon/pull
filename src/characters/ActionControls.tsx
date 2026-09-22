import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { Player } from '../world/locomotion.ts'
import { MORU_ACTIONS } from './actions.ts'
import { moru } from './expression.ts'

function requestJump(player:Player){player.jumpRequested=true}

type Panel = 'gesture' | 'dance' | 'react'
export default function ActionControls({player,disabled}:{player:RefObject<Player>;disabled:boolean}) {
  const [panel,setPanel]=useState<Panel|null>(null),root=useRef<HTMLDivElement>(null)
  useEffect(()=>{
    if(!panel)return
    const outside=(e:PointerEvent)=>{if(e.target instanceof Node&&!root.current?.contains(e.target))setPanel(null)}
    const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setPanel(null)}
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape)
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)}
  },[panel])
  return <div className="moru-actions" aria-label="Moru actions" ref={root}>
    {panel&&<div className="moru-action-panel" role="group" aria-label={panel==='dance'?'Dance actions':panel==='gesture'?'Gesture actions':'Moru reactions'}>
      {panel==='react'?<>
        <button onClick={()=>{moru.react('love');setPanel(null)}}>♡ 마음 전하기</button>
        <button onClick={()=>{moru.react('curious');setPanel(null)}}>? 궁금해</button>
        <button onClick={()=>{moru.react('happy');setPanel(null)}}>✦ 신나</button>
      </>:MORU_ACTIONS.filter(a=>a.category===panel).map(a=><button key={a.id} onClick={()=>{moru.perform(a.id);setPanel(null)}}>{a.label}</button>)}
    </div>}
    <button className="touch-jump" aria-label="Jump" disabled={disabled} onClick={()=>requestJump(player.current)}>↑</button>
    {([['react','♡','React'],['gesture','☺','Actions'],['dance','♫','Dance']] as const).map(([id,icon,label])=><button key={id} disabled={disabled} aria-label={label} title={label} aria-expanded={panel===id} onClick={()=>setPanel(panel===id?null:id)}>{icon}</button>)}
  </div>
}
