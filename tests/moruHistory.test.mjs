import test from 'node:test'
import assert from 'node:assert/strict'
import { consider,emptyEvolution,readEvolution,renderableChanges,rendered,removeChange,expireChanges,failAsset,CHANGE_COOLDOWN } from '../src/world/evolution/history.ts'
import { propose } from '../src/world/evolution/director.ts'
import { parseEnvironmentRegistry } from '../src/environment/registry.ts'
const idea={id:'idea:leaves:1',sourceResearch:'research:leaves:1',topic:'leaves',concept:'색의 변화를 관찰하고 싶다.',association:null,evidence:'MODEL_KNOWLEDGE',kind:'IDEA'}
const p=(patch={})=>({...propose(idea,'autumn'),...patch})
const assets=()=>parseEnvironmentRegistry({version:1,assets:[{id:'reviewed',category:'vegetation',url:'/environment/reviewed.glb',season:['autumn','winter'],scaleRange:[1,1],placementType:'catalog',placements:[],lod:[],materialResponse:{wetness:true,snow:true},autonomy:{approved:true,semantics:['PLANT'],areas:['MEADOW_WEST'],radius:.5,height:1,groundOffset:.1}}]})
test('empty registry writes WAITING history; idempotent approval waits for actual render before ACTIVE',()=>{
 const data=emptyEvolution(),proposal=p()
 assert.equal(consider(data,proposal,[],'autumn',100).status,'WAITING_FOR_ASSET')
 assert.equal(data.history.length,1)
 const h=consider(data,proposal,assets(),'autumn',101)
 assert.equal(h.status,'PENDING');assert.equal(h.appliedAt,null)
 assert.equal(renderableChanges(data,assets(),'autumn',101).length,1)
 rendered(data,h.id,102);assert.equal(h.status,'ACTIVE')
 consider(data,proposal,assets(),'autumn',103);assert.equal(data.history.length,1)
 const restored=readEvolution(JSON.parse(JSON.stringify(data)))
 assert.equal(restored.history[0].status,'ACTIVE');assert.equal(renderableChanges(restored,assets(),'autumn',104).length,1)
})
test('removed/expired changes remain history, disappear from renderer and cannot recreate',()=>{
 for(const mode of ['remove','temporary','season']){
  const data=emptyEvolution(),proposal=p({lifetime:mode==='temporary'?'TEMPORARY':'SEASONAL'}),h=consider(data,proposal,assets(),'autumn',100)
  rendered(data,h.id,101)
  if(mode==='remove')removeChange(data,h.id)
  else expireChanges(data,mode==='season'?'winter':'autumn',100+CHANGE_COOLDOWN)
  assert.equal(data.history.length,1);assert.equal(renderableChanges(data,assets(),'autumn',101+CHANGE_COOLDOWN).length,0)
  consider(data,proposal,assets(),'autumn',200+CHANGE_COOLDOWN)
  assert.ok(['REMOVED','EXPIRED'].includes(h.status))
 }
})
test('persistent lifetime is retained, failed asset never claims creation and no mock mutation',()=>{
 const data=emptyEvolution(),h=consider(data,p({lifetime:'PERSISTENT'}),assets(),'autumn',100)
 rendered(data,h.id,101);expireChanges(data,'winter',100+CHANGE_COOLDOWN*5);assert.equal(h.status,'ACTIVE');assert.equal(renderableChanges(data,assets(),'winter',100+CHANGE_COOLDOWN*5).length,1)
 failAsset(data,h.id);assert.equal(h.status,'REJECTED');assert.equal(renderableChanges(data,assets(),'autumn',102).length,0)
 const mock=emptyEvolution();consider(mock,p({idea:{...idea,evidence:'MOCK'}}),assets(),'autumn',100)
 assert.equal(renderableChanges(mock,assets(),'autumn',101).length,0)
})
test('tampered transforms/paths are not rendered; current Registry and Director remain authoritative',()=>{
 const data=emptyEvolution(),h=consider(data,p(),assets(),'autumn',100)
 rendered(data,h.id,101)
 const raw=JSON.parse(JSON.stringify(data));raw.history[0].placement.position=[0,999,-9];raw.history[0].placement.url='https://evil'
 const r=renderableChanges(readEvolution(raw),assets(),'autumn',102)[0]
 assert.notEqual(r.placement.position[0],0);assert.ok(r.placement.position[1]<=0)
 assert.equal(renderableChanges(readEvolution(raw),[],'autumn',102).length,0)
 raw.history[0].proposal.scale='MAJOR';assert.equal(readEvolution(raw).history.length,0)
})
test('one daily creation reservation and bounded history prevent accumulation',()=>{
 const data=emptyEvolution();consider(data,p(),assets(),'autumn',100)
 const second=p({id:'another',idea:{...idea,id:'idea:leaves:2'}})
 assert.equal(consider(data,second,assets(),'autumn',101).reason,'CHANGE_COOLDOWN')
 for(let i=0;i<50;i++)consider(data,p({id:`waiting-${i}`}),[],'autumn',200+i)
 assert.equal(data.history.length,32)
})
