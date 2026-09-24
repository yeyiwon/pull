export type AccountIdentityContext={displayName:string}
let context:AccountIdentityContext|undefined
export function setAccountIdentityContext(displayName:string|null){context=displayName?{displayName}:undefined}
export function getAccountIdentityContext(){return context}
