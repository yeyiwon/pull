import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BRIDGE, lakeWidthV3, streamCenter } from '../src/world/terrain.ts'
import { connectedPromenadeRoute, promenadeHalfWidth, bridgePromenadeRoute, housePromenadeRoute, promenadeBank, promenadeRoute, LAMP_STATIONS, lampPoint } from '../src/world/lakesideRoute.ts'

test('candidate lake has a broad basin while the approved bridge width stays unchanged',()=>{
 assert.ok(lakeWidthV3(94)>75)
 assert.ok(lakeWidthV3(64)>55)
 assert.equal(lakeWidthV3(166),0)
 assert.equal(BRIDGE.z,-9)
 assert.ok(BRIDGE.halfLength<8)
})

test('house and bridge routes join one continuous promenade outside the lake',()=>{
 const route=promenadeRoute(),house=housePromenadeRoute(),bridge=bridgePromenadeRoute()
 assert.ok(route.getPoint(0).distanceTo(house.getPoint(1))<.001)
 assert.ok(route.getPoint(1).distanceTo(bridge.getPoint(1))<.001)
 for(let i=0;i<=500;i++){
  const p=route.getPoint(i/500),bank=Math.abs(p.x-streamCenter(p.z))-lakeWidthV3(p.z)
  assert.ok(bank>=-.1,`promenade enters water at ${p.x},${p.z}`)
  if(i>0)assert.ok(p.distanceTo(route.getPoint((i-1)/500))<3)
 }
})

test('lamps sit beside the route with varied spacing',()=>{
 assert.ok(LAMP_STATIONS.length>=12)
 for(const {z,side} of LAMP_STATIONS){const lamp=lampPoint(z,side),bank=promenadeBank(z,side);assert.ok(Math.abs(lamp.x-bank.x)>4)}
 const gaps=LAMP_STATIONS.filter(s=>s.side===1).slice(1).map((s,i)=>s.z-LAMP_STATIONS[i].z)
 assert.ok(new Set(gaps).size>1)
})

test('tonight path is one continuous dry ribbon from house to bridge',()=>{
 const route=connectedPromenadeRoute()
 assert.ok(route.getPoint(0).distanceTo(housePromenadeRoute().getPoint(0))<1e-6)
 assert.ok(route.getPoint(1).distanceTo(bridgePromenadeRoute().getPoint(0))<1e-6)
 for(let i=0;i<=1600;i++){
  const p=route.getPoint(i/1600),t=route.getTangent(i/1600)
  assert.ok(Number.isFinite(p.x)&&Number.isFinite(t.x))
  if(p.z>32&&p.z<158){
   const margin=Math.abs(p.x-streamCenter(p.z))-lakeWidthV3(p.z)
   assert.ok(margin>promenadeHalfWidth(p.z)*1.32,`wet path edge at ${p.z}: ${margin}`)
  }
  if(i)assert.ok(p.distanceTo(route.getPoint((i-1)/1600))<1.5)
 }
 assert.ok(promenadeHalfWidth(60)*2>=7)
})
