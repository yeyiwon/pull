export type AuthCallbackSource='web'|'ios'
export type AuthCallbackStatus='IDLE'|'ATTEMPTED'|'SUCCESS'|'FAILURE'|'DUPLICATE'
export type AuthCallbackFailure='provider_error'|'malformed_callback'|'exchange_failed'|null

export type AuthCallbackDiagnostics={
 detected:boolean
 source:AuthCallbackSource|null
 status:AuthCallbackStatus
 failure:AuthCallbackFailure
}

export const authCallbackDiagnostics:AuthCallbackDiagnostics={detected:false,source:null,status:'IDLE',failure:null}

const authParams=['code','error','error_code','error_description'] as const
function hashParams(url:URL){return url.hash.includes('=')?new URLSearchParams(url.hash.slice(1)):new URLSearchParams()}

export function sanitizedCallbackUrl(rawUrl:string){
 const url=new URL(rawUrl)
 for(const name of authParams)url.searchParams.delete(name)
 const hash=hashParams(url)
 if(authParams.some(name=>hash.has(name))){for(const name of authParams)hash.delete(name);url.hash=hash.size?`#${hash}`:''}
 return `${url.pathname}${url.search}${url.hash}`
}

export function createAuthCallbackHandler<T>(exchange:(code:string)=>Promise<{error?:unknown;data?:{session?:T|null}}>,cleanWebUrl:(url:string)=>void=()=>{},onSession:(session:T)=>void|Promise<void>=()=>{}){
 const handled=new Set<string>(),pending=new Set<string>()
 return async(rawUrl:string,source:AuthCallbackSource)=>{
  let url:URL
  try{url=new URL(rawUrl)}catch{return false}
  const hash=hashParams(url),code=url.searchParams.get('code')||hash.get('code'),providerError=url.searchParams.get('error')||url.searchParams.get('error_code')||hash.get('error')||hash.get('error_code'),hasAuthParam=authParams.some(name=>url.searchParams.has(name)||hash.has(name))
  if(!hasAuthParam)return false
  Object.assign(authCallbackDiagnostics,{detected:true,source,failure:null})
  const clean=()=>{if(source==='web')cleanWebUrl(sanitizedCallbackUrl(rawUrl))}
  if(providerError){Object.assign(authCallbackDiagnostics,{status:'FAILURE',failure:'provider_error'});clean();return true}
  if(!code){Object.assign(authCallbackDiagnostics,{status:'FAILURE',failure:'malformed_callback'});clean();return true}
  if(handled.has(code)||pending.has(code)){Object.assign(authCallbackDiagnostics,{status:'DUPLICATE',failure:null});clean();return true}
  pending.add(code);Object.assign(authCallbackDiagnostics,{status:'ATTEMPTED',failure:null})
  try{
   const result=await exchange(code)
   if(result.error)throw result.error
   if(result.data?.session)await onSession(result.data.session)
   handled.add(code);Object.assign(authCallbackDiagnostics,{status:'SUCCESS',failure:null})
  }catch{Object.assign(authCallbackDiagnostics,{status:'FAILURE',failure:'exchange_failed'})}
  finally{pending.delete(code);clean()}
  return true
 }
}
