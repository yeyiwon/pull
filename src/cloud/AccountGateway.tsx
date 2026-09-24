import { useState,useSyncExternalStore } from 'react'
import type { FormEvent } from 'react'
import { cloudSync,type AuthIntent } from './sync.ts'
import LandingBackdrop from './LandingBackdrop.tsx'

type View='entry'|AuthIntent|'sent'

export default function AccountGateway(){
 const account=useSyncExternalStore(cloudSync.subscribe,cloudSync.getSnapshot)
 const [view,setView]=useState<View>('entry'),[intent,setIntent]=useState<AuthIntent>('login'),[email,setEmail]=useState(''),[sentEmail,setSentEmail]=useState(''),[pending,setPending]=useState(false),[activating,setActivating]=useState(false),[error,setError]=useState('')
 if(!account.initialized||account.authenticated)return null
 const open=(next:AuthIntent)=>{setIntent(next);setView(next);setError('')}
 const enterLogin=()=>{if(activating)return;setActivating(true);window.setTimeout(()=>{open('login');setActivating(false)},360)}
 const send=async(e?:FormEvent)=>{e?.preventDefault();const normalized=email.trim().toLowerCase();if(!normalized||pending)return;setPending(true);setError('');try{await cloudSync.requestAuthLink(intent,normalized);setSentEmail(normalized);setView('sent')}catch{setError('인증 메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.')}finally{setPending(false)}}
 return <div className="account-gateway" role="dialog" aria-modal="true" aria-label="PULL 시작">
  <div className="account-gateway-backdrop" aria-hidden="true"><LandingBackdrop/><i className="account-gateway-mist"/></div>
  <section className="account-gateway-card">
   <div className="account-gateway-logo" aria-label="PULL"><span>P</span><span>U</span><span>L</span><span>L</span><i/></div>
   {view==='entry'&&<div className="account-gateway-entry"><p className="account-gateway-tagline">A world that pulls you in.</p>{account.configured?<><button className="account-gateway-login" data-activating={activating} onClick={enterLogin}>LOGIN</button><button className="account-gateway-create" onClick={()=>open('signup')}>SIGN UP</button></>:<p className="account-error" role="alert">계정 연결을 준비하지 못했어요.</p>}</div>}
   {(view==='login'||view==='signup')&&<form key={view} className="account-gateway-form" onSubmit={send}><button type="button" className="account-gateway-back" onClick={()=>setView('entry')} aria-label="첫 화면으로 돌아가기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6.5 9 12l5.5 5.5"/><path d="M9.5 12H19"/></svg><span>BACK</span></button><div><h1>{view==='signup'?'SIGN UP':'LOGIN'}</h1></div><label>이메일<input type="email" autoComplete="email" placeholder="you@example.com" aria-label="계정 이메일" value={email} onChange={e=>setEmail(e.target.value)} autoFocus/></label><button className="account-gateway-primary" disabled={pending||!email.trim()}>{pending?'보내는 중…':view==='signup'?'인증 메일 받기':'로그인 링크 받기'}</button><button type="button" className="account-gateway-switch" onClick={()=>open(view==='signup'?'login':'signup')}>{view==='signup'?'LOGIN':'SIGN UP'}</button></form>}
   {view==='sent'&&<div className="account-gateway-sent"><h1>이메일을 확인해 주세요</h1><p><b>{sentEmail}</b>으로<br/>인증 링크를 보냈어요.</p><small>{intent==='login'?'등록된 계정이라면 로그인 링크가 도착해요.':'링크를 열면 지금의 모루가 같은 계정에 연결돼요.'}</small><div className="account-gateway-secondary"><button onClick={()=>void send()} disabled={pending}>{pending?'보내는 중…':'다시 보내기'}</button><button onClick={()=>{setEmail(sentEmail);setView(intent)}}>이메일 변경</button></div></div>}
   {error&&<p className="account-error" role="alert">{error}</p>}
  </section>
 </div>
}
