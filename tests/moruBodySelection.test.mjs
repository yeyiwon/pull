import { test } from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const audit=JSON.parse(readFileSync(new URL('../docs/moru-final-inventory.json',import.meta.url)))
test('seasonal rigs have matching names but incompatible rest/bind transforms',()=>{
 const base=audit.new.find(r=>r.folder==='moru')
 for(const folder of ['moru-spring','moru-winter','moru-halloween']){
  const body=audit.new.find(r=>r.folder===folder)
  assert.deepEqual(body.bones.map(b=>[b.name,b.parent]),base.bones.map(b=>[b.name,b.parent]))
  assert.notEqual(body.skeletonHash,base.skeletonHash);assert.notEqual(body.skinHash,base.skinHash)
 }
})
test('appearance persistence and stale load handling remain isolated from memory',async()=>{
 const data=new Map([['pull-moru-memory','keep-me'],['pull.moru.body.v1','waterlight'],['moruAppearance','winter']]),writes=[]
 globalThis.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>{writes.push(k);data.set(k,v)}}
 const {bodySelection,BODY_CHOICES}=await import('../src/characters/bodySelection.ts')
 assert.deepEqual(BODY_CHOICES.map(x=>x.name),['Default','Spring','Summer','Autumn','Winter','Halloween','All Black','Off Duty','Midnight Training','Pearl Ballet','Mode Sportif','Literary Chic','Concert Night','Amusement Park','Sculpted Mini','Sporty Prep','Sunshine','Platinum Noir','Black Glasses'])
 assert.equal(bodySelection.getSnapshot(),'winter')
 for(const id of ['spring','summer','autumn','winter','halloween']){bodySelection.select(id);assert.equal(bodySelection.getSnapshot(),id)}
 bodySelection.loaded('winter');assert.equal(bodySelection.getReadySnapshot(),false)
 bodySelection.loaded('halloween');assert.equal(bodySelection.getReadySnapshot(),true)
 assert.equal(data.get('moruAppearance'),'halloween');assert.equal(data.get('pull-moru-memory'),'keep-me')
 assert.ok(writes.every(k=>k==='moruAppearance'))
 for(const id of ['mode-sportif','literary-chic','concert-night','amusement-park','sculpted-mini','sporty-prep','sunshine','platinum-noir','black-glasses']){
  bodySelection.select(id);bodySelection.loaded(id)
  assert.equal(bodySelection.getSnapshot(),id);assert.equal(data.get('moruAppearance'),id)
  assert.equal(bodySelection.getReadySnapshot(),true);assert.equal(data.get('pull-moru-memory'),'keep-me')
 }
 delete globalThis.localStorage
})
test('all seven additions share canonical bone hierarchy and duplicate source bodies are not imported twice',()=>{
 const rows=JSON.parse(readFileSync(new URL('../docs/moru-wardrobe-seven-inventory.json',import.meta.url)))
 const base=audit.new.find(r=>r.folder==='moru')
 assert.equal(rows.length,14)
 for(const row of rows){
  assert.deepEqual(row.bones.map(b=>[b.name,b.parent]),base.bones.map(b=>[b.name,b.parent]))
  assert.equal(row.skinnedMeshes,1);assert.equal(row.morphTargets,0)
 }
 for(const folder of new Set(rows.map(r=>r.folder))){
  const pair=rows.filter(r=>r.folder===folder)
  assert.equal(pair.length,2);assert.equal(pair[0].meshHash,pair[1].meshHash);assert.equal(pair[0].skinHash,pair[1].skinHash)
 }
})
