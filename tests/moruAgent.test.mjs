import test from 'node:test'
import assert from 'node:assert/strict'
import {PerspectiveCamera,Ray,Vector3} from 'three'
import {directCommandPlan,parseActionPlan} from '../src/world/agentSkills.ts'
import {createAgentExecutor,agentDiagnostics} from '../src/world/agentExecutor.ts'
import {createPlayer,movePlayer} from '../src/world/locomotion.ts'
import {isSeated,seatApproach,WORLD_SEATS,clearBench} from '../src/world/bench.ts'
import {perceiveWorld,pointerMoveGround,setDeicticPoint} from '../src/world/worldPerception.ts'
import {agentControl} from '../src/world/agentControl.ts'
import {streamCenter} from '../src/world/terrain.ts'

test('natural direct commands become bounded semantic plans without animation names',()=>{
 const p=createPlayer(),camera=new PerspectiveCamera();camera.position.set(0,4,10);camera.lookAt(0,1,0);camera.updateMatrixWorld()
 const candidates=perceiveWorld(p,camera).candidates
 assert.deepEqual(directCommandPlan('모루야 조금 걸어봐',candidates),[{skill:'WALK_TO',target:'AHEAD_POINT',duration:null,text:null}])
 assert.equal(directCommandPlan('벤치에 앉아봐',candidates)[0]?.skill,'SIT')
 assert.equal(directCommandPlan('춤춰봐',candidates)[0]?.skill,'DANCE')
 const roundTrip=directCommandPlan('저 나무까지 뛰어가서 한번 보고 와',candidates)
 assert.deepEqual(roundTrip.map(step=>step.skill),['RUN_TO','LOOK_AT','WAIT','RUN_TO'])
 assert.deepEqual(parseActionPlan([{skill:'RUN_TO',target:'invented-object',duration:null,text:null}],candidates.map(c=>c.id)),[])
})

test('WALK_TO changes the actual player position and reports completion',()=>{
 const p=createPlayer(),executor=createAgentExecutor(),start=p.position.clone()
 assert.equal(executor.start([{skill:'WALK_TO',target:'AHEAD_POINT',duration:null,text:null}],p,'조금 걸어봐'),true)
 for(let i=0;i<300&&agentDiagnostics.result==='running';i++){executor.update(p,1/60);movePlayer(p,1/60)}
 assert.ok(p.position.distanceTo(start)>3.5)
 assert.equal(agentDiagnostics.result,'completed')
 assert.equal(p.agentMovement,null)
})

test('SIT approaches through the shared bench affordance and activates the existing seat system',()=>{
 const p=createPlayer(),seat=WORLD_SEATS[0],point=seatApproach(seat)
 p.position.copy(point);p.groundY=point.y;p.position.y=point.y
 const executor=createAgentExecutor()
 executor.start([{skill:'SIT',target:`bench-${seat.id}`,duration:null,text:null}],p,'벤치에 앉아봐')
 for(let i=0;i<4;i++){executor.update(p,1/60);movePlayer(p,1/60)}
 assert.equal(isSeated(p),true)
 clearBench(p)
})

test('a tapped ground point drives actual RUN_TO movement',()=>{
 const p=createPlayer(),executor=createAgentExecutor(),target=new Vector3(6,0,8)
 setDeicticPoint(target)
 executor.start([{skill:'RUN_TO',target:'DEICTIC_POINT',duration:null,text:null}],p,'저기로 뛰어가봐')
 for(let i=0;i<600&&agentDiagnostics.result==='running';i++){executor.update(p,1/60);movePlayer(p,1/60)}
 assert.equal(agentDiagnostics.result,'completed')
 assert.ok(Math.hypot(p.position.x-target.x,p.position.z-target.z)<.7)
 assert.ok(agentDiagnostics.maxDistanceFromStart>7)
})

test('multi-step tree command runs, looks, waits, and returns to its origin',()=>{
 const p=createPlayer(),camera=new PerspectiveCamera();camera.position.set(0,4,10);camera.lookAt(0,1,0);camera.updateMatrixWorld()
 const candidates=perceiveWorld(p,camera).candidates,plan=directCommandPlan('저 나무까지 뛰어가서 보고 와',candidates)
 const executor=createAgentExecutor();executor.start(plan,p,'저 나무까지 뛰어가서 보고 와')
 for(let i=0;i<3600&&agentDiagnostics.result==='running';i++){executor.update(p,1/60);movePlayer(p,1/60)}
 assert.equal(agentDiagnostics.result,'completed')
 assert.deepEqual(agentDiagnostics.completedSteps,['RUN_TO','LOOK_AT','WAIT','RUN_TO'])
 assert.ok(agentDiagnostics.maxDistanceFromStart>5)
 assert.ok(Math.hypot(p.position.x,p.position.z-1)<.7)
})

test('tap movement chooses walk/run, replaces the active target and rejects sky or water',()=>{
 const p=createPlayer(),executor=createAgentExecutor(),detach=agentControl.bind(executor.start)
 setDeicticPoint(new Vector3(3,0,4));assert.equal(agentControl.moveTo(p,4),true);assert.equal(agentDiagnostics.skill,'WALK_TO')
 setDeicticPoint(new Vector3(14,0,4));assert.equal(agentControl.moveTo(p,14),true);assert.equal(agentDiagnostics.skill,'RUN_TO')
 assert.equal(agentDiagnostics.command,'DIRECT_TAP')
 const sky=new Ray(new Vector3(0,3,0),new Vector3(0,.5,-1).normalize())
 assert.equal(pointerMoveGround(sky),null)
 const z=60,x=streamCenter(z),water=new Ray(new Vector3(x,20,z),new Vector3(0,-1,0))
 assert.equal(pointerMoveGround(water),null)
 detach()
})
