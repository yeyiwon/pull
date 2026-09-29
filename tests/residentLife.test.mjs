import test from 'node:test'
import assert from 'node:assert/strict'
import {RESIDENTS,chooseResidentRoutine,residentDialogue} from '../src/world/residentLife.ts'

test('Residents v1 has three distinct residents with separate lives',()=>{
 assert.equal(RESIDENTS.length,3)
 assert.equal(new Set(RESIDENTS.map(resident=>resident.id)).size,3)
 assert.equal(new Set(RESIDENTS.map(resident=>resident.role)).size,3)
 assert.equal(new Set(RESIDENTS.map(resident=>resident.favoritePlace)).size,3)
 assert.ok(RESIDENTS.every(resident=>resident.favoriteActivities.length>=4&&resident.route.length>=4))
})

test('fireworks gather all residents at separate viewing spots',()=>{
 const choices=RESIDENTS.map(resident=>chooseResidentRoutine(resident,{hour:21,rain:false,snow:false,wind:false,fireworks:true,step:5},null))
 assert.deepEqual(choices.map(choice=>choice.activity),['FIREWORKS','FIREWORKS','FIREWORKS'])
 assert.deepEqual(choices.map(choice=>choice.action),['WALK','WALK','WALK'])
 assert.deepEqual(choices.map(choice=>choice.routeIndex),[10,11,12])
})

test('weather changes behavior without random or language-model decisions',()=>{
 for(const resident of RESIDENTS){
  const rainy=chooseResidentRoutine(resident,{hour:14,rain:true,snow:false,wind:false,fireworks:false,step:3},null)
  const repeated=chooseResidentRoutine(resident,{hour:14,rain:false,snow:false,wind:false,fireworks:false,step:2},resident.id==='mallow'?'GARDEN':resident.id==='pebble'?'RIVER':'MAKE')
  assert.equal(rainy.activity,'SHELTER')
  assert.equal(repeated.activity,'REST')
  assert.deepEqual(rainy,chooseResidentRoutine(resident,{hour:14,rain:true,snow:false,wind:false,fireworks:false,step:3},null))
 }
})

test('ambient situations and conversations remain resident-specific',()=>{
 const situations=new Set()
 for(let step=0;step<36;step++)for(const resident of RESIDENTS)situations.add(chooseResidentRoutine(resident,{hour:13,rain:false,snow:false,wind:false,fireworks:false,step},null).situation)
 assert.ok(situations.has('LOST_SEEDS'))
 assert.ok(situations.has('RIVER_WATCH'))
 assert.ok(situations.has('DROP_AND_RECOVER'))
 const lines=RESIDENTS.map(resident=>residentDialogue(resident.id,{hour:12,rain:false,snow:false,favorite:true,repeated:false}))
 assert.equal(new Set(lines).size,3)
 assert.ok(lines.every(line=>line.length>10))
})

test('five-minute deterministic routine sampling preserves action variety',()=>{
 for(const resident of RESIDENTS){
  const actions=new Set()
  let previous=null
  for(let step=0;step<60;step++){
   const choice=chooseResidentRoutine(resident,{hour:9+Math.floor(step/12),rain:step===18,snow:step===36,wind:step%7===0,fireworks:false,step},previous)
   actions.add(choice.action);previous=choice.activity
  }
  assert.ok(actions.size>=3,`${resident.name} needs visible action variety`)
 }
})
