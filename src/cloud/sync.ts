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
import { SupabaseProfileAdapter,type ProfileInput,type PullProfile } from './profile.ts'
import { setAccountIdentityContext } from './profileContext.ts'
import { authCooldownRemaining,classifyAuthRequestError,SafeAuthRequestError,startAuthCooldown } from './authRequest.ts'
import { authCallbackDiagnostics,createAuthCallbackHandler } from './authCallback.ts'
import { isPasswordRecoveryUrl,resolveAuthRedirect } from './authRedirect.ts'
import { isDevelopmentGuest } from './developmentAccess.ts'

export type AccountSnapshot={phase:SyncPhase;configured:boolean;initialized:boolean;email:string|null;authenticated:boolean;developmentGuest:boolean;profile:PullProfile|null;profileRequired:boolean;recoveryRequired:boolean;message:string;lastSync:string|null}
export type AuthIntent='login'|'signup'
const listeners=new Set<()=>void>(),guestKey='pull.cloud.guest.v1',cachePrefix='pull.cloud.account.'
const developmentGuest=isDevelopmentGuest(import.meta.env.DEV,window.location.href)
let state:AccountSnapshot={phase:'LOCAL',configured:cloudConfigured,initialized:developmentGuest||!cloudConfigured,email:null,authenticated:false,developmentGuest,profile:null,profileRequired:false,recoveryRequired:false,message:developmentGuest?'Development Guest':'계정 연결 필요',lastSync:null},currentUser:User|null=null,running:Promise<void>|null=null,periodic=0,lastSessionKey:string|null=null,sessionWork:Promise<void>|null=null
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
function syncNow(){if(!currentUser||!supabase||state.profileRequired||!state.profile)return Promise.resolve();if(running)return running;running=performSync(currentUser).catch(()=>{cloudDiagnostics.phase=navigator.onLine?'ERROR':'OFFLINE';cloudDiagnostics.lastResult=navigator.onLine?'sync failed':'offline';emit({phase:navigator.onLine?'ERROR':'OFFLINE',message:navigator.onLine?'동기화 대기 · 다시 시도':'오프라인 · 이 기기에 저장 중'})}).finally(()=>{running=null});return running}
async function handleSession(session:Session|null){
 const sessionKey=session?`${session.user.id}:${session.expires_at??0}`:'signed-out'
 if(lastSessionKey===sessionKey)return sessionWork??Promise.resolve()
 lastSessionKey=sessionKey
 sessionWork=applySession(session).finally(()=>{sessionWork=null})
 return sessionWork
}
async function applySession(session:Session|null){
 if(!session){currentUser=null;setAccountIdentityContext(null);Object.assign(cloudDiagnostics,{authenticated:false,authState:'SIGNED_OUT',cloudEnabled:false,userId:null,worldId:null,moruId:null,profileState:'UNKNOWN',phase:'LOCAL',lastResult:'Signed out'});emit({initialized:true,authenticated:false,email:null,profile:null,profileRequired:false,recoveryRequired:false,phase:'LOCAL',message:'계정 연결 필요'});return}
 currentUser=session.user;Object.assign(cloudDiagnostics,{authenticated:true,authState:'AUTHENTICATED',cloudEnabled:true,userId:safeShortId(session.user.id),profileState:'UNKNOWN'});emit({initialized:false,authenticated:true,email:session.user.email??'연결된 계정',profile:null,profileRequired:false,message:'프로필 확인 중…'})
 try{
  const found=supabase?await new SupabaseProfileAdapter(supabase).load(session.user):null
  if(!found){setAccountIdentityContext(null);cloudDiagnostics.profileState='REQUIRED';emit({initialized:true,profile:null,profileRequired:true,phase:'LOCAL',message:'프로필을 완성해 주세요.'});return}
  setAccountIdentityContext(found.displayName);cloudDiagnostics.profileState='READY';emit({initialized:false,profile:found,profileRequired:false});ensureGuestBackup();await syncNow();emit({initialized:true})
 }catch{setAccountIdentityContext(null);cloudDiagnostics.profileState='REQUIRED';emit({initialized:true,profile:null,profileRequired:true,phase:'ERROR',message:'프로필을 불러오지 못했어요. 다시 시도해 주세요.'})}
}
async function initialize(){
 cloudDiagnostics.configured=cloudConfigured
 if(developmentGuest){Object.assign(cloudDiagnostics,{authState:'GUEST',cloudEnabled:false,lastResult:'Development Guest'});return}
 if(!supabase)return;const client=supabase
 client.auth.onAuthStateChange((event,session)=>{if(event==='PASSWORD_RECOVERY')emit({recoveryRequired:true});window.setTimeout(()=>void handleSession(session),0)})
 const callback=createAuthCallbackHandler(code=>client.auth.exchangeCodeForSession(code),url=>window.history.replaceState({},document.title,url),session=>handleSession(session)),copyCallbackDiagnostics=()=>Object.assign(cloudDiagnostics,{callbackDetected:authCallbackDiagnostics.detected,pkceExchange:authCallbackDiagnostics.status,pkceFailure:authCallbackDiagnostics.failure})
 const processCallback=(url:string,source:'web'|'ios')=>{if(isPasswordRecoveryUrl(url))emit({recoveryRequired:true});return callback(url,source).then(()=>copyCallbackDiagnostics())}
 if(Capacitor.isNativePlatform())void App.addListener('appUrlOpen',({url})=>void processCallback(url,'ios'))
 else await processCallback(window.location.href,'web')
 copyCallbackDiagnostics()
 const {data}=await client.auth.getSession();cloudDiagnostics.sessionRestored=!!data.session&&!authCallbackDiagnostics.detected;await handleSession(data.session)
 window.addEventListener('online',()=>void syncNow());document.addEventListener('visibilitychange',()=>{if(document.hidden)void syncNow();else void syncNow()})
 periodic=window.setInterval(()=>{if(document.visibilityState==='visible')void syncNow()},60000)
}
void initialize()
export const cloudSync={
 subscribe(fn:()=>void){listeners.add(fn);return()=>listeners.delete(fn)},getSnapshot:()=>state,
 async login(email:string,password:string){if(!supabase)throw new SafeAuthRequestError('generic');ensureGuestBackup();try{const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;if(data.session)await handleSession(data.session)}catch(error){throw classifyAuthRequestError(error)}},
 async signup(email:string,password:string){if(!supabase)throw new SafeAuthRequestError('generic');ensureGuestBackup();const redirectTo=resolveAuthRedirect({native:Capacitor.isNativePlatform(),development:import.meta.env.DEV,origin:window.location.origin});try{const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:redirectTo}});if(error)throw error;if(!data.user)throw new SafeAuthRequestError('generic');if(data.user.identities?.length===0)throw new SafeAuthRequestError('account_exists');if(!data.session){startAuthCooldown();return{confirmationRequired:true}};await handleSession(data.session);return{confirmationRequired:false}}catch(error){throw classifyAuthRequestError(error)}},
 async requestPasswordReset(email:string){if(!supabase)throw new SafeAuthRequestError('generic');if(authCooldownRemaining()>0)throw new SafeAuthRequestError('cooldown');const redirectTo=resolveAuthRedirect({native:Capacitor.isNativePlatform(),development:import.meta.env.DEV,origin:window.location.origin},'recovery');try{const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo});if(error)throw error;startAuthCooldown()}catch(error){throw classifyAuthRequestError(error)}},
 async updatePassword(password:string){if(!supabase||!currentUser)throw new SafeAuthRequestError('generic');try{const {error}=await supabase.auth.updateUser({password});if(error)throw error;emit({recoveryRequired:false,message:'비밀번호가 변경됐어요.'});const url=new URL(window.location.href);url.searchParams.delete('flow');window.history.replaceState({},document.title,`${url.pathname}${url.search}${url.hash}`)}catch(error){throw classifyAuthRequestError(error)}},
 async saveProfile(input:ProfileInput){if(!supabase||!currentUser)throw Error('Account session unavailable');const saved=await new SupabaseProfileAdapter(supabase).save(currentUser,input);setAccountIdentityContext(saved.displayName);emit({initialized:false,profile:saved,profileRequired:false,phase:'LOCAL',message:'프로필이 저장됐어요.'});ensureGuestBackup();await syncNow();emit({initialized:true});return saved},
 async logout(){if(!supabase)return;await syncNow();await supabase.auth.signOut();currentUser=null;setAccountIdentityContext(null);restoreGuest();emit({authenticated:false,email:null,profile:null,profileRequired:false,recoveryRequired:false,phase:'LOCAL',message:'계정 연결 필요'})},
 syncNow,
 dispose(){if(periodic)window.clearInterval(periodic)},
}
