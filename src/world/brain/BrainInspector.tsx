import { conversationProvider } from '../../conversation/provider.ts'
import { useEffect, useState } from 'react'
import { conversationSession } from '../../conversation/session.ts'
import { brainDebug, brainCommands } from './mind.ts'
import { autonomyDebug } from '../autonomy.ts'
import { backgroundDiagnostics,getBackgroundWorld } from '../backgroundWorld.ts'
import { enableRemotePush,notificationDiagnostics,testLocalNotification,testRemoteNotificationCopy } from '../../native/notifications.ts'
export default function BrainInspector(){
 const [snapshot,setSnapshot]=useState(()=>structuredClone(brainDebug)),[text,setText]=useState(''),[pending,setPending]=useState(false)
 useEffect(()=>{const timer=setInterval(()=>setSnapshot(structuredClone(brainDebug)),1000);return()=>clearInterval(timer)},[])
 return <details className="brain-inspector" style={{zIndex:20,maxHeight:"70vh",overflowY:"auto"}}><summary>Moru Brain</summary>
  <div>Brain v3 Phase 1 · {snapshot.ticks} semantic ticks</div>
  {Object.entries(snapshot.state).map(([name,value])=><div key={name}>{name}: {value.toFixed(2)}</div>)}
  <div>Attention: {snapshot.attention}</div><div>Intent: {snapshot.intent}</div>
  <div>Observe: {snapshot.observation}</div><div>Decision: {snapshot.decision}</div><div>Cooldown: {snapshot.cooldown}s</div>
  <div>Speech: {snapshot.recentSpeech.slice(-3).join(' / ')||'—'}</div><div>Actions: {snapshot.recentActions.slice(-3).join(' / ')||'—'}</div>
  {import.meta.env.DEV&&<details><summary>Embodied Autonomy</summary><pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(autonomyDebug,null,2)}</pre></details>}
  {import.meta.env.DEV&&<details><summary>Background World</summary>
   <div>{[30,120,480,1440].map(minutes=><button key={minutes} onClick={()=>{getBackgroundWorld().simulate(minutes*60000);setSnapshot(structuredClone(brainDebug))}}>+{minutes<60?`${minutes} min`:`${minutes/60} hours`}</button>)}</div>
   <button onClick={()=>void testLocalNotification(backgroundDiagnostics.lastCandidate??undefined)}>Test local notification</button>
   <button disabled={!backgroundDiagnostics.lastCandidate} onClick={()=>{const candidate=backgroundDiagnostics.lastCandidate;if(candidate)void testRemoteNotificationCopy(candidate)}}>Test REAL notification copy</button>
   <button onClick={()=>void enableRemotePush()}>Enable remote push</button>
   <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify({background:backgroundDiagnostics,notifications:notificationDiagnostics,state:getBackgroundWorld().state},null,2)}</pre>
  </details>}
  <div>Memory: {snapshot.events.slice(-3).map(e=>e.event).join(" / ")||"—"}</div>
  {import.meta.env.DEV&&snapshot.interests&&<details><summary>Current Fascination / Curiosity Queue / Research Journal</summary>
   <div>Current Fascination: {snapshot.interests.fascination?.topic??'—'}</div>
   <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(snapshot.interests.fascination,null,2)}</pre>
   <div>Curiosity Queue</div><pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(snapshot.interests.queue,null,2)}</pre>
   <div>Research Journal</div><pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(snapshot.interests.journal,null,2)}</pre>
  </details>}
  <button onClick={()=>brainCommands.trigger?.()}>Evaluate reaction</button>
  <form onSubmit={async e=>{e.preventDefault();if(!brainCommands.converse||pending)return;setPending(true);try{await brainCommands.converse(text);setText('')}finally{setPending(false)}}}>
   <input size={17} aria-label="Moru conversation preview" maxLength={280} value={text} onChange={e=>setText(e.target.value)} placeholder="Local conversation hook"/>
   <button disabled={pending||!text.trim()}>Send locally</button>
  </form>
  <label>Conversation provider <select aria-label="Conversation provider" defaultValue="AUTO" onChange={e=>{conversationProvider.mode=e.target.value as 'AUTO'|'MOCK'|'REAL'}}><option>AUTO</option><option>MOCK</option><option>REAL</option></select></label>
  <div>Last provider: {conversationProvider.lastProvider} · REAL requires server configuration</div>
  {import.meta.env.DEV&&<details><summary>Request routing (no provider)</summary>
   <button onClick={()=>void conversationProvider.probe()}>Probe adapter route</button>
   <button onClick={()=>void conversationProvider.probe(true)}>Probe direct route</button>
   <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(conversationProvider.routingTrace,null,2)}</pre>
  </details>}
  <details><summary>Conversation debug</summary><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{JSON.stringify({phase:conversationSession.getSnapshot().phase,...conversationSession.debug},null,2)}</pre></details>
  <details><summary>Decision log</summary>{snapshot.log.map((line,i)=><div key={i}>{line}</div>)}</details>
 </details>
}
