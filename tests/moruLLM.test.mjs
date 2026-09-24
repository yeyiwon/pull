import test from 'node:test'
import assert from 'node:assert/strict'
import {createConversationHandler,validateContext,promptContext,responseSchema} from '../server/moruConversation.ts'
import {conversationPayload} from '../src/conversation/transport.ts'
import {ServerConversationProvider} from '../src/conversation/provider.ts'
import {backendEndpointCategory,resolveBackendEndpoint} from '../src/api/backend.ts'
import {createMoruMind} from '../src/world/brain/mind.ts'
const context={userMessage:'뭐 하고 있어?',world:{season:'winter',timeOfDay:'NIGHT',weather:'snow',location:'water',indoor:false,nearWater:true,skyEvent:null},moru:{energy:.5,curiosity:.8,comfort:.7,attention:.6,affection:.5,sleepiness:.3,target:'USER'},recentConversation:[],recentEvents:[{key:'private-date',at:100,event:'snow'}]}
const req=(payload=conversationPayload(context),extra={})=>new Request('http://localhost/api/moru-conversation',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost'},body:JSON.stringify(payload),...extra})
const envelope=raw=>Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:typeof raw==='string'?raw:JSON.stringify(raw)}]}]})
const valid={speech:'눈 오는 물가 보고 있었어.',emotion:'calm',attention:'WATER',action:'listen',emote:null}
const real={MORU_PROVIDER:'REAL',OPENAI_API_KEY:'test-only-not-a-real-key',MORU_OPENAI_MODEL:'test-model-a'}
test('outbound payload picks only approved fields and eight session turns',()=>{
 const c=structuredClone(context);c.world.browser='secret';c.moru.file='secret';c.recentEvents.push({event:'invented-file-path',key:'private',at:1});c.recentConversation=Array.from({length:12},(_,i)=>({user:String(i),moru:'응',extra:'secret'}))
 const p=conversationPayload(c);assert.equal(p.recentConversation.length,8);assert.equal(p.recentConversation[0].user,'4');assert.deepEqual(p.recentEvents,[{event:'snow'}]);assert.equal(JSON.stringify(p).includes('secret'),false);assert.equal(JSON.stringify(p).includes('private'),false);assert.equal('skyEvent' in p.world,false);assert.equal('target' in p.moru,false)
})
test('server repicks context and semantic levels without fabricated events',()=>{const p=conversationPayload(context);p.unrelatedLogs='private';const c=validateContext(p);assert.deepEqual(promptContext(c).recentEvents,[{event:'snow'}]);assert.equal(promptContext(c).moru.curiosity,'high');assert.equal('unrelatedLogs' in c,false);assert.throws(()=>validateContext({...p,recentEvents:[{event:'fake rain'}]}))})
test('profile context carries only a bounded display name',()=>{const p=conversationPayload({...context,user:{displayName:'예이원'}});assert.deepEqual(p.user,{displayName:'예이원'});assert.deepEqual(validateContext(p).user,{displayName:'예이원'});assert.equal(JSON.stringify(p).includes('birthday'),false);assert.throws(()=>validateContext({...p,user:{displayName:'가'.repeat(41)}}))})
test('no key and MOCK mode never call external provider',async()=>{for(const settings of [{MORU_PROVIDER:'REAL',MORU_OPENAI_MODEL:'test-model-a'},{...real,MORU_PROVIDER:'MOCK'}]){let calls=0;const h=createConversationHandler(settings,async()=>{calls++;throw Error()});const r=await(await h(req())).json();assert.equal(r.provider,'MOCK');assert.equal(calls,0)}})
test('valid structured response uses fixed destination and minimum context',async()=>{let body;const h=createConversationHandler(real,async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');body=JSON.parse(options.body);return envelope(valid)});const r=await(await h(req())).json();assert.equal(r.provider,'REAL');assert.equal(r.response.action,'listen');assert.equal(body.store,false);assert.equal(body.max_output_tokens,350);assert.deepEqual(body.text.format.schema,responseSchema);assert.equal(JSON.parse(body.input).world.weather,'snow');assert.equal(JSON.stringify(body).includes('private-date'),false)})
test('invalid optional values are dropped while valid speech survives both boundaries',async()=>{const h=createConversationHandler(real,async()=>envelope({...valid,action:'talk',attention:'INVENTED',emote:'explode',emotion:'evil'}));const r=await(await h(req())).json();assert.equal(r.response.speech,valid.speech);assert.equal(r.response.action,null);assert.equal(r.response.emote,null);assert.equal(r.response.emotion,null);assert.equal(r.response.attention,'USER')})
test('malformed JSON, overlong speech, provider failure and refusal fall back',async()=>{for(const fake of [async()=>envelope('{'),async()=>envelope({...valid,speech:'가'.repeat(121)}),async()=>{throw Error('do not expose provider details')},async()=>Response.json({status:'incomplete'}),async()=>new Response('',{status:429})]){const r=await(await createConversationHandler(real,fake)(req())).json();assert.equal(r.provider,'FALLBACK');assert.ok(r.response.speech.length<=120);assert.equal(JSON.stringify(r).includes('provider details'),false)}})
test('provider timeout aborts outbound fetch and returns local speech',async()=>{let aborted=false;const h=createConversationHandler(real,(_u,{signal})=>new Promise((_ok,fail)=>{signal.addEventListener('abort',()=>{aborted=true;fail(Error('timeout'))})}),5);const r=await(await h(req())).json();assert.equal(aborted,true);assert.equal(r.provider,'FALLBACK')})
test('method, origin, oversized body, invalid context fail before outbound fetch',async()=>{let calls=0;const h=createConversationHandler(real,async()=>{calls++;return envelope(valid)});for(const [request,status]of [[new Request('http://localhost/api/moru-conversation'),405],[req(undefined,{headers:{Origin:'https://elsewhere','Content-Type':'application/json'}}),403],[req({junk:'x'.repeat(13000)}),413],[req({world:{}}),400]])assert.equal((await h(request)).status,status);assert.equal(calls,0)})
test('Capacitor iOS uses the production backend and receives narrowly scoped CORS',async()=>{
 assert.equal(resolveBackendEndpoint('/api/moru-conversation',false),'/api/moru-conversation')
 assert.equal(resolveBackendEndpoint('/api/moru-conversation',true),'https://pull-omega-steel.vercel.app/api/moru-conversation')
 assert.equal(backendEndpointCategory(true),'PULL_PRODUCTION')
 const h=createConversationHandler({...real,MORU_PROVIDER:'MOCK'},async()=>{throw Error('must not call')})
 const preflight=await h(new Request('https://pull-omega-steel.vercel.app/api/moru-conversation',{method:'OPTIONS',headers:{Origin:'capacitor://localhost','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}}))
 assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),'capacitor://localhost');assert.equal(preflight.headers.get('access-control-allow-headers'),'Content-Type')
 const response=await h(new Request('https://pull-omega-steel.vercel.app/api/moru-conversation',{method:'POST',headers:{Origin:'capacitor://localhost','Content-Type':'application/json'},body:JSON.stringify(conversationPayload(context))}))
 assert.equal(response.status,200);assert.equal(response.headers.get('access-control-allow-origin'),'capacitor://localhost')
 const denied=await h(new Request('https://pull-omega-steel.vercel.app/api/moru-conversation',{method:'OPTIONS',headers:{Origin:'https://elsewhere'}}));assert.equal(denied.status,403);assert.equal(denied.headers.get('access-control-allow-origin'),null)
})
test('instance request cap bounds repeated direct requests',async()=>{const h=createConversationHandler(real,async()=>envelope(valid));for(let i=0;i<12;i++)assert.equal((await h(req())).status,200);assert.equal((await h(req())).status,429)})
test('client offline/HTML/invalid response fallback and cancellation',async()=>{
 for(const fake of [async()=>{throw Error('offline')},async()=>new Response('<html>'),async()=>Response.json({response:{speech:'x'.repeat(121)}})]){const p=new ServerConversationProvider(fake);const r=await p.respond(context,new AbortController().signal);assert.ok(r.speech);assert.equal(p.lastProvider,'FALLBACK')}
 const abort=new AbortController();abort.abort();const p=new ServerConversationProvider(async()=>{throw Error('aborted')});await assert.rejects(p.respond(context,abort.signal))
})
test('MOCK switch performs no HTTP request',async()=>{let calls=0;const p=new ServerConversationProvider(async()=>{calls++;throw Error()});p.mode='MOCK';await p.respond(context,new AbortController().signal);assert.equal(calls,0)})
test('local Brain conversation hold suppresses ambient and resumes without any LLM adapter',()=>{
 const emitted=[];const brain=createMoruMind({random:()=>0,execute:i=>{emitted.push(i);return {action:i.action,speech:i.speech,emote:!!i.emote}}});const o={...context.world,date:'2026-09-22',hour:23,wind:0,userMoving:false,userIdleDuration:20,userInteracted:false,userReturned:false,actionBusy:false,grounded:true,recentMoruActions:[],recentSpeech:[]};brain.holdConversation(true);for(let i=0;i<20;i++)brain.tick(o,1);assert.equal(emitted.length,0);brain.holdConversation(false);for(let i=0;i<100;i++)brain.tick(o,1);assert.ok(emitted.length>0);brain.dispose()
})

test('missing, empty and whitespace model never select a hidden fallback',async()=>{
 for(const model of [undefined,'','   ']){
  let calls=0
  const h=createConversationHandler({...real,MORU_OPENAI_MODEL:model},async()=>{calls++;return envelope(valid)})
  assert.equal((await(await h(req())).json()).provider,'MOCK');assert.equal(calls,0)
 }
})
test('model configuration changes only the model field, preserving schema and context',async()=>{
 const bodies=[]
 for(const model of ['test-model-a','test-model-b']){
  const h=createConversationHandler({...real,MORU_OPENAI_MODEL:` ${model} `},async(_url,options)=>{bodies.push(JSON.parse(options.body));return envelope(valid)})
  assert.equal((await(await h(req())).json()).provider,'REAL')
 }
 assert.equal(bodies[0].model,'test-model-a');assert.equal(bodies[1].model,'test-model-b')
 const {model:one,...a}=bodies[0],{model:two,...b}=bodies[1]
 assert.notEqual(one,two);assert.deepEqual(a,b)
})

test('reasoning effort is explicit server configuration and optional for other models',async()=>{
 for(const [value,expected] of [[undefined,undefined],['',undefined],[' none ',{effort:'none'}],['low',{effort:'low'}]]){
  let body
  const h=createConversationHandler({...real,MORU_OPENAI_REASONING_EFFORT:value},async(_url,options)=>{body=JSON.parse(options.body);return envelope(valid)})
  assert.equal((await(await h(req())).json()).provider,'REAL')
  assert.deepEqual(body.reasoning,expected)
  assert.equal(body.model,real.MORU_OPENAI_MODEL)
  assert.equal(body.max_output_tokens,350)
 }
 assert.throws(()=>createConversationHandler({...real,MORU_OPENAI_REASONING_EFFORT:'unknown'}),/Invalid MORU_OPENAI_REASONING_EFFORT/)
})


test('development HTTP diagnostics preserve status/stage but never provider message or secrets',async()=>{
 for(const status of [400,401,403,404,429,500,503]){
  const records=[]
  const secret='test-secret-do-not-print'
  const h=createConversationHandler({...real,OPENAI_API_KEY:secret},async()=>Response.json({error:{type:'invalid_request_error',code:'model_not_found',message:`Authorization: Bearer ${secret}; private conversation`}}, {status}),9000,d=>records.push(d))
  const body=await(await h(req())).json()
  assert.equal(body.provider,'FALLBACK');assert.equal('diagnostic' in body,false)
  assert.equal(records.length,1)
  const d=records[0];assert.equal(d.status,status);assert.equal(d.localStatus,200);assert.equal(d.stage,'provider_http');assert.equal(d.reachedProvider,true);assert.equal(d.responseReceived,true);assert.equal(d.fallback,true);assert.equal(d.configured,true)
  assert.equal(d.errorType,'invalid_request_error');assert.equal(d.errorCode,'model_not_found');assert.equal(d.model,'test-model-a')
  assert.ok(d.startedAt&&d.endedAt&&d.providerStartedAt&&d.providerEndedAt);assert.ok(d.latencyMs>=0&&d.providerLatencyMs>=0)
  for(const value of [secret,'Authorization','private conversation',context.userMessage])assert.equal(JSON.stringify(records).includes(value),false)
 }
})
test('diagnostics distinguish transport, timeout, decode, parsing and validation failures',async()=>{
 const cases=[
  [async()=>{throw Error('secret transport details')},'provider_request','transport_error'],
  [async()=>new Response('not json'),'response_decode','provider_response_error'],
  [async()=>envelope('{'),'response_parse','invalid_json'],
  [async()=>envelope({speech:'x'.repeat(121)}),'response_validation','invalid_structured_response'],
  [async()=>Response.json({status:'incomplete'}),'response_decode','incomplete_response'],
 ]
 for(const [fetcher,stage,type]of cases){const records=[];const body=await(await createConversationHandler(real,fetcher,9000,d=>records.push(d))(req())).json();assert.equal(body.provider,'FALLBACK');assert.equal(records[0].stage,stage);assert.equal(records[0].errorType,type);assert.equal(JSON.stringify(records).includes('secret transport details'),false)}
 const records=[]
 await createConversationHandler(real,(_u,{signal})=>new Promise((_ok,fail)=>signal.addEventListener('abort',()=>fail(Error('hidden')))),5,d=>records.push(d))(req())
 assert.equal(records[0].timedOut,true);assert.equal(records[0].errorType,'timeout');assert.equal(records[0].status,null)
})
test('development diagnostics cover successful output and local rejection without outbound calls',async()=>{
 const records=[];let calls=0
 const handler=createConversationHandler(real,async()=>{calls++;return envelope(valid)},9000,d=>records.push(d))
 assert.equal((await handler(req({}))).status,400);assert.equal(calls,0);assert.equal(records[0].reachedProvider,false);assert.equal(records[0].stage,'request_validation')
 assert.equal((await(await handler(req())).json()).provider,'REAL');assert.equal(calls,1);assert.equal(records[1].stage,'complete');assert.equal(records[1].fallback,false);assert.deepEqual(records[1].rejectedFields,[])
})
test('production diagnostics emit only safe categories, and sink errors do not affect replies',async()=>{
 const previous=process.env.NODE_ENV
 try{
  process.env.NODE_ENV='production';const records=[]
  const handler=createConversationHandler(real,async()=>Response.json({error:{type:'invalid_request_error',code:'invalid_api_key',message:'private'}},{status:401}),9000,d=>records.push(d))
  const body=await(await handler(req())).json();assert.equal(body.provider,'FALLBACK');assert.equal(records.length,1);assert.equal(JSON.stringify(body).includes('private'),false)
  assert.equal(records[0].stage,'provider_http');assert.equal(records[0].status,401);assert.equal(records[0].errorType,'invalid_request_error');assert.equal(records[0].errorCode,'invalid_api_key');assert.equal(records[0].message,'Provider authentication failed.')
  for(const value of ['private',real.OPENAI_API_KEY,context.userMessage])assert.equal(JSON.stringify(records).includes(value),false)
 }finally{if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous}
 assert.equal((await(await createConversationHandler(real,async()=>envelope(valid),9000,()=>{throw Error('sink')})(req())).json()).provider,'REAL')
})

test('development routing probe reaches handler without provider even with REAL settings',async()=>{
 let calls=0;const records=[]
 const h=createConversationHandler(real,async()=>{calls++;throw Error('Provider must not be called')},9000,d=>records.push(d))
 const r=await h(new Request('http://localhost/api/moru-conversation',{method:'POST',headers:{'Content-Type':'application/json','X-Moru-Routing-Probe':'1'},body:'{}'}))
 assert.equal(r.status,200);assert.deepEqual(await r.json(),{probe:'moru-local-route',reachedHandler:true});assert.equal(calls,0);assert.equal(records[0].reachedProvider,false)
 // Production/default handler does not enable the probe.
 const prod=createConversationHandler(real,async()=>{calls++;throw Error('Provider must not be called')})
 assert.equal((await prod(new Request('http://localhost/api/moru-conversation',{method:'POST',headers:{'Content-Type':'application/json','X-Moru-Routing-Probe':'1'},body:'{}'}))).status,400)
 assert.equal(calls,0)
})


test('default browser fetch wrapper preserves receiver and keeps custom fetch injection',async()=>{
 const original=globalThis.fetch;let calls=0
 // Native browser fetch rejects an arbitrary class instance as its receiver.
 globalThis.fetch=async function(){assert.ok(this===undefined||this===globalThis);calls++;return Response.json({provider:'REAL',response:valid})}
 try{
  const provider=new ServerConversationProvider()
  await provider.respond(context,new AbortController().signal)
  assert.equal(provider.lastProvider,'REAL');assert.equal(calls,1)
  let customCalls=0
  const injected=new ServerConversationProvider(async()=>{customCalls++;return Response.json({provider:'REAL',response:valid})})
  await injected.respond(context,new AbortController().signal)
  assert.equal(customCalls,1);assert.equal(calls,1);assert.equal(injected.lastProvider,'REAL')
 }finally{globalThis.fetch=original}
})
