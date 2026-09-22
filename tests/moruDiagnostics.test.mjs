import test from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { safeDiagnosticIdentifier, startDiagnostic } from '../server/conversationDiagnostics.ts'
import { conversationAPI } from '../server/viteConversation.ts'

test('diagnostic identifiers reject credentials, headers, multiline content and secret settings',()=>{
 for(const value of ['sk-test-secret','Bearer-secret','Authorization','private@example.com','hello world','line\nbreak'])assert.equal(safeDiagnosticIdentifier(value),null)
 const settings={OPENAI_API_KEY:'private-key',MORU_OPENAI_MODEL:'private-key',MORU_OPENAI_REASONING_EFFORT:'private-key'}
 const diagnostic=startDiagnostic(settings,()=>{})
 assert.equal(diagnostic.data.model,null);assert.equal(diagnostic.data.reasoningEffort,null)
 assert.equal(safeDiagnosticIdentifier('invalid_api_key'),'invalid_api_key')
})
test('local adapter failures are diagnosed before provider invocation without logging request headers',async()=>{
 const logs=[];let middleware;let status;let fetchCalls=0
 const savedFetch=globalThis.fetch
 globalThis.fetch=async()=>{fetchCalls++;throw Error('No network permitted')}
 try{
  const plugin=conversationAPI({MORU_PROVIDER:'REAL',OPENAI_API_KEY:'test-private-key',MORU_OPENAI_MODEL:'test-model'})
  plugin.configureServer({config:{logger:{info:line=>logs.push(JSON.parse(line.slice('[moru-conversation] '.length)))}},middlewares:{use:(_path,fn)=>{middleware=fn}}})
  const request=Readable.from([Buffer.from('{}')]);request.method='POST';request.headers={host:'[invalid',authorization:'test-private-key','content-type':'application/json'}
  const response={writableEnded:false,on(){},writeHead(code){status=code},end(){this.writableEnded=true}}
  await middleware(request,response)
  assert.equal(status,503);assert.equal(fetchCalls,0);assert.equal(logs.length,1)
  assert.equal(logs[0].stage,'local_adapter');assert.equal(logs[0].reachedProvider,false);assert.equal(logs[0].errorType,'TypeError');assert.equal(logs[0].errorCode,'ERR_INVALID_URL')
  assert.equal(JSON.stringify(logs).includes('test-private-key'),false)
 }finally{globalThis.fetch=savedFetch}
})
