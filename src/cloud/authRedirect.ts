const PRODUCTION_ORIGIN='https://pull-omega-steel.vercel.app'
const IOS_CALLBACK='com.yeiwon.pull://auth/callback'
const DEVELOPMENT_ORIGINS=new Set(['http://127.0.0.1:5173','http://localhost:5173'])

export type AuthRedirectEnvironment={native:boolean;development:boolean;origin:string}

export function resolveAuthRedirect({native,development,origin}:AuthRedirectEnvironment){
 if(native)return IOS_CALLBACK
 let currentOrigin=''
 try{currentOrigin=new URL(origin).origin}catch{/* Fall back to the trusted production origin. */}
 const trustedOrigin=currentOrigin===PRODUCTION_ORIGIN||(development&&DEVELOPMENT_ORIGINS.has(currentOrigin))
 return new URL('/auth/callback',trustedOrigin?currentOrigin:PRODUCTION_ORIGIN).toString()
}
