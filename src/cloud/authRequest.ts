export const AUTH_EMAIL_COOLDOWN_MS=60_000
export const AUTH_PASSWORD_MIN_LENGTH=8
export function isValidAuthPassword(value:string){return value.length>=AUTH_PASSWORD_MIN_LENGTH}
export type AuthRequestErrorCategory='rate_limit'|'cooldown'|'network'|'invalid_credentials'|'email_unconfirmed'|'weak_password'|'account_exists'|'generic'
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
 if(value.code==='invalid_credentials')return new SafeAuthRequestError('invalid_credentials')
 if(value.code==='email_not_confirmed')return new SafeAuthRequestError('email_unconfirmed')
 if(value.code==='weak_password')return new SafeAuthRequestError('weak_password')
 if(value.code==='user_already_exists'||value.code==='email_exists')return new SafeAuthRequestError('account_exists')
 if(error instanceof TypeError)return new SafeAuthRequestError('network')
 return new SafeAuthRequestError('generic')
}
export function authRequestMessage(error:unknown){
 const category=classifyAuthRequestError(error).category
 if(category==='rate_limit'||category==='cooldown')return '인증 메일을 너무 자주 요청했어요. 잠시 후 다시 시도해 주세요.'
 if(category==='network')return '네트워크 연결을 확인한 뒤 다시 시도해 주세요.'
 if(category==='invalid_credentials')return '이메일 또는 비밀번호를 확인해 주세요.'
 if(category==='email_unconfirmed')return '이메일 확인이 아직 완료되지 않았어요.'
 if(category==='weak_password')return '비밀번호는 8자 이상으로 설정해 주세요.'
 if(category==='account_exists')return '이미 계정이 있다면 로그인하거나 비밀번호를 재설정해 주세요.'
 return '요청을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.'
}
