import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createPlayer} from '../src/world/locomotion.ts'
import {LAKE_BENCH as b, WORLD_SEATS, nearestSeat, nearBench, requestBench, isSeated, updateBench} from '../src/world/bench.ts'
test('bench requires nearby grounded idle user, holds until exit and preserves movement priority',()=>{
 const p=createPlayer();assert.equal(requestBench(p),false)
 p.position.set(b.x+1,b.y,b.z);assert.ok(nearBench(p))
 p.isGrounded=false;assert.equal(requestBench(p),false);p.isGrounded=true
 assert.ok(requestBench(p));let starts=0,stops=0
 for(let i=0;i<120;i++)updateBench(p,1/60,()=>{starts++;return true},()=>stops++)
 assert.equal(starts,1);assert.ok(isSeated(p));assert.ok(Math.abs(p.position.x-b.x)<.01)
 p.touchX=.5;updateBench(p,1/60,()=>true,()=>stops++)
 assert.equal(stops,1);assert.equal(isSeated(p),false);assert.equal(p.touchX,.5)
 p.touchX=0;assert.ok(requestBench(p));assert.ok(requestBench(p));assert.ok(isSeated(p));for(let i=0;i<310;i++)updateBench(p,1/60,()=>true,()=>{});assert.equal(isSeated(p),false);assert.ok(Math.abs(p.position.x-(b.x+1.2))<.05)
})
test('missing sitting animation does not capture player',()=>{
 const p=createPlayer();p.position.set(b.x+1,b.y,b.z);requestBench(p)
 updateBench(p,.01,()=>false,()=>{});assert.equal(isSeated(p),false)
})
test('every registered chair can be selected from its approach point',()=>{
 const p=createPlayer()
 for(const seat of WORLD_SEATS){
  p.position.set(seat.x+Math.sin(seat.yaw)*1.2,seat.y,seat.z+Math.cos(seat.yaw)*1.2);p.isGrounded=true
  assert.equal(nearestSeat(p)?.id,seat.id)
 }
 assert.equal(WORLD_SEATS.filter(seat=>seat.kind==='IRON_BENCH').length,4)
 assert.ok(WORLD_SEATS.some(seat=>seat.kind==='SOFA'))
 assert.ok(WORLD_SEATS.some(seat=>seat.kind==='CHAIR'))
})

test('bench collider blocks walking through from the promenade',async()=>{
 const {WORLD_OBSTACLES,moveWithCollisions}=await import('../src/world/collision.ts')
 const {Vector3}=await import('three')
 const obstacle=WORLD_OBSTACLES.find(o=>o.x===b.x&&o.z===b.z)
 assert.ok(obstacle)
 const position=new Vector3(b.x+3,b.y,b.z)
 moveWithCollisions(position,new Vector3(-1,0,0),6,[obstacle])
 assert.ok(position.x>=b.x+obstacle.rx+.65)
})
test('cross-legged pose is only available after sitting and held clips return to locomotion',async()=>{
 const {toggleCrossLegs,benchPose,BENCH_CROSS}=await import('../src/world/bench.ts')
 const {createLocomotion}=await import('../src/world/locomotion.ts')
 const {AnimationClip,Object3D}=await import('three')
 const p=createPlayer();assert.equal(toggleCrossLegs(p),false)
 p.position.set(b.x+1.5,b.y,b.z);requestBench(p)
 assert.equal(toggleCrossLegs(p),false)
 for(let i=0;i<180;i++)updateBench(p,1/60,()=>true,()=>{})
 assert.ok(toggleCrossLegs(p));assert.equal(benchPose(p),BENCH_CROSS)
 const clip=new AnimationClip('test',1,[]),clips=Object.fromEntries(['IDLE','WALK','RUN','CONFUSED','LISTEN','JUMP','WAVE','BUBBLE_DANCE'].map(k=>[k,clip]))
 const controller=createLocomotion(new Object3D(),clips,{extras:{sit:{clip,loop:false,hold:true}}})
 controller.playExtra('sit');controller.update(p,2);controller.update(p,.1);assert.equal(controller.activeClip,'sit')
 p.groundState='WALK';controller.update(p,.1);assert.equal(controller.activeClip,'WALK');controller.dispose()
})
