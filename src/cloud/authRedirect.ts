const PRODUCTION_ORIGIN='https://pull-omega-steel.vercel.app'
const IOS_CALLBACK='com.yeiwon.pull://auth/callback'
const DEVELOPMENT_ORIGINS=new Set(['http://127.0.0.1:5173','http://localhost:5173'])

export type AuthRedirectEnvironment={native:boolean;development:boolean;origin:string}

export function isPasswordRecoveryUrl(rawUrl:string){
 try{
  const url=new URL(rawUrl),hash=new URLSearchParams(url.hash.startsWith('#')?url.hash.slice(1):url.hash)
  return url.searchParams.get('flow')==='recovery'||url.searchParams.get('type')==='recovery'||hash.get('type')==='recovery'
 }catch{return false}
}

export function resolveAuthRedirect({native,development,origin}:AuthRedirectEnvironment,flow:'auth'|'recovery'='auth'){
 if(native)return flow==='recovery'?`${IOS_CALLBACK}?flow=recovery`:IOS_CALLBACK
 let currentOrigin=''
 try{currentOrigin=new URL(origin).origin}catch{/* Fall back to the trusted production origin. */}
 const trustedOrigin=currentOrigin===PRODUCTION_ORIGIN||(development&&DEVELOPMENT_ORIGINS.has(currentOrigin))
 const callback=new URL('/auth/callback',trustedOrigin?currentOrigin:PRODUCTION_ORIGIN)
 if(flow==='recovery')callback.searchParams.set('flow','recovery')
 return callback.toString()
}
