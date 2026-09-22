import test from 'node:test'
import assert from 'node:assert/strict'
import {createConversationHandler,validateContext,promptContext,responseSchema} from '../server/moruConversation.ts'
import {conversationPayload} from '../src/conversation/transport.ts'
import {ServerConversationProvider} from '../src/conversation/provider.ts'
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
test('no key and MOCK mode never call external provider',async()=>{for(const settings of [{MORU_PROVIDER:'REAL',MORU_OPENAI_MODEL:'test-model-a'},{...real,MORU_PROVIDER:'MOCK'}]){let calls=0;const h=createConversationHandler(settings,async()=>{calls++;throw Error()});const r=await(await h(req())).json();assert.equal(r.provider,'MOCK');assert.equal(calls,0)}})
test('valid structured response uses fixed destination and minimum context',async()=>{let body;const h=createConversationHandler(real,async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');body=JSON.parse(options.body);return envelope(valid)});const r=await(await h(req())).json();assert.equal(r.provider,'REAL');assert.equal(r.response.action,'listen');assert.equal(body.store,false);assert.equal(body.max_output_tokens,350);assert.deepEqual(body.text.format.schema,responseSchema);assert.equal(JSON.parse(body.input).world.weather,'snow');assert.equal(JSON.stringify(body).includes('private-date'),false)})
test('invalid optional values are dropped while valid speech survives both boundaries',async()=>{const h=createConversationHandler(real,async()=>envelope({...valid,action:'talk',attention:'INVENTED',emote:'explode',emotion:'evil'}));const r=await(await h(req())).json();assert.equal(r.response.speech,valid.speech);assert.equal(r.response.action,null);assert.equal(r.response.emote,null);assert.equal(r.response.emotion,null);assert.equal(r.response.attention,'USER')})
test('malformed JSON, overlong speech, provider failure and refusal fall back',async()=>{for(const fake of [async()=>envelope('{'),async()=>envelope({...valid,speech:'가'.repeat(121)}),async()=>{throw Error('do not expose provider details')},async()=>Response.json({status:'incomplete'}),async()=>new Response('',{status:429})]){const r=await(await createConversationHandler(real,fake)(req())).json();assert.equal(r.provider,'FALLBACK');assert.ok(r.response.speech.length<=120);assert.equal(JSON.stringify(r).includes('provider details'),false)}})
test('provider timeout aborts outbound fetch and returns local speech',async()=>{let aborted=false;const h=createConversationHandler(real,(_u,{signal})=>new Promise((_ok,fail)=>{signal.addEventListener('abort',()=>{aborted=true;fail(Error('timeout'))})}),5);const r=await(await h(req())).json();assert.equal(aborted,true);assert.equal(r.provider,'FALLBACK')})
test('method, origin, oversized body, invalid context fail before outbound fetch',async()=>{let calls=0;const h=createConversationHandler(real,async()=>{calls++;return envelope(valid)});for(const [request,status]of [[new Request('http://localhost/api/moru-conversation'),405],[req(undefined,{headers:{Origin:'https://elsewhere','Content-Type':'application/json'}}),403],[req({junk:'x'.repeat(13000)}),413],[req({world:{}}),400]])assert.equal((await h(request)).status,status);assert.equal(calls,0)})
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
