import test from 'node:test'
import assert from 'node:assert/strict'
import {authRequestMessage,classifyAuthRequestError,isValidAuthPassword} from '../src/cloud/authRequest.ts'

test('auth request errors map to safe user-facing categories',()=>{
 const limited=classifyAuthRequestError({status:429,code:'over_email_send_rate_limit',message:'raw provider detail'})
 assert.equal(limited.category,'rate_limit')
 assert.equal(authRequestMessage(limited),'인증 메일을 너무 자주 요청했어요. 잠시 후 다시 시도해 주세요.')
 assert.equal(authRequestMessage({code:'invalid_credentials'}),'이메일 또는 비밀번호를 확인해 주세요.')
 assert.equal(authRequestMessage({code:'weak_password'}),'비밀번호는 8자 이상으로 설정해 주세요.')
 assert.equal(authRequestMessage({status:500,message:'private detail'}).includes('private detail'),false)
 assert.equal(isValidAuthPassword('1234567'),false)
 assert.equal(isValidAuthPassword('12345678'),true)
})
