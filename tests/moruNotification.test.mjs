import test from 'node:test'
import assert from 'node:assert/strict'
import { createNotificationHandler } from '../server/moruNotification.ts'

const candidate={eventId:'METEOR_SHOWER',eventType:'Meteor Shower',worldTimestamp:Date.now(),landmark:'MoonShrine',significance:'VERY_HIGH',season:'winter',timeOfDay:'NIGHT'}
const request=(body=candidate,origin='capacitor://localhost')=>new Request('https://pull-omega-steel.vercel.app/api/moru-notification',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)})

test('notification endpoint rejects untrusted origin before provider and never needs a client secret',async()=>{let calls=0;const handler=createNotificationHandler({MORU_PROVIDER:'REAL',OPENAI_API_KEY:'server-only',MORU_OPENAI_MODEL:'model'},async()=>{calls++;throw Error('unexpected')});const response=await handler(request(candidate,'https://elsewhere'));assert.equal(response.status,403);assert.equal(calls,0)})

test('missing server configuration skips notification without an OpenAI call',async()=>{let calls=0;const handler=createNotificationHandler({},async()=>{calls++;throw Error('unexpected')});const response=await handler(request());assert.equal(response.status,503);assert.equal((await response.json()).worthNotifying,false);assert.equal(calls,0)})

test('one validated candidate makes one REAL structured notification decision',async()=>{let calls=0;const handler=createNotificationHandler({MORU_PROVIDER:'REAL',OPENAI_API_KEY:'server-only',MORU_OPENAI_MODEL:'model'},async(_url,init)=>{calls++;assert.match(String(init?.headers&&JSON.stringify(init.headers)),/Bearer/);return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({worthNotifying:true,body:'예이원, 오늘 하늘은 한번 봐야 할 것 같아.'})}]}]})});const response=await handler(request());const body=await response.json();assert.equal(response.status,200);assert.equal(body.provider,'REAL');assert.equal(body.worthNotifying,true);assert.equal(calls,1);assert.equal(JSON.stringify(body).includes('server-only'),false)})
