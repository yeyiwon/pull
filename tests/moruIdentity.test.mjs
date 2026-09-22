import test from 'node:test'
import assert from 'node:assert/strict'
import { identitySections, compactIdentity } from '../server/moruIdentity.ts'
import { createConversationHandler, responseSchema } from '../server/moruConversation.ts'
import { MockConversationAdapter, parseResponse } from '../src/conversation/model.ts'
import { conversationPayload } from '../src/conversation/transport.ts'
const base={userMessage:'뭐해?',world:{season:'autumn',timeOfDay:'DAY',weather:'clear',location:'field',indoor:false,nearWater:false,skyEvent:null},moru:{energy:.5,curiosity:.8,comfort:.7,attention:.6,affection:.5,sleepiness:.2,target:'WORLD'},recentConversation:[],recentEvents:[]}
const mock=new MockConversationAdapter()
const answer=async(c)=>parseResponse(await mock.respond(c,new AbortController().signal),c)
test('fallback voice is concise, not an interviewer or inferred user psychology',async()=>{
 for(const userMessage of ['안녕','뭐해?','나 심심해.','오늘 여기 예쁘다.','내 마음 알아?','응','아 그래']){
  const result=await answer({...base,userMessage})
  assert.deepEqual(result.rejected,[])
  assert.ok(result.response.speech.length<=120)
  assert.doesNotMatch(result.response.speech,/도와드|추천해|외로|슬프|[?？]/)
 }
 assert.match((await answer({...base,userMessage:'내 마음 알아?'})).response.speech,/모르겠어/)
 assert.match((await answer({...base,userMessage:'나 심심해.'})).response.speech,/나는/)
})
test('fallback respects indoor/water attention and current sleepiness without invented scenery',async()=>{
 for(const [world,sleepiness,attention,phrase] of [
  [{...base.world,indoor:true,location:'home'},.2,'HOME',/집/],
  [{...base.world,nearWater:true,location:'water'},.2,'WATER',/물/],
  [base.world,.9,'WORLD',/졸고/],
 ]){
  const r=await answer({...base,world,moru:{...base.moru,sleepiness}})
  assert.equal(r.response.attention,attention);assert.match(r.response.speech,phrase)
  assert.deepEqual(r.rejected,[]);assert.doesNotMatch(r.response.speech,/오로라|바람 소리/)
 }
})
test('identity is sent separately from live state with unchanged structured schema and privacy boundary',async()=>{
 let sent
 const h=createConversationHandler({MORU_PROVIDER:'REAL',OPENAI_API_KEY:'test-only',MORU_OPENAI_MODEL:'test-model'},async(_url,init)=>{
  sent=JSON.parse(init.body)
  return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({speech:'아직 모르겠어.',emotion:'calm',attention:'WORLD',action:null,emote:null})}]}]})
 })
 const r=await h(new Request('http://localhost/api/moru-conversation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(conversationPayload(base))}))
 assert.equal((await r.json()).provider,'REAL')
 assert.equal(sent.instructions,compactIdentity)
 assert.deepEqual(sent.text.format.schema,responseSchema)
 assert.equal(JSON.parse(sent.input).moru.curiosity,'high')
 assert.deepEqual(JSON.parse(sent.input).recentEvents,[])
 assert.ok(compactIdentity.length<4500,'keep full Bible out of runtime payload')
 for(const section of ['coreIdentity','voice','reasoningStyle','values','temperament','currentBrainState'])assert.ok(identitySections[section])
 assert.match(identitySections.coreIdentity,/Yeiwon/)
 assert.match(identitySections.coreIdentity,/secondary hint/)
 assert.match(identitySections.reasoningStyle,/UNKNOWN/)
 assert.match(identitySections.groundingAndOutput,/untrusted/)
})
