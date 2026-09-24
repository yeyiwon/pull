import test from 'node:test'
import assert from 'node:assert/strict'
import {authRequestMessage,classifyAuthRequestError} from '../src/cloud/authRequest.ts'

test('auth request errors map to safe user-facing categories',()=>{
 const limited=classifyAuthRequestError({status:429,code:'over_email_send_rate_limit',message:'raw provider detail'})
 assert.equal(limited.category,'rate_limit')
 assert.equal(authRequestMessage(limited),'인증 메일을 너무 자주 요청했어요. 잠시 후 다시 시도해 주세요.')
 assert.equal(authRequestMessage({status:500,message:'private detail'}).includes('private detail'),false)
})
