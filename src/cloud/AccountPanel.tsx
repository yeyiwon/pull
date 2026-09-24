import { useState,useSyncExternalStore } from 'react'
import { cloudSync } from './sync.ts'
import { DISPLAY_NAME_MAX_LENGTH,todayDate,validateBirthday,validateDisplayName } from './profile.ts'

function birthdayLabel(value:string){const [,month,day]=value.split('-').map(Number);return `${month}월 ${day}일`}

export default function AccountPanel(){
 const account=useSyncExternalStore(cloudSync.subscribe,cloudSync.getSnapshot)
 const [editing,setEditing]=useState(false),[name,setName]=useState(''),[birthday,setBirthday]=useState(''),[pending,setPending]=useState(false),[error,setError]=useState('')
 if(!account.authenticated)return <section className="account-panel"><p className="section-label">Account</p><div className="account-row"><span>이 기기에 저장됨<small>메인 화면에서 계정을 연결할 수 있어요.</small></span><strong>Local</strong></div></section>
 if(!account.profile)return null
 const save=async()=>{if(!validateDisplayName(name)||!validateBirthday(birthday))return;setPending(true);setError('');try{await cloudSync.saveProfile({displayName:name,birthday});setEditing(false)}catch{setError('프로필을 저장하지 못했어요.')}finally{setPending(false)}}
 return <section className="account-panel"><p className="section-label">Account</p>{editing?<div className="account-profile-edit"><label>이름<input value={name} maxLength={DISPLAY_NAME_MAX_LENGTH} onChange={e=>setName(e.target.value)}/></label><label>생일<input type="date" value={birthday} max={todayDate()} onChange={e=>setBirthday(e.target.value)}/></label>{error&&<small role="alert">{error}</small>}<div><button onClick={()=>{setEditing(false);setError('')}}>취소</button><button onClick={()=>void save()} disabled={pending||!validateDisplayName(name)||!validateBirthday(birthday)}>{pending?'저장 중…':'저장'}</button></div></div>:<><div className="account-profile-summary"><strong>{account.profile.displayName}</strong><small>{account.email}</small><dl><div><dt>생일</dt><dd>{birthdayLabel(account.profile.birthday)}</dd></div><div><dt>동기화</dt><dd>{account.phase==='CLEAN'?'완료':account.message}</dd></div></dl></div><div className="account-actions"><button onClick={()=>{setName(account.profile!.displayName);setBirthday(account.profile!.birthday);setEditing(true)}}>프로필 수정</button><button className="account-logout" onClick={()=>void cloudSync.logout()}>로그아웃</button></div></>}</section>
}
