import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import type { Session,User } from '@supabase/supabase-js'
import { bodySelection } from '../characters/bodySelection.ts'
import { getBackgroundWorld } from '../world/backgroundWorld.ts'
import { getMemorySession } from '../world/brain/memory.ts'
import { SupabaseCloudAdapter } from './adapter.ts'
import { cloudConfigured, supabase } from './client.ts'
import { cloudDiagnostics,readLocalSnapshot,safeShortId,sameSnapshotPayload,writeLocalSnapshot,type CloudIdentity,type PullCloudSnapshot,type SyncPhase } from './model.ts'
import { reconcileSnapshots } from './reconcile.ts'

type AccountSnapshot={phase:SyncPhase;configured:boolean;initialized:boolean;email:string|null;authenticated:boolean;message:string;lastSync:string|null}
export type AuthIntent='login'|'signup'
const listeners=new Set<()=>void>(),guestKey='pull.cloud.guest.v1',cachePrefix='pull.cloud.account.'
let state:AccountSnapshot={phase:'LOCAL',configured:cloudConfigured,initialized:!cloudConfigured,email:null,authenticated:false,message:cloudConfigured?'이 기기에 저장됨':'Cloud 설정 없음 · 이 기기에 저장됨',lastSync:null},currentUser:User|null=null,running:Promise<void>|null=null,periodic=0
function emit(patch:Partial<AccountSnapshot>){state={...state,...patch};listeners.forEach(fn=>fn())}
function storage(){try{return localStorage}catch{return null}}
function apply(snapshot:PullCloudSnapshot){const target=storage();if(!target)return;writeLocalSnapshot(target,snapshot);getMemorySession().replace(snapshot.moru);getBackgroundWorld().replace(snapshot.world);bodySelection.select(snapshot.appearance)}
function readCache(userId:string){try{return JSON.parse(storage()?.getItem(`${cachePrefix}${userId}`)??'null') as PullCloudSnapshot|null}catch{return null}}
function saveCache(snapshot:PullCloudSnapshot){try{storage()?.setItem(`${cachePrefix}${snapshot.identity.userId}`,JSON.stringify(snapshot))}catch{/* cache is optional */}}
function ensureGuestBackup(){const target=storage();if(!target||target.getItem(guestKey))return;const identity={userId:'guest',worldId:'guest',moruId:'guest'};target.setItem(guestKey,JSON.stringify(readLocalSnapshot(target,identity)))}
function restoreGuest(){try{const target=storage(),raw=target?.getItem(guestKey);if(target&&raw)apply(JSON.parse(raw))}catch{/* retain current local state */}}
function localFor(identity:CloudIdentity){const target=storage();if(!target)throw Error('Local storage unavailable');return readLocalSnapshot(target,identity)}
async function performSync(user:User){
 if(!supabase)return;const adapter=new SupabaseCloudAdapter(supabase),cached=readCache(user.id),fallbackIdentity=cached?.identity??{userId:user.id,worldId:'pending',moruId:'pending'}
 emit({phase:'SYNCING',message:'동기화 중…'});cloudDiagnostics.phase='SYNCING'
 let cloud=await adapter.load(user),local=localFor(cloud?.identity??fallbackIdentity)
 if(!cloud){ensureGuestBackup();cloud=await adapter.create(user,local);local={...local,identity:cloud.identity};const first=await adapter.sync(local);if(first.status==='conflict')throw Error('Initial cloud revision conflict');cloud={...local,revision:first.revision,simulationRevision:first.simulationRevision,serverUpdatedAt:first.serverUpdatedAt??new Date().toISOString()}}
 else{
  // A first login on this device restores the account World as-is. Guest data only becomes
  // canonical when this account has no World yet and bootstrap explicitly migrates it.
  if(!cached){apply(cloud);saveCache(cloud);const syncedAt=new Date().toISOString();Object.assign(cloudDiagnostics,{configured:true,authenticated:true,userId:safeShortId(user.id),worldId:safeShortId(cloud.identity.worldId),moruId:safeShortId(cloud.identity.moruId),cloudSchemaVersion:cloud.schemaVersion,localUpdatedAt:new Date(cloud.world.updatedAt).toISOString(),cloudUpdatedAt:cloud.serverUpdatedAt,phase:'CLEAN',lastSync:syncedAt,lastResult:'restored',pendingRecords:0});emit({phase:'CLEAN',message:'동기화됨',lastSync:syncedAt});return}
  const dirty=!cached||!sameSnapshotPayload(local,cached),cloudAdvanced=!cached||cloud.revision>cached.revision,merged=reconcileSnapshots({...local,identity:cloud.identity},cloud,dirty,cached?.revision??0)
  if(!dirty&&!cloudAdvanced){cloud=cached;apply(cloud);saveCache(cloud);const syncedAt=new Date().toISOString();Object.assign(cloudDiagnostics,{phase:'CLEAN',lastSync:syncedAt,lastResult:'up to date',pendingRecords:0});emit({phase:'CLEAN',message:'동기화됨',lastSync:syncedAt});return}
  if(!dirty&&cloudAdvanced){cloud=merged;apply(cloud);saveCache(cloud);const syncedAt=new Date().toISOString();Object.assign(cloudDiagnostics,{cloudSchemaVersion:cloud.schemaVersion,cloudUpdatedAt:cloud.serverUpdatedAt,phase:'CLEAN',lastSync:syncedAt,lastResult:'downloaded',pendingRecords:0});emit({phase:'CLEAN',message:'동기화됨',lastSync:syncedAt});return}
  const result=await adapter.sync(merged)
  if(result.status==='conflict'){cloudDiagnostics.conflicts++;const latest=await adapter.load(user);if(!latest)throw Error('Cloud state disappeared');const retry=reconcileSnapshots(merged,latest,true,cloud.revision),again=await adapter.sync(retry);if(again.status==='conflict')throw Error('Cloud changed during retry');cloud={...retry,revision:again.revision,simulationRevision:again.simulationRevision,serverUpdatedAt:again.serverUpdatedAt??latest.serverUpdatedAt}}
  else cloud={...merged,revision:result.revision,simulationRevision:result.simulationRevision,serverUpdatedAt:result.serverUpdatedAt??cloud.serverUpdatedAt}
 }
 apply(cloud);saveCache(cloud);const syncedAt=new Date().toISOString();Object.assign(cloudDiagnostics,{configured:true,authenticated:true,userId:safeShortId(user.id),worldId:safeShortId(cloud.identity.worldId),moruId:safeShortId(cloud.identity.moruId),cloudSchemaVersion:cloud.schemaVersion,localUpdatedAt:new Date(cloud.world.updatedAt).toISOString(),cloudUpdatedAt:cloud.serverUpdatedAt,phase:'CLEAN',lastSync:syncedAt,lastResult:'synced',pendingRecords:0})
 emit({phase:'CLEAN',message:'동기화됨',lastSync:syncedAt})
}
function syncNow(){if(!currentUser||!supabase)return Promise.resolve();if(running)return running;running=performSync(currentUser).catch(()=>{cloudDiagnostics.phase=navigator.onLine?'ERROR':'OFFLINE';cloudDiagnostics.lastResult=navigator.onLine?'sync failed':'offline';emit({phase:navigator.onLine?'ERROR':'OFFLINE',message:navigator.onLine?'동기화 대기 · 다시 시도':'오프라인 · 이 기기에 저장 중'})}).finally(()=>{running=null});return running}
async function handleSession(session:Session|null){
 if(!session){currentUser=null;Object.assign(cloudDiagnostics,{authenticated:false,userId:null,worldId:null,moruId:null,phase:'LOCAL',lastResult:'Local mode'});emit({initialized:true,authenticated:false,email:null,phase:'LOCAL',message:cloudConfigured?'이 기기에 저장됨':'Cloud 설정 없음 · 이 기기에 저장됨'});return}
 ensureGuestBackup();currentUser=session.user;emit({initialized:true,authenticated:true,email:session.user.email??'연결된 계정'});await syncNow()
}
async function initialize(){
 cloudDiagnostics.configured=cloudConfigured;if(!supabase)return;const client=supabase
 const {data}=await client.auth.getSession();await handleSession(data.session)
 client.auth.onAuthStateChange((_event,session)=>{window.setTimeout(()=>void handleSession(session),0)})
 window.addEventListener('online',()=>void syncNow());document.addEventListener('visibilitychange',()=>{if(document.hidden)void syncNow();else void syncNow()})
 periodic=window.setInterval(()=>{if(document.visibilityState==='visible')void syncNow()},60000)
 if(Capacitor.isNativePlatform())void App.addListener('appUrlOpen',({url})=>{const code=new URL(url).searchParams.get('code');if(code)void client.auth.exchangeCodeForSession(code)})
}
void initialize()
export const cloudSync={
 subscribe(fn:()=>void){listeners.add(fn);return()=>listeners.delete(fn)},getSnapshot:()=>state,
 async requestAuthLink(intent:AuthIntent,email:string){if(!supabase)throw Error('Cloud is not configured');ensureGuestBackup();const redirectTo=Capacitor.isNativePlatform()?'com.yeiwon.pull://auth/callback':window.location.origin;const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:redirectTo,shouldCreateUser:intent==='signup'}});if(error&&!(intent==='login'&&error.status===400))throw error;emit({message:'이메일의 인증 링크를 확인해 주세요.'})},
 async logout(){if(!supabase)return;await syncNow();await supabase.auth.signOut();currentUser=null;restoreGuest();emit({authenticated:false,email:null,phase:'LOCAL',message:'이 기기에 저장됨'})},
 syncNow,
 dispose(){if(periodic)window.clearInterval(periodic)},
}
