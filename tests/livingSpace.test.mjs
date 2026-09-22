import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Vector3 } from 'three'
import { createPlayer,movePlayer } from '../src/world/locomotion.ts'
import { HOME_WALLS,moveWithCollisions } from '../src/world/collision.ts'
import { HOME } from '../src/world/worldLayout.ts'
import { homeWorldPoint,homeLocalX,homeLocalZ,homeState,updateHome,DOOR } from '../src/world/homeSpace.ts'
import { BRIDGE,streamCenter,streamWidth,surfaceHeight,waterDepth,WATER_Y } from '../src/world/terrain.ts'
import { petalGeometry,ginkgoGeometry,snowflakeGeometry } from '../src/world/seasonGeometry.ts'

test('door proximity permits entering and exiting the same hollow house',()=>{
 const p=createPlayer(),start=homeWorldPoint(DOOR.x,8);p.position.set(start.x,0,start.z);p.cameraYaw=HOME.yaw;p.keys.add('KeyW')
 homeState.doorOpen=0
 for(let i=0;i<240;i++)movePlayer(p,1/60)
 assert.ok(homeState.inside);assert.ok(homeState.doorOpen>.99);assert.ok(homeLocalZ(p.position.x,p.position.z)<2)
 p.keys.clear();p.keys.add('KeyS');for(let i=0;i<300;i++)movePlayer(p,1/60)
 assert.equal(homeState.inside,false);assert.ok(homeLocalZ(p.position.x,p.position.z)>5)
 for(let i=0;i<300;i++)updateHome(0,0,1/60)
 assert.ok(homeState.doorOpen<.001)
})
test('home wall and closed door block without tunneling; open doorway alone is passable',()=>{
 const start=homeWorldPoint(DOOR.x,7),p=new Vector3(start.x,0,start.z),dir=new Vector3(-Math.sin(HOME.yaw),0,-Math.cos(HOME.yaw))
 homeState.doorOpen=0;moveWithCollisions(p,dir,8,HOME_WALLS);assert.ok(homeLocalZ(p.x,p.z)>3.5)
 homeState.doorOpen=1;moveWithCollisions(p,dir,5,HOME_WALLS);assert.ok(homeLocalZ(p.x,p.z)<3)
 const side=homeWorldPoint(-8,0),q=new Vector3(side.x,0,side.z)
 moveWithCollisions(q,new Vector3(Math.cos(HOME.yaw),0,-Math.sin(HOME.yaw)),20,HOME_WALLS)
 assert.ok(homeLocalX(q.x,q.z)<-4)
})
test('riverbed is shallow, banks continuous, bridge stays above water',()=>{
 const z=15,x=streamCenter(z)
 assert.ok(surfaceHeight(x,z)<WATER_Y);assert.ok(waterDepth(x,z)>.3&&waterDepth(x,z)<.5)
 assert.equal(surfaceHeight(x+streamWidth(z)+2,z),0)
 for(let i=-60;i<60;i++){const a=x+i*.1;assert.ok(Math.abs(surfaceHeight(a,z)-surfaceHeight(a+.1,z))<.05)}
 const bx=streamCenter(BRIDGE.z);assert.ok(surfaceHeight(bx,BRIDGE.z)>.3);assert.equal(waterDepth(bx,BRIDGE.z),0)
})
test('wading slows horizontal movement, jump lands at the current riverbed',()=>{
 const p=createPlayer();p.position.set(streamCenter(15),0,15);movePlayer(p,0)
 assert.ok(p.waterDepth>.3);const before=p.position.clone();p.keys.add('KeyW');movePlayer(p,.1)
 assert.ok(Math.abs(Math.hypot(p.position.x-before.x,p.position.z-before.z)-2.1*.1*.72)<1e-8)
 p.keys.clear();p.jumpRequested=true;for(let i=0;i<120;i++)movePlayer(p,1/60)
 assert.ok(p.isGrounded);assert.equal(p.position.y,p.groundY);assert.ok(p.position.y<WATER_Y)
})
test('procedural petal, ginkgo and six-armed crystal have finite distinct geometry',()=>{
 const shapes=[petalGeometry(),ginkgoGeometry(),snowflakeGeometry()]
 for(const g of shapes){assert.ok(g.attributes.position.count>=12);assert.ok([...g.attributes.position.array].every(Number.isFinite));g.dispose()}
 assert.notEqual(shapes[0].attributes.position.count,shapes[2].attributes.position.count)
})
