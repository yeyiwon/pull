import { Capacitor } from '@capacitor/core'

const PRODUCTION_BACKEND_ORIGIN='https://pull-omega-steel.vercel.app'

export type BackendEndpointCategory='SAME_ORIGIN'|'PULL_PRODUCTION'

export function resolveBackendEndpoint(path:string,native=Capacitor.isNativePlatform()){
 if(!path.startsWith('/api/'))throw Error('Invalid backend path')
 return native?new URL(path,PRODUCTION_BACKEND_ORIGIN).href:path
}

export function backendEndpointCategory(native=Capacitor.isNativePlatform()):BackendEndpointCategory{
 return native?'PULL_PRODUCTION':'SAME_ORIGIN'
}
