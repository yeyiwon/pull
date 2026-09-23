import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import type { RefObject } from 'react'
import type { Player } from '../world/locomotion.ts'
import { worldInterface } from '../ui/interface.ts'
import { conversationSession } from './session.ts'
function clearControls(p:Player){p.keys.clear();p.touchX=0;p.touchZ=0;p.jumpRequested=false;p.listenRequested=false;p.actionRequested=null}
export default function ConversationInput({player,disabled}:{player:RefObject<Player>;disabled:boolean}){
 const state=useSyncExternalStore(conversationSession.subscribe,conversationSession.getSnapshot),[text,setText]=useState(''),input=useRef<HTMLInputElement>(null),form=useRef<HTMLFormElement>(null)
 const panel=useSyncExternalStore(worldInterface.subscribe,worldInterface.getSnapshot)
 const active=state.phase!=='closed'
 useEffect(()=>{
  if(!active)return
  const currentPlayer=player.current,formElement=form.current
  clearControls(currentPlayer)
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')conversationSession.cancel()}
  const viewport=window.visualViewport
  const resize=()=>form.current?.style.setProperty('--keyboard-offset',`${Math.max(0,window.innerHeight-(viewport?.height??window.innerHeight)-(viewport?.offsetTop??0))}px`)
  window.addEventListener('keydown',escape);viewport?.addEventListener('resize',resize);viewport?.addEventListener('scroll',resize);resize()
  return()=>{formElement?.style.removeProperty('--keyboard-offset');window.removeEventListener('keydown',escape);viewport?.removeEventListener('resize',resize);viewport?.removeEventListener('scroll',resize);clearControls(currentPlayer)}
 },[active,player])
 useEffect(()=>{if(state.phase==='composing')input.current?.focus();else input.current?.blur()},[state.phase])
 if(!active&&panel!==null)return null
 return <>
  {active&&<div className="conversation-shield" onPointerDown={()=>conversationSession.cancel()} aria-hidden="true"/>}
  <form ref={form} className="moru-conversation" data-active={active} aria-label="모루에게 말 걸기" onSubmit={async e=>{e.preventDefault();if(active&&await conversationSession.send(text))setText('')}}>
   <label className="sr-only" htmlFor="moru-message">모루에게 할 말</label>
   {!active&&<button type="button" className="conversation-launch" aria-label="모루와 대화" disabled={disabled||!state.ready} onClick={()=>{flushSync(()=>conversationSession.open());input.current?.focus()}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 18 3 21V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4H6Z"/><path d="M8 8h8M8 12h5"/></svg><span>대화</span></button>}
   <div className="conversation-fields" inert={!active} aria-hidden={!active}>
   <input id="moru-message" ref={input} value={text} onChange={e=>setText(e.target.value)} maxLength={280} autoComplete="off" enterKeyHint="send" placeholder="모루에게 한마디…" disabled={disabled||!state.ready||!active||state.phase!=='composing'}/>
   <button type="submit" disabled={!text.trim()||state.phase!=='composing'} aria-busy={state.phase==='thinking'} aria-label={state.phase==='thinking'?'모루 응답 기다리는 중':'말 보내기'}>{state.phase==='thinking'?<svg className="conversation-spinner" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M12 3a9 9 0 1 1-9 9"/></svg>:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="m6.5 10.5 5.5-5.5 5.5 5.5"/></svg>}</button>
   <button type="button" onClick={()=>conversationSession.cancel()} aria-label="대화 닫기"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M5 5 19 19M19 5 5 19"/></svg></button>
   </div>
   <span className="conversation-notice" role="status">{state.notice}</span>
  </form>
  <span className="sr-only" role="status" aria-live="polite">{state.phase==='speaking'?state.reply:''}</span>
 </>
}
