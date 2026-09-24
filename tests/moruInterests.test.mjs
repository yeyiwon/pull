import test from 'node:test'
import assert from 'node:assert/strict'
import { createInterestModel, emptyInterests, localCandidates, readInterests, FASCINATION_MS } from '../src/world/brain/interests.ts'
import { createMemoryStore, readMemory, MEMORY_KEY } from '../src/world/brain/memory.ts'
import { createMoruMind } from '../src/world/brain/mind.ts'
const o={date:'2026-09-22',hour:23,timeOfDay:'NIGHT',season:'autumn',weather:'snow',wind:0,location:'water',indoor:false,nearWater:true,skyEvent:null,userMoving:false,userIdleDuration:0,userInteracted:false,userReturned:false,actionBusy:false,grounded:true,recentMoruActions:[],recentSpeech:[]}
const storage=()=>{const map=new Map();let writes=0;return {getItem:k=>map.get(k)??null,setItem(k,v){writes++;map.set(k,v)},get writes(){return writes}}}
test('local seeds use only observed state, no implied moon/vegetation sightings',()=>{
 assert.deepEqual(localCandidates(o).map(x=>x.topic),['snow','reflection','leaves'])
 assert.deepEqual(localCandidates({...o,indoor:true}),[])
 assert.deepEqual(localCandidates({...o,weather:'clear',timeOfDay:'DAY',season:'summer'}),[])
 const m=createInterestModel(emptyInterests(),undefined,()=>100)
 m.observe(o)
 assert.equal(m.data.queue.length,3)
 assert.match(m.data.journal.find(j=>j.topic==='reflection').facts[0].text,/실제 관측 여부는 모른다/)
 assert.match(m.data.journal.find(j=>j.topic==='leaves').facts[0].text,/관측하지 않았다/)
})
test('canonical topic deduplicates differently phrased questions and all four sources, without tick score inflation',()=>{
 let writes=0;const m=createInterestModel(emptyInterests(),()=>writes++,()=>100)
 m.observe(o);const initial=writes,score=m.data.queue[0].score
 for(let i=0;i<1000;i++)m.observe(o)
 assert.equal(writes,initial);assert.equal(m.data.queue[0].score,score)
 for(const source of ['SELF_ASSOCIATION','USER_CONVERSATION','PAST_MEMORY'])m.offer({topic:'snow',question:'다른 표현의 눈 질문',source,score:1,fact:'사용자 추측을 사실로 만들지 않는다'},o.date)
 assert.equal(m.data.queue.length,3);assert.equal(m.data.queue[0].sources.length,4)
 assert.equal(m.data.journal[0].facts.length,1)
})
test('fascination survives changing observations and reload, changes only after its day-scale minimum',()=>{
 let time=100;const m=createInterestModel(emptyInterests(),undefined,()=>time)
 m.observe(o);assert.equal(m.data.fascination.topic,'snow')
 time+=FASCINATION_MS-1
 const reloaded=createInterestModel(readInterests(JSON.parse(JSON.stringify(m.data))),undefined,()=>time)
 reloaded.observe({...o,weather:'clear'});assert.equal(reloaded.data.fascination.topic,'snow')
 time+=1;reloaded.observe({...o,date:'2026-09-23',weather:'clear'})
 assert.equal(reloaded.data.fascination.topic,'reflection')
 const f=structuredClone(reloaded.data.fascination)
 reloaded.observe({...o,date:'2026-09-23',weather:'snow'})
 assert.deepEqual(reloaded.data.fascination,f)
})
test('journal epistemic categories survive roundtrip; mismatched kinds are discarded, never promoted',()=>{
 const m=createInterestModel(emptyInterests(),undefined,()=>100);m.observe(o)
 const j=m.data.journal[0]
 j.inferences.push({kind:'INFERENCE',text:'仮説',source:'SELF_ASSOCIATION'})
 j.ideas.push({kind:'IDEA',text:'눈을 더 보고 싶다',source:'SELF_ASSOCIATION'})
 j.facts.push({kind:'IDEA',text:'NOT A FACT',source:'PAST_MEMORY'})
 const r=readInterests(JSON.parse(JSON.stringify(m.data))).journal[0]
 assert.equal(r.facts.length,1);assert.equal(r.inferences[0].kind,'INFERENCE');assert.equal(r.ideas[0].kind,'IDEA');assert.equal(r.unknowns[0].kind,'UNKNOWN')
})
test('v1 migration preserves existing life memory; interests persist immediately without repeated writes',()=>{
 const s=storage(),date=()=> '2026-09-22T00:00:00Z'
 s.setItem(MEMORY_KEY,JSON.stringify({version:1,visitCount:4,totalTimeTogetherSeconds:100,firstMetAt:date(),lastVisitAt:date(),interactions:{jumps:3,waves:2,dances:1},recentEvents:[{type:'WAVE',timestamp:date()}]}))
 const store=createMemoryStore(s,date)
 assert.equal(store.memory.version,7);assert.equal(store.memory.visitCount,5);assert.equal(store.memory.totalTimeTogetherSeconds,100);assert.equal(store.memory.interactions.jumps,3);assert.equal(store.memory.recentEvents.length,1)
 const m=createInterestModel(store.memory.interests,store.interestsChanged,()=>100);m.observe(o)
 const saved=readMemory(s.getItem(MEMORY_KEY),date())
 assert.deepEqual(saved.interests,m.data)
 const writes=s.writes;for(let i=0;i<30;i++)m.observe(o);assert.equal(s.writes,writes)
 assert.deepEqual(createMemoryStore(s,date).memory.interests,m.data)
})
test('corrupt/unknown future storage does not crash; future versions are not overwritten',()=>{
 for(const raw of ['{bad',JSON.stringify({version:2,interests:{queue:[null,{topic:'unknown'}],journal:[null],fascination:{topic:'snow',since:NaN,until:1}}})])assert.deepEqual(readMemory(raw,'2026-09-22').interests,emptyInterests())
 const s=storage();s.setItem(MEMORY_KEY,'{"version":99,"future":"preserve"}');const before=s.getItem(MEMORY_KEY)
 const store=createMemoryStore(s);store.tick(30);store.interestsChanged();assert.equal(s.getItem(MEMORY_KEY),before)
 assert.doesNotThrow(()=>{const store=createMemoryStore({getItem(){throw Error()},setItem(){throw Error()}});createInterestModel(store.memory.interests,store.interestsChanged).observe(o)})
})
test('interest observation is passive even during movement/conversation; no action/provider coupling',()=>{
 const emitted=[];let calls=0
 const mind=createMoruMind({execute:i=>{emitted.push(i);return {action:null,speech:null,emote:false}},conversation:{async respond(){calls++;throw Error()}},clock:()=>100,random:()=>0})
 mind.holdConversation(true)
 for(let i=0;i<10;i++)mind.tick({...o,userMoving:true},1)
 assert.equal(mind.interests.data.queue.length,3);assert.equal(emitted.length,0);assert.equal(calls,0)
 assert.equal('interests' in mind.snapshot(),false,'new journal is not added to approved REAL conversation context')
 mind.dispose()
})

test('real observation unpadded dates normalize to stable persisted day keys',()=>{
 const m=createInterestModel(emptyInterests(),undefined,()=>100)
 m.observe({...o,date:'2026-9-22'})
 assert.equal(m.data.fascination.topic,'snow')
 assert.ok(m.data.queue.every(c=>c.lastObservedDay==='2026-09-22'))
 m.observe(o);assert.equal(m.data.queue.length,3)
 assert.equal(localCandidates({...o,date:'2026-9-22'}).length,3)
})
