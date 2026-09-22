import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { RefObject } from 'react'
import type { Player } from '../world/locomotion.ts'
import { conversationSession } from './session.ts'
function clearControls(p:Player){p.keys.clear();p.touchX=0;p.touchZ=0;p.jumpRequested=false;p.listenRequested=false;p.actionRequested=null}
export default function ConversationInput({player,disabled}:{player:RefObject<Player>;disabled:boolean}){
 const state=useSyncExternalStore(conversationSession.subscribe,conversationSession.getSnapshot),[text,setText]=useState(''),input=useRef<HTMLInputElement>(null),form=useRef<HTMLFormElement>(null)
 const active=state.phase!=='closed'
 useEffect(()=>{
  if(!active)return
  const currentPlayer=player.current
  clearControls(currentPlayer)
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')conversationSession.cancel()}
  const viewport=window.visualViewport
  const resize=()=>form.current?.style.setProperty('--keyboard-offset',`${Math.max(0,window.innerHeight-(viewport?.height??window.innerHeight)-(viewport?.offsetTop??0))}px`)
  window.addEventListener('keydown',escape);viewport?.addEventListener('resize',resize);viewport?.addEventListener('scroll',resize);resize()
  return()=>{window.removeEventListener('keydown',escape);viewport?.removeEventListener('resize',resize);viewport?.removeEventListener('scroll',resize);clearControls(currentPlayer)}
 },[active,player])
 useEffect(()=>{if(state.phase==='composing')input.current?.focus();else input.current?.blur()},[state.phase])
 if(!active)return null
 return <>
  <div className="conversation-shield" onPointerDown={()=>conversationSession.cancel()} aria-hidden="true"/>
  <form ref={form} className="moru-conversation" aria-label="모루에게 말 걸기" onSubmit={async e=>{e.preventDefault();if(await conversationSession.send(text))setText('')}}>
   <label className="sr-only" htmlFor="moru-message">모루에게 할 말</label>
   <input id="moru-message" ref={input} value={text} onChange={e=>setText(e.target.value)} maxLength={280} autoComplete="off" enterKeyHint="send" placeholder="모루에게 말하기…" disabled={disabled||state.phase!=='composing'}/>
   <button type="submit" disabled={!text.trim()||state.phase!=='composing'} aria-label="말 보내기"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m4 12 15-7-5.5 14-2.2-6.3L4 12Z"/><path d="m11.3 12.7 7.7-7.7"/></svg></button>
   <button type="button" onClick={()=>conversationSession.cancel()} aria-label="대화 닫기"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M5 5 19 19M19 5 5 19"/></svg></button>
   <span className="conversation-notice" role="status">{state.notice}</span>
  </form>
  <span className="sr-only" role="status" aria-live="polite">{state.phase==='speaking'?state.reply:''}</span>
 </>
}
