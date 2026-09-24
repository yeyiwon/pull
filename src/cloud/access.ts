import type { AccountSnapshot } from './sync.ts'
export function canEnterWorld(account:Pick<AccountSnapshot,'authenticated'|'profileRequired'|'developmentGuest'>){return account.developmentGuest||account.authenticated&&!account.profileRequired}
export function accountDestination(account:Pick<AccountSnapshot,'authenticated'|'profileRequired'|'profile'>){return !account.authenticated?'AUTH':account.profileRequired||!account.profile?'PROFILE':'WORLD'}
