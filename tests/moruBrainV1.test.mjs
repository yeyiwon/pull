import test from 'node:test'
import assert from 'node:assert/strict'
import {createMoruMind} from '../src/world/brain/mind.ts'
import {validateIntent} from '../src/world/brain/conversation.ts'
import {AMBIENT_LINES} from '../src/characters/ambientLines.ts'
import {MORU_ACTIONS,actionClass} from '../src/characters/actions.ts'
const base={date:'2026-09-22',hour:13,timeOfDay:'DAY',season:'autumn',weather:'clear',wind:.2,location:'field',indoor:false,nearWater:false,skyEvent:null,userMoving:false,userIdleDuration:20,userInteracted:false,userReturned:false,actionBusy:false,grounded:true,recentMoruActions:[],recentSpeech:[]}
function setup(extra={}){const emitted=[];const mind=createMoruMind({random:()=>0,execute:i=>{emitted.push(i);return {action:i.action,speech:i.speech,emote:!!i.emote}},...extra});return {mind,emitted}}
function advance(mind,seconds,patch={}){for(let i=0;i<seconds;i++)mind.tick({...base,...patch},1)}
test('entry may greet; no actual or removed GLB names in semantic output',()=>{
 const {mind,emitted}=setup();advance(mind,8);assert.equal(emitted[0].action,'wave');assert.equal(emitted[0].attention,'USER')
 assert.ok(MORU_ACTIONS.some(a=>a.id===emitted[0].action));assert.ok(!MORU_ACTIONS.some(a=>/talk|confused|cherish/i.test(a.clip)))
 assert.equal(actionClass('wave'),'SOCIAL');assert.equal(actionClass('listen'),'AMBIENT');assert.equal(actionClass('hop'),'REACTION');assert.equal(actionClass('loveDance'),'DANCE')
})
test('internal state changes gradually and stays normalized; water biases comfort',()=>{
 const a=setup(),b=setup();advance(a.mind,1,{hour:0});assert.ok(Math.abs(a.mind.state.energy-.7)<.02)
 advance(a.mind,180,{hour:0,timeOfDay:'NIGHT',nearWater:true,location:'water'});advance(b.mind,181)
 assert.ok(a.mind.state.energy<b.mind.state.energy);assert.ok(a.mind.state.sleepiness>b.mind.state.sleepiness);assert.ok(a.mind.state.comfort>b.mind.state.comfort)
 for(const v of Object.values(a.mind.state))assert.ok(v>=0&&v<=1)
})
test('first rain/snow event is deferred through cooldown, then never repeats today',()=>{
 const {mind,emitted}=setup();advance(mind,8);advance(mind,75,{weather:'rain'})
 assert.equal(emitted.filter(x=>x.reason==='rain').length,1)
 advance(mind,90,{weather:'snow'});assert.equal(emitted.filter(x=>x.reason==='snow').length,1)
 advance(mind,250,{weather:'snow'});assert.equal(emitted.filter(x=>x.reason==='snow').length,1)
 assert.ok(mind.short.some(x=>x.key==='2026-09-22:weather:snow'))
})
test('idle initiations are contextual, sparse, non-dance and allow silence',()=>{
 const {mind,emitted}=setup();advance(mind,240,{hour:0,timeOfDay:'NIGHT'})
 assert.ok(emitted.some(i=>i.attention==='SKY'));assert.ok(emitted.length<9)
 assert.ok(emitted.every(i=>!i.action||actionClass(i.action)!=='DANCE'))
 const lines=emitted.map(i=>i.speech).filter(Boolean);assert.equal(new Set(lines).size,lines.length)
 const quiet=setup({random:()=>.999});advance(quiet.mind,180);assert.equal(quiet.emitted.length,0);assert.equal(quiet.mind.intent.kind,'WAIT')
})
test('movement and explicit actions suppress ambient; first weather is still observed after stopping',()=>{
 const {mind,emitted}=setup();advance(mind,50,{userMoving:true,weather:'snow'});assert.equal(emitted.length,0)
 advance(mind,50,{actionBusy:true,weather:'snow'});assert.equal(emitted.length,0)
 advance(mind,8,{weather:'snow'});assert.equal(emitted[0].reason,'snow')
})
test('near water and indoor observations select actual available attention targets',()=>{
 const a=setup();advance(a.mind,100,{nearWater:true,location:'water'});assert.ok(a.emitted.some(i=>i.attention==='WATER'))
 const b=setup();advance(b.mind,100,{indoor:true,location:'home'});assert.ok(b.emitted.some(i=>i.attention==='HOME'));assert.ok(!b.emitted.some(i=>i.attention==='SKY'))
})
test('all requested local speech categories have multiple lines',()=>{
 for(const c of ['greeting','morning','day','sunset','night','spring','summer','autumn','winter','rain','snow','wind','water','home','curious','sleepy','happy','affectionate'])assert.ok(AMBIENT_LINES[c].length>=2,c)
})
const response={kind:'REACT',attention:'USER',action:'wave',speech:'왔네.',emote:'heart'}
test('structured conversation rejects invented actions, unavailable targets and markup',()=>{
 assert.equal(validateIntent(response,base).action,'wave')
 for(const patch of [{action:'lookAround'},{action:'Talk_with_Hands_Open'},{attention:'OBJECT'},{attention:'WATER'},{speech:'<script>'},{speech:'x'.repeat(41)},{emote:'fireworks'}])assert.equal(validateIntent({...response,...patch},base).kind,'WAIT')
})
test('ambient never calls conversation provider; direct request is validated',async()=>{
 let calls=0;const {mind,emitted}=setup({conversation:{async respond(){calls++;return response}}});advance(mind,100);assert.equal(calls,0)
 const count=emitted.length;await mind.converse('안녕');assert.equal(calls,1);assert.equal(emitted.length,count+1)
})
test('provider rejection and malformed response fall back locally',async()=>{
 for(const respond of [async()=>{throw Error('offline')},async()=>({action:'teleport'})]){
 const {mind,emitted}=setup({conversation:{respond}});advance(mind,1);const result=await mind.converse('안녕');assert.equal(result.kind,'REACT');assert.equal(emitted.at(-1).action,'listen')}
})
test('late provider replies are invalidated by movement or disposal',async()=>{
 for(const mode of ['move','dispose']){
 let resolve;const {mind,emitted}=setup({conversation:{respond:()=>new Promise(r=>resolve=r)}});advance(mind,1)
 const pending=mind.converse('안녕');if(mode==='move')advance(mind,1,{userMoving:true});else mind.dispose()
 resolve(response);assert.equal((await pending).kind,'WAIT');assert.equal(emitted.length,0)
 }
})
test('optional long memory port records meaningful events; storage failure is harmless',()=>{
 const writes=[];const {mind}=setup({longMemory:{recall:()=>[],remember:e=>writes.push(e)}});advance(mind,80,{weather:'snow'});assert.equal(writes.filter(e=>e.event==='snow').length,1)
 assert.doesNotThrow(()=>{const b=setup({longMemory:{recall(){throw Error()},remember(){throw Error()}}});advance(b.mind,60)})
})
test('timeout falls back without blocking subsequent local observations',async t=>{
 t.mock.timers.enable({apis:['setTimeout']})
 const {mind,emitted}=setup({conversation:{respond:()=>new Promise(()=>{})}})
 advance(mind,1);const pending=mind.converse('안녕');t.mock.timers.tick(4001)
 assert.equal((await pending).kind,'REACT');assert.equal(emitted[0].action,'listen')
 advance(mind,90,{weather:'snow'});assert.ok(emitted.some(i=>i.reason==='snow'))
})
test('direct requests are rate limited; expired weather cannot be spoken later',async()=>{
 let calls=0;const {mind,emitted}=setup({conversation:{async respond(){calls++;return response}}})
 advance(mind,1);await mind.converse('안녕');await mind.converse('또');assert.equal(calls,1)
 advance(mind,3,{weather:'rain'});advance(mind,90,{weather:'clear'});assert.ok(!emitted.some(i=>i.reason==='rain'))
})
test('expired weather cannot swallow a new phase observation',()=>{
 const {mind,emitted}=setup();advance(mind,8);advance(mind,2,{weather:'rain'})
 advance(mind,70,{hour:0,timeOfDay:'NIGHT',weather:'clear'})
 assert.ok(mind.short.some(e=>e.key==='2026-09-22:phase:NIGHT'))
 assert.ok(emitted.some(i=>i.attention==='SKY'));assert.ok(!emitted.some(i=>i.reason==='rain'))
})
