import test from 'node:test'
import assert from 'node:assert/strict'
import { createResearchController, emptyResearchBudget, researchSummary, RESEARCH_COOLDOWN, TOPIC_COOLDOWN } from '../src/research/controller.ts'
import { MockResearchProvider, parseResearch, readProgress, parseResearchSummary } from '../src/research/model.ts'
import { ServerResearchProvider } from '../src/research/provider.ts'
import { createInterestModel, emptyInterests, readInterests } from '../src/world/brain/interests.ts'
import { readMemory } from '../src/world/brain/memory.ts'
import { buildContext } from '../src/conversation/model.ts'
import { conversationPayload } from '../src/conversation/transport.ts'
import { validateContext } from '../server/moruConversation.ts'
import { createResearchHandler, parseResearchContext } from '../server/moruResearch.ts'
const o={date:'2026-09-22',hour:23,timeOfDay:'NIGHT',season:'autumn',weather:'snow',wind:0,location:'water',indoor:false,nearWater:true,skyEvent:null,userMoving:false,userIdleDuration:20,userInteracted:false,userReturned:false,actionBusy:false,grounded:true,recentMoruActions:[],recentSpeech:[]}
const c={topic:'snow',question:'눈은 왜 이런 모양으로 내릴까?',observations:['2026-09-22: weather=snow, outdoors'],previous:{inferences:[],unknowns:[]}}
const valid={topic:c.topic,question:c.question,facts:['눈 결정의 모양은 성장 조건과 관련될 수 있다.'],inferences:['관찰만으로 성장 조건을 알 수 없다.'],unknowns:['현재 눈의 실제 결정 형태는 모른다.'],ideas:['다른 날과 비교해보고 싶다.'],associations:[{topic:'symmetry',connection:'결정 성장과 대칭의 관계'}],confidence:'LIKELY',needsExternalResearch:true}
const reply={provider:'REAL',result:valid}
const real={MORU_PROVIDER:'REAL',MORU_RESEARCH_PROVIDER:'REAL',MORU_OPENAI_MODEL:'fixture-model',MORU_OPENAI_REASONING_EFFORT:'none',OPENAI_API_KEY:'test-only'}
const request=(body=c,extra={})=>new Request('http://localhost/api/moru-research',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost'},body:JSON.stringify(body),...extra})
const envelope=(value=valid)=>Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]})
function setup(provider=new MockResearchProvider(),extra={}){
 let time=Date.UTC(2026,8,22),writes=0
 const data=emptyInterests();createInterestModel(data,undefined,()=>time).observe(o)
 const budget=emptyResearchBudget(),session={calls:0,blocked:false}
 const control=createResearchController(data,budget,provider,()=>writes++,{now:()=>time,session,...extra})
 return {data,budget,session,control,advance:n=>time+=n,get writes(){return writes},get time(){return time}}
}
test('current fascination selects one research candidate, preserves observed facts and separate model knowledge',async()=>{
 const s=setup({async explore(ctx){assert.equal(ctx.topic,'snow');return reply}})
 const facts=structuredClone(s.data.journal[0].facts)
 await s.control.observe(o)
 assert.equal(s.data.journal[0].research.status,'COMPLETE')
 assert.deepEqual(s.data.journal[0].facts,facts)
 assert.deepEqual(s.data.journal[0].research.result,valid)
 assert.equal(s.data.journal[1].research,undefined)
 assert.equal(s.session.calls,1);assert.equal(s.budget.attempts,1)
 assert.equal(researchSummary(s.data).recentDiscovery.kind,'MODEL_KNOWLEDGE')
})
test('Mock research progresses epistemic groups but never becomes a real discovery',async()=>{
 const s=setup();await s.control.observe(o)
 const p=s.data.journal[0].research
 assert.equal(p.provider,'MOCK');assert.equal(p.result.facts.length,0);assert.equal(p.result.confidence,'UNKNOWN');assert.equal(p.result.associations.length,1)
 assert.equal(researchSummary(s.data).recentDiscovery,null)
})
test('no polling calls, session/daily/cooldown limits and reload continuity',async()=>{
 const s=setup();await s.control.observe(o)
 for(let i=0;i<100;i++){s.advance(60000);await s.control.observe(o)}
 assert.equal(s.session.calls,1)
 let calls=0,received
 const data=readInterests(JSON.parse(JSON.stringify(s.data)))
 const p=createResearchController(data,s.budget,{async explore(ctx){calls++;received=ctx;return new MockResearchProvider().explore(ctx,new AbortController().signal)}},()=>{},{now:()=>s.time})
 await p.observe(o);assert.equal(calls,0,'same topic has 24h cooldown')
 s.advance(TOPIC_COOLDOWN)
 await p.observe(o);assert.equal(calls,1);assert.equal(received.previous.unknowns.length,1)
 const q=createResearchController(data,{day:new Date(s.time).toISOString().slice(0,10),attempts:2,nextAllowedAt:0},{async explore(){throw Error('must not call')}},()=>{},{now:()=>s.time})
 await q.observe(o);assert.equal(q.session.calls,0)
 const early=createResearchController(data,{...s.budget,nextAllowedAt:s.time+RESEARCH_COOLDOWN},{async explore(){throw Error('must not call')}},()=>{},{now:()=>s.time})
 await early.observe(o);assert.equal(early.session.calls,0)
})
test('movement/conversation preempt research and late replies cannot complete the journal',async()=>{
 let resolve;const s=setup({explore:()=>new Promise(r=>resolve=r)})
 await s.control.observe(o,true);assert.equal(s.session.calls,0)
 const pending=s.control.observe(o)
 await s.control.observe({...o,userMoving:true})
 await pending;resolve(reply)
 assert.equal(s.data.journal[0].research.status,'UNRESOLVED');assert.equal(s.session.blocked,true)
 assert.equal(s.data.journal[0].research.result,null)
})
test('timeout, failure and invalid structured output stay unresolved without retry',async()=>{
 for(const provider of [{explore:()=>new Promise(()=>{})},{async explore(){throw Error('private error')}},{async explore(){return {provider:'REAL',result:{...valid,topic:'wrong'}}}}]){
  const s=setup(provider,{timeoutMs:5});await s.control.observe(o);s.advance(TOPIC_COOLDOWN*2);await s.control.observe(o)
  assert.equal(s.session.calls,1);assert.equal(s.data.journal[0].research.status,'UNRESOLVED');assert.equal(s.data.journal[0].research.result,null)
 }
})
test('schema rejects unknown fields, excessive output, invented certainty and topic mismatch',()=>{
 for(const value of [{...valid,code:'execute()'},{...valid,confidence:'KNOWN'},{...valid,facts:Array(4).fill('x')},{...valid,ideas:['<script>']},{...valid,associations:[{topic:'x',connection:'x',url:'https://example.com'}]}])assert.throws(()=>parseResearch(value))
 assert.throws(()=>parseResearch(valid,'leaves'))
 assert.throws(()=>parseResearchContext({...c,recentConversation:['private']}))
 assert.throws(()=>parseResearchContext({...c,observations:['user secret']}))
})
test('v2 migration and v3 research roundtrip retain evidence/continuity; interrupted saves are recoverable',async()=>{
 const s=setup();await s.control.observe(o)
 const saved=readMemory(JSON.stringify({version:3,interests:s.data,researchBudget:s.budget,visitCount:4}),new Date(s.time).toISOString())
 assert.equal(saved.visitCount,4);assert.deepEqual(saved.interests,s.data);assert.deepEqual(saved.researchBudget,s.budget)
 const old=readMemory(JSON.stringify({version:2,interests:s.data,visitCount:4}),'2026-09-22')
 assert.equal(old.version,5);assert.equal(old.interests.fascination.topic,'snow');assert.equal(old.researchBudget.attempts,0)
 assert.equal(readProgress({...s.data.journal[0].research,status:'RESEARCHING'},'snow').status,'UNRESOLVED')
})
test('conversation includes only relevant compact research, preserving provenance and no entire journal',async()=>{
 const s=setup({async explore(){return reply}});await s.control.observe(o)
 const state={energy:.5,curiosity:.5,comfort:.5,attention:.5,affection:.5,sleepiness:.5},summary=researchSummary(s.data)
 const relevant=buildContext('요즘 뭐가 궁금해?',o,state,'WORLD',[],[],summary)
 const payload=conversationPayload(relevant),checked=validateContext(payload)
 assert.equal(checked.research.currentFascination,'snow');assert.equal(checked.research.recentDiscovery.kind,'MODEL_KNOWLEDGE')
 assert.equal('research' in conversationPayload(buildContext('안녕',o,state,'WORLD',[],[],summary)),false)
 assert.equal(JSON.stringify(payload).includes('observations'),false)
 assert.equal(parseResearchSummary({...summary,recentDiscovery:{...summary.recentDiscovery,kind:'VERIFIED_FACT'}}),undefined)
})
test('REAL research opt-in is separate; production or default remains Mock with zero outbound calls',async()=>{
 let calls=0;const fake=async()=>{calls++;return envelope()}
 assert.equal((await(await createResearchHandler({...real,MORU_RESEARCH_PROVIDER:undefined},fake)(request())).json()).provider,'MOCK')
 const previous=process.env.NODE_ENV;process.env.NODE_ENV='production'
 try{assert.equal((await(await createResearchHandler(real,fake)(request())).json()).provider,'MOCK')}finally{if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous}
 assert.equal(calls,0)
})
test('server REAL has fixed destination, identity, bounded context and one-attempt budget',async()=>{
 let body,calls=0
 const h=createResearchHandler(real,async(url,init)=>{assert.equal(url,'https://api.openai.com/v1/responses');body=JSON.parse(init.body);calls++;return envelope()})
 assert.equal((await(await h(request())).json()).provider,'REAL')
 assert.equal((await h(request())).status,429);assert.equal(calls,1)
 assert.match(body.instructions,/Yeiwon/);assert.equal(body.store,false);assert.equal('tools' in body,false);assert.deepEqual(JSON.parse(body.input),c)
})
test('server provider/schema failures do not fall back as completed research, expose secrets or retry',async()=>{
 for(const fake of [async()=>Response.json({error:{type:'invalid_request_error',message:'private secret'}},{status:401}),async()=>envelope({...valid,question:'invented question'}),async()=>{throw Error('secret')}]){
  const logs=[],h=createResearchHandler(real,fake,d=>logs.push(d))
  const r=await h(request());assert.equal(r.status,502);assert.equal((await r.json()).error,'research_unresolved');assert.equal((await h(request())).status,429)
  assert.equal(JSON.stringify(logs).includes('private secret'),false)
 }
})
test('server rejects method/origin/oversize before provider; client preserves injected fetch',async()=>{
 const h=createResearchHandler(real,async()=>{throw Error('must not call')})
 assert.equal((await h(new Request('http://localhost/api/moru-research'))).status,405)
 assert.equal((await h(request(c,{headers:{Origin:'https://elsewhere','Content-Type':'application/json'}}))).status,403)
 assert.equal((await h(request({...c,question:'x'.repeat(6500)}))).status,413)
 const p=new ServerResearchProvider(async(url)=>{assert.equal(url,'/api/moru-research');return Response.json(reply)})
 assert.deepEqual(await p.explore(c,new AbortController().signal),reply)
})
test('research endpoint accepts only the Capacitor iOS origin',async()=>{
 const h=createResearchHandler({...real,MORU_RESEARCH_PROVIDER:undefined},async()=>{throw Error('must not call')})
 const preflight=await h(new Request('https://pull-omega-steel.vercel.app/api/moru-research',{method:'OPTIONS',headers:{Origin:'capacitor://localhost','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}}))
 assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),'capacitor://localhost')
 const response=await h(new Request('https://pull-omega-steel.vercel.app/api/moru-research',{method:'POST',headers:{Origin:'capacitor://localhost','Content-Type':'application/json'},body:JSON.stringify(c)}))
 assert.equal(response.status,200);assert.equal(response.headers.get('access-control-allow-origin'),'capacitor://localhost')
})
