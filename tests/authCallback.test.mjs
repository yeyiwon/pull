import test from 'node:test'
import assert from 'node:assert/strict'
import { authCallbackDiagnostics,createAuthCallbackHandler,sanitizedCallbackUrl } from '../src/cloud/authCallback.ts'
import { accountDestination,canEnterWorld } from '../src/cloud/access.ts'
import { SUPABASE_AUTH_OPTIONS } from '../src/cloud/authConfig.ts'
import { isDevelopmentGuest } from '../src/cloud/developmentAccess.ts'

test('PKCE callback invokes exchange exactly once and removes auth parameters',async()=>{
 let exchanges=0,cleaned=''
 const handle=createAuthCallbackHandler(async code=>{exchanges++;assert.equal(code,'one-time-code');return{}},url=>{cleaned=url})
 assert.equal(await handle('https://pull.example/callback?code=one-time-code&keep=yes','web'),true)
 assert.equal(await handle('https://pull.example/callback?code=one-time-code&keep=yes','web'),true)
 assert.equal(exchanges,1)
 assert.equal(cleaned,'/callback?keep=yes')
 assert.equal(authCallbackDiagnostics.status,'DUPLICATE')
})

test('successful exchange becomes authenticated and malformed callback fails without exchange',async()=>{
 let exchanges=0,authenticated=false
 const handle=createAuthCallbackHandler(async()=>{exchanges++;return{data:{session:{user:'test'}}}},()=>{},()=>{authenticated=true})
 await handle('https://pull.example/?code=valid','web')
 assert.equal(authCallbackDiagnostics.status,'SUCCESS')
 assert.equal(authenticated,true)
 await handle('https://pull.example/?error_description=missing-code','web')
 assert.equal(exchanges,1)
 assert.equal(authCallbackDiagnostics.status,'FAILURE')
 assert.equal(authCallbackDiagnostics.failure,'malformed_callback')
 assert.equal(JSON.stringify(authCallbackDiagnostics).includes('valid'),false)
})

test('account routing requires a profile while development guest can enter only in dev',()=>{
 assert.equal(accountDestination({authenticated:false,profileRequired:false,profile:null}),'AUTH')
 assert.equal(accountDestination({authenticated:true,profileRequired:true,profile:null}),'PROFILE')
 assert.equal(accountDestination({authenticated:true,profileRequired:false,profile:{displayName:'M',birthday:'2000-01-01'}}),'WORLD')
 assert.equal(canEnterWorld({authenticated:false,profileRequired:false,developmentGuest:true}),true)
 assert.equal(isDevelopmentGuest(true,'http://127.0.0.1:5173/?guest=1'),true)
 assert.equal(isDevelopmentGuest(false,'https://pull.example/?guest=1'),false)
})

test('Supabase session persistence is stable and URL auto-detection is disabled for explicit PKCE handling',()=>{
 assert.equal(SUPABASE_AUTH_OPTIONS.persistSession,true)
 assert.equal(SUPABASE_AUTH_OPTIONS.autoRefreshToken,true)
 assert.equal(SUPABASE_AUTH_OPTIONS.storageKey,'pull.auth.session')
 assert.equal(SUPABASE_AUTH_OPTIONS.detectSessionInUrl,false)
 assert.equal(sanitizedCallbackUrl('https://pull.example/?code=secret&tab=world'),'/?tab=world')
 assert.equal(sanitizedCallbackUrl('https://pull.example/#code=secret&tab=world'),'/#tab=world')
})
