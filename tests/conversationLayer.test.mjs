import test from 'node:test'
import assert from 'node:assert/strict'
import {createConversationSession} from '../src/conversation/session.ts'
import {parseResponse,MockConversationAdapter} from '../src/conversation/model.ts'
import {speechDuration} from '../src/characters/presentation.ts'
const context={userMessage:'뭐 하고 있어?',world:{nearWater:true,indoor:false,timeOfDay:'NIGHT',weather:'clear'},moru:{sleepiness:.2,energy:.8,comfort:.8,curiosity:.5},recentConversation:[],recentEvents:[]}
function setup(provider){const said=[],holds=[];const session=createConversationSession(provider,{thinking:1,timeout:15});session.attach({snapshot:()=>({observation:{...context.world,grounded:true},state:context.moru,attention:'WORLD',events:[]}),hold:v=>holds.push(v),listen:()=>{},speak:r=>{said.push(r);return true},cancel:()=>{}});return {session,said,holds}}
test('invalid optional action is isolated from valid speech',()=>{const p=parseResponse({speech:'안녕',action:'invented',attention:'WATER'},context);assert.equal(p.response.speech,'안녕');assert.equal(p.response.action,null);assert.deepEqual(p.rejected,['action'])})
test('mock uses actual water/night context',async()=>{assert.match((await new MockConversationAdapter().respond(context,new AbortController().signal)).speech,/물.*밤/)})
test('cancel settles an uncooperative provider without stale speech',async()=>{const {session,said,holds}=setup({respond:()=>new Promise(()=>{})});const pending=session.send('안녕');session.cancel();assert.equal(await pending,false);assert.equal(said.length,0);assert.equal(holds.at(-1),false)})
test('timeout speaks a local fallback and releases on close',async()=>{const {session,said,holds}=setup({respond:()=>new Promise(()=>{})});assert.equal(await session.send('안녕'),true);assert.equal(said[0].speech,'잠깐 딴생각했어.');session.cancel();assert.equal(holds.at(-1),false)})
test('a completed reply keeps the composer open until the user closes it',async()=>{
 const {session,holds}=setup({respond:async()=>({speech:'응'})})
 assert.equal(await session.send('안녕'),true)
 await new Promise(resolve=>setTimeout(resolve,speechDuration('응')*1000+50))
 assert.equal(session.getSnapshot().phase,'composing')
 assert.notEqual(holds.at(-1),false)
 session.cancel();assert.equal(session.getSnapshot().phase,'closed');assert.equal(holds.at(-1),false)
})
test('session bounds history and rejects concurrent submissions',async()=>{const {session}=setup({respond:async()=>({speech:'응',action:'invalid'})});for(let i=0;i<10;i++){const request=session.send(String(i));assert.equal(await session.send('중복'),false);assert.equal(await request,true);session.cancel()}assert.equal(session.turns.length,8);assert.equal(session.turns[0].user,'2')})
test('visible conversation history survives a new session without joining provider context',async()=>{
 const previous=globalThis.localStorage,values=new Map()
 globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}
 try{
  const {session}=setup({respond:async()=>({speech:'여기 있었어.'})})
  assert.equal(await session.send('뭐해?'),true)
  assert.deepEqual(session.getHistory(),[{user:'뭐해?',moru:'여기 있었어.'}])
  session.cancel()
  const restored=createConversationSession()
  assert.deepEqual(restored.getHistory(),session.getHistory())
  assert.equal(restored.turns.length,0)
 }finally{if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous}
})
