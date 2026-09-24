import { useState,useSyncExternalStore } from 'react'
import { cloudSync } from './sync.ts'

function birthdayLabel(value:string){const [,month,day]=value.split('-').map(Number);return `${month}월 ${day}일`}

export default function AccountPanel(){
 const account=useSyncExternalStore(cloudSync.subscribe,cloudSync.getSnapshot)
 const [pending,setPending]=useState(false)
 if(!account.authenticated||!account.profile)return null
 const logout=async()=>{if(pending)return;setPending(true);try{await cloudSync.logout()}finally{setPending(false)}}
 return <section className="menu-profile" aria-label="내 프로필">
  <div><span className="menu-profile-kicker">PROFILE</span><strong>{account.profile.displayName}</strong><small>생일 {birthdayLabel(account.profile.birthday)}</small></div>
  <button className={pending?'account-button-loading':''} disabled={pending} onClick={()=>void logout()}>{pending?'':'로그아웃'}</button>
 </section>
}
