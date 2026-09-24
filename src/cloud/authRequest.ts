export const AUTH_EMAIL_COOLDOWN_MS=60_000
export type AuthRequestErrorCategory='rate_limit'|'cooldown'|'network'|'generic'
export class SafeAuthRequestError extends Error{
 category:AuthRequestErrorCategory
 constructor(category:AuthRequestErrorCategory){super(category);this.category=category}
}
let cooldownUntil=0
export function authCooldownRemaining(now=Date.now()){return Math.max(0,Math.ceil((cooldownUntil-now)/1000))}
export function startAuthCooldown(now=Date.now()){cooldownUntil=Math.max(cooldownUntil,now+AUTH_EMAIL_COOLDOWN_MS)}
export function classifyAuthRequestError(error:unknown){
 if(error instanceof SafeAuthRequestError)return error
 const value=error&&typeof error==='object'?error as {status?:unknown;code?:unknown}:{}
 if(value.status===429||value.code==='over_email_send_rate_limit'){startAuthCooldown();return new SafeAuthRequestError('rate_limit')}
 if(error instanceof TypeError)return new SafeAuthRequestError('network')
 return new SafeAuthRequestError('generic')
}
export function authRequestMessage(error:unknown){
 const category=classifyAuthRequestError(error).category
 if(category==='rate_limit'||category==='cooldown')return '인증 메일을 너무 자주 요청했어요. 잠시 후 다시 시도해 주세요.'
 if(category==='network')return '네트워크 연결을 확인한 뒤 다시 시도해 주세요.'
 return '인증 메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.'
}
