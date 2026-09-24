import test from 'node:test'
import assert from 'node:assert/strict'
import {createAutonomy,autonomyDebug} from '../src/world/autonomy.ts'
import {emptyAutonomyMemory} from '../src/world/brain/memory.ts'
import {createPlayer} from '../src/world/locomotion.ts'
import {createAgentExecutor} from '../src/world/agentExecutor.ts'
import {conversationPayload} from '../src/conversation/transport.ts'

const observation=(overrides={})=>({date:'2026-09-24',hour:22,timeOfDay:'NIGHT',season:'autumn',weather:'clear',wind:.1,location:'field',indoor:false,nearWater:false,skyEvent:null,activeEvents:[],eventLocation:null,userMoving:false,userIdleDuration:60,userInteracted:false,userReturned:false,actionBusy:false,grounded:true,recentMoruActions:[],recentSpeech:[],...overrides})
const candidate=(overrides={})=>({id:'flower-1',type:'flower',position:{x:3,z:4},tags:['flower'],affordances:['approach','look_at','inspect'],distance:5,visible:true,...overrides})

test('quiet autonomy may deliberately do nothing and never calls REAL per decision',()=>{
 const starts=[],memory=emptyAutonomyMemory(),director=createAutonomy({start:(plan)=>{starts.push(plan);return true},memory,changed(){},random:()=>0})
 for(let i=0;i<20;i++)director.update({observation:observation(),perception:{candidates:[candidate()],deicticTarget:null},player:createPlayer(),agentState:'IDLE',currentSkill:null},2)
 assert.equal(starts.length,0);assert.equal(autonomyDebug.state,'QUIET');assert.equal(autonomyDebug.result,'chose quiet');assert.equal(autonomyDebug.realCalls,0)
})

test('fireworks preempts cadence with a safe landmark plan and records meaningful discovery after completion',()=>{
 const starts=[],memory=emptyAutonomyMemory();let changed=0
 const director=createAutonomy({start:(plan,_player,command)=>{starts.push({plan,command});return true},memory,changed(){changed++},random:()=>.9,now:()=> '2026-09-24T13:00:00.000Z'})
 director.update({observation:observation({activeEvents:['FIREWORKS'],eventLocation:'OldBridge'}),perception:{candidates:[],deicticTarget:null},player:createPlayer(),agentState:'IDLE',currentSkill:null},1)
 assert.equal(starts.length,1);assert.equal(starts[0].command,'AUTONOMY:event:FIREWORKS:OldBridge');assert.deepEqual(starts[0].plan.map(step=>step.skill),['MOVE_NEAR','LOOK_AT','WAIT'])
 director.result('completed',starts[0].command)
 assert.equal(memory.discoveries.OldBridge.status,'discovered');assert.equal(memory.recentGoals[0].id,'event:FIREWORKS');assert.equal(changed,1)
})

test('direct user movement keeps autonomy quiet',()=>{
 const starts=[],director=createAutonomy({start:(plan)=>{starts.push(plan);return true},memory:emptyAutonomyMemory(),changed(){},random:()=>.9})
 director.update({observation:observation({userMoving:true,activeEvents:['FIREWORKS']}),perception:{candidates:[candidate()],deicticTarget:null},player:createPlayer(),agentState:'IDLE',currentSkill:null},100)
 assert.equal(starts.length,0);assert.equal(director.state,'QUIET')
})

test('a direct plan safely replaces an autonomous plan',()=>{
 const results=[],player=createPlayer(),executor=createAgentExecutor((result,command)=>results.push({result,command}))
 assert.equal(executor.start([{skill:'WALK_TO',target:'AncientTree',duration:null,text:null}],player,'AUTONOMY:inspect:AncientTree'),true)
 assert.equal(executor.start([{skill:'WALK_TO',target:'AHEAD_POINT',duration:null,text:null}],player,'DIRECT_TAP'),true)
 assert.deepEqual(results,[{result:'replaced',command:'AUTONOMY:inspect:AncientTree'}])
})

test('conversation payload carries current embodied context without scene geometry',()=>{
 const payload=conversationPayload({userMessage:'뭐 하고 있어?',world:{...observation(),currentAutonomousGoal:'inspect',currentAgentSkill:'MOVE_NEAR',autonomyState:'ACTING'},moru:{energy:.7,curiosity:.7,comfort:.7,attention:.7,affection:.7,sleepiness:.2,target:'WORLD'},perception:{candidates:[],deicticTarget:null},recentConversation:[],recentEvents:[]})
 assert.equal(payload.world.currentAutonomousGoal,'inspect');assert.equal(payload.world.currentAgentSkill,'MOVE_NEAR');assert.equal(payload.world.autonomyState,'ACTING');assert.equal(JSON.stringify(payload).includes('scene'),false)
})
