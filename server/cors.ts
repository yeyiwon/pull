export const CAPACITOR_IOS_ORIGIN='capacitor://localhost'

export function isAllowedRequestOrigin(request:Request){
 const origin=request.headers.get('origin')
 return !origin||origin===new URL(request.url).origin||origin===CAPACITOR_IOS_ORIGIN
}

export function apiResponseHeaders(request:Request):Record<string,string>{
 const origin=request.headers.get('origin')
 return {
  'Cache-Control':'no-store',
  ...(origin===CAPACITOR_IOS_ORIGIN?{
   'Access-Control-Allow-Origin':CAPACITOR_IOS_ORIGIN,
   'Access-Control-Allow-Methods':'POST, OPTIONS',
   'Access-Control-Allow-Headers':'Content-Type',
   'Vary':'Origin',
  }:{}),
 }
}

export function corsPreflight(request:Request){
 if(request.method!=='OPTIONS')return null
 return new Response(null,{status:isAllowedRequestOrigin(request)?204:403,headers:apiResponseHeaders(request)})
}
