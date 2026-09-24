import { useSyncExternalStore } from 'react'
import { cloudSync } from './sync.ts'

export default function AccountPanel(){
 const account=useSyncExternalStore(cloudSync.subscribe,cloudSync.getSnapshot)
 if(!account.authenticated)return <section className="account-panel"><p className="section-label">Account</p><div className="account-row"><span>이 기기에 저장됨<small>메인 화면에서 계정을 연결할 수 있어요.</small></span><strong>Local</strong></div></section>
 return <section className="account-panel"><p className="section-label">Account</p><div className="account-row"><span>{account.email}<small>{account.phase==='CLEAN'?'동기화됨':account.message}</small></span>{account.lastSync&&<strong>최근 동기화</strong>}</div><div className="account-actions"><button onClick={()=>void cloudSync.syncNow()} disabled={account.phase==='SYNCING'}>지금 동기화</button><button className="account-logout" onClick={()=>void cloudSync.logout()}>로그아웃</button></div></section>
}
