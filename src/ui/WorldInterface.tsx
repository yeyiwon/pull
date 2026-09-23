import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { RefObject } from 'react'
import type { Player } from '../world/locomotion.ts'
import { worldInterface } from './interface.ts'
import WorldClock from '../world/WorldClock.tsx'
import AudioControls from '../audio/AudioControls.tsx'
import GraphicsControls from '../graphics/GraphicsControls.tsx'
import ActionControls from '../characters/ActionControls.tsx'
import BrainInspector from '../world/brain/BrainInspector.tsx'
import CharacterInspector from '../characters/CharacterInspector.tsx'
import { moru } from '../characters/expression.ts'
import { conversationSession } from '../conversation/session.ts'
function moruAttention(){moru.perform('listen','user',false)}
function clearMovement(p:Player){p.keys.clear();p.touchX=0;p.touchZ=0;p.jumpRequested=false}
function jump(p:Player){p.jumpRequested=true}
function openPanel(panel:Parameters<typeof worldInterface.open>[0]){if(conversationSession.getSnapshot().phase!=='closed')conversationSession.cancel();worldInterface.open(panel)}
const labels={menu:'Menu',world:'World',moru:'Moru',music:'Music',display:'Settings',controls:'Controls',conversations:'Memories',debug:'Studio'}
const titles={menu:'Menu',world:'World',moru:'Moru',music:'Music',display:'Settings',controls:'Controls',conversations:'Memories',debug:'Studio'}
export default function WorldInterface({player,ready,theme,onThemeChange}:{player:RefObject<Player>;ready:boolean;theme:'dark'|'light';onThemeChange:(theme:'dark'|'light')=>void}){
 useEffect(()=>{
  if(!import.meta.env.DEV)return
  const key=(e:KeyboardEvent)=>{if(e.code==='KeyH'&&e.shiftKey&&!(e.target instanceof HTMLElement&&e.target.closest('input,textarea,[contenteditable]'))){e.preventDefault();document.documentElement.classList.toggle('frame-review')}}
  window.addEventListener('keydown',key)
  return()=>{window.removeEventListener('keydown',key);document.documentElement.classList.remove('frame-review')}
 },[])
 const requestedPanel=useSyncExternalStore(worldInterface.subscribe,worldInterface.getSnapshot)
 const [panel,setPanel]=useState(requestedPanel)
 const [gesturesSeen,setGesturesSeen]=useState(false)
 if(requestedPanel==='moru'&&!gesturesSeen)setGesturesSeen(true)
 // Keep the outgoing surface mounted only for its exit transition.
 if(requestedPanel!==null&&requestedPanel!==panel)setPanel(requestedPanel)
 const closing=requestedPanel===null&&panel!==null
 useEffect(()=>{
  if(!closing)return
  const delay=window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:220
  const timer=window.setTimeout(()=>setPanel(null),delay)
  return()=>window.clearTimeout(timer)
 },[closing,requestedPanel])
 const conversation=useSyncExternalStore(conversationSession.subscribe,conversationSession.getSnapshot)
 const [musicSlot,setMusicSlot]=useState<HTMLElement|null>(null),[muted,setMuted]=useState(false)
 const sheet=useRef<HTMLDivElement>(null),body=useRef<HTMLDivElement>(null),swipe=useRef(0)
 const close=()=>worldInterface.open(null)
 useEffect(()=>{if(conversation.phase!=='closed')worldInterface.open(null)},[conversation.phase])
 useEffect(()=>{
  if(!requestedPanel)return
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null
  clearMovement(player.current)
  body.current?.scrollTo({top:0})
  sheet.current?.focus({preventScroll:true})
  const key=(e:KeyboardEvent)=>{
   if(e.key==='Escape'){e.preventDefault();worldInterface.open(null);return}
   if(e.key==='Tab'){
    const items=Array.from(sheet.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select,summary,[tabindex="0"]')??[]).filter(item=>item.getClientRects().length>0)
    const first=items[0],last=items.at(-1)
    if(e.shiftKey&&(document.activeElement===first||document.activeElement===sheet.current)){e.preventDefault();last?.focus()}
    else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===sheet.current)){e.preventDefault();first?.focus()}
   }
   // Menu keys must never become world movement; native focus/navigation still works.
   e.stopPropagation()
  }
  window.addEventListener('keydown',key,true)
  return()=>{window.removeEventListener('keydown',key,true);if(previous?.isConnected)previous.focus()}
 },[requestedPanel,player])
 return <>
  {ready&&!gesturesSeen&&!panel&&conversation.phase==='closed'&&<button className="moru-discovery-hint" onClick={()=>{moruAttention();openPanel('moru')}}>모루를 톡 눌러 몸짓 보기</button>}
  <header className="pull-header"><span className="pull-wordmark">PULL<span className="arc-mark" aria-hidden="true"/></span><WorldClock player={player} mode="status"/>
   <nav aria-label="세계 메뉴"><button aria-label={muted?'소리 켜기':'소리 끄기'} aria-pressed={muted} data-muted={muted} title={muted?'소리 켜기':'소리 끄기'} onClick={()=>setMuted(value=>!value)}>♪</button><button aria-label="메뉴 열기" aria-expanded={requestedPanel!==null} onClick={()=>openPanel(panel?null:'menu')}><span className="menu-lines" aria-hidden="true"/></button></nav>
  </header>
  <AudioControls mode={panel==='music'?'panel':'hidden'} slot={musicSlot} muted={muted} onMute={setMuted}/>
  {!panel&&conversation.phase==='closed'&&<button className="touch-jump" aria-label="점프" disabled={!ready} onClick={()=>jump(player.current)}>↑</button>}
  {panel&&<div className="interface-layer" data-closing={closing} inert={closing} aria-hidden={closing}>
   <button className="interface-scrim" aria-label="세계로 돌아가기" onClick={close}/>
   <div ref={sheet} className="interface-sheet" data-panel={panel} role="dialog" aria-modal="true" aria-label={labels[panel]} tabIndex={-1}>
    <div key={panel} className="sheet-content">
    <div className="sheet-fixed-header">
    <div className="sheet-handle" onPointerDown={e=>{swipe.current=e.clientY}} onPointerUp={e=>{if(e.clientY-swipe.current>45)close()}} aria-hidden="true"/>
    <div className="sheet-eyebrow"><button onClick={()=>panel==='menu'?close():worldInterface.open('menu')} aria-label={panel==='menu'?'메뉴 닫기':'메뉴로 돌아가기'}>{panel==='menu'?<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg>:<><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m14 6-6 6 6 6M8 12h12"/></svg></>}</button><h1>{titles[panel]}</h1></div>
    </div>
    <div ref={body} className="sheet-scroll-body">
    {panel==='menu'&&<nav className="editorial-menu" aria-label="메뉴 항목">{([['world','World','시간 · 계절 · 날씨'],['conversations','Memories','모루와 나눈 이야기'],['music','Music','지금 이 순간의 소리'],['display','Settings','화면 · 조작']] as const).map(([id,title,note])=><button key={id} onClick={()=>worldInterface.open(id)}><span>{title}<em>{note}</em></span></button>)}</nav>}
    {panel==='conversations'&&<div className="conversation-history">{conversationSession.getHistory().length?conversationSession.getHistory().map((turn,index)=><div className="conversation-history-turn" key={index}><p className="conversation-history-user">{turn.user}</p><p className="conversation-history-moru">{turn.moru}</p></div>):<p className="sheet-intro">아직 모루와 나눈 이야기가 없어요.</p>}<p className="sheet-intro">이 기기에만 저장돼요. 이전에 저장되지 않았던 대화는 표시할 수 없어요.</p></div>}
    {panel==='world'&&<><WorldClock player={player} mode="panel"/><p className="section-label">Display quality</p><GraphicsControls diagnostics={false}/></>}
    {panel==='music'&&<div ref={setMusicSlot} id="music-panel-slot"/>}
    {panel==='moru'&&<ActionControls player={player} disabled={!ready||!conversation.ready}/>}
    {panel==='display'&&<><fieldset className="theme-picker"><legend>Appearance</legend><div>{(['light','dark'] as const).map(value=><button key={value} aria-pressed={theme===value} onClick={()=>onThemeChange(value)}>{value==='light'?'Light':'Dark'}<small>{value==='light'?'맑고 부드럽게':'차분하고 깊게'}</small></button>)}</div><p>메뉴와 채팅의 테마예요. 세계의 시간은 그대로 유지돼요.</p></fieldset><GraphicsControls/><button className="text-link" onClick={()=>worldInterface.open('controls')}>Controls<span>조작 안내</span></button></>}
    {panel==='controls'&&<div className="control-guide"><p><span>이동</span>WASD / 방향키 · 터치 스틱</p><p><span>달리기</span>Shift · 스틱 바깥쪽</p><p><span>둘러보기</span>화면 드래그</p><p><span>점프</span>Space · ↑</p><p><span>인사 / 춤</span>1 / 2</p><p><span>반응</span>E · 모루 메뉴</p><p className="sheet-intro">움직이면 현재 행동을 멈추고 따라가요.</p></div>}
    {panel==='debug'&&<div className="studio-controls"><WorldClock player={player} mode="debug"/><GraphicsControls/><BrainInspector/><CharacterInspector/></div>}
    {import.meta.env.DEV&&panel==='menu'&&<button className="studio-link" onClick={()=>worldInterface.open('debug')}>개발 도구</button>}
    </div>
    </div>
   </div>
  </div>}
 </>
}
