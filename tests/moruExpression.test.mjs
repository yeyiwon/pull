import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync,readFileSync } from 'node:fs'
import { MORU_ACTIONS, UNAVAILABLE_MORU_ACTIONS } from '../src/characters/actions.ts'
import { moruAnimations } from '../src/characters/assets.ts'
import { createMoruExpression } from '../src/characters/expression.ts'
import { contextCategory } from '../src/characters/ambientLines.ts'
const idle={hour:12,season:'spring',weather:'clear',inside:false,nearWater:false,idle:true}

test('body replacement preserves pending speech and semantic history',()=>{
 const m=createMoruExpression(()=>.5),detach=m.bind(()=>true)
 m.perform('wave','user',false);m.say('그대로 이어져.')
 detach();m.bind(()=>true)
 assert.equal(m.take().speech,'그대로 이어져.');assert.deepEqual(m.recentActions,['wave'])
 assert.equal(m.busy,true)
})

test('expanded categorized semantic actions resolve actual clips; rejected clips absent',()=>{
 assert.equal(MORU_ACTIONS.length,23);assert.equal(moruAnimations.length,17)
 for(const a of MORU_ACTIONS)assert.ok(UNAVAILABLE_MORU_ACTIONS.has(a.id)||a.id==='sitBack'||moruAnimations.some(clip=>clip.name===a.clip))
 assert.equal(MORU_ACTIONS.filter(a=>a.category==='dance').length,6)
 for(const file of ['moru-talk-with-hands-open.glb','clips/moru-talk-with-hands-open.glb','moru-cherish-pop-dance.glb','moru-confused.glb','clips/moru-cherish-pop-dance.glb','clips/moru-look-around-dumbfounded.glb'])assert.equal(existsSync(new URL('../public/moru/'+file,import.meta.url)),false)
 const source=readFileSync(new URL('../src/world/Character.tsx',import.meta.url),'utf8')
 assert.ok(!source.includes('FullLife')&&!source.includes('applyCharacterAppearance'))
})
test('context selection distinguishes time, weather, interior and water',()=>{
 assert.equal(contextCategory({...idle,hour:8}),'morning')
 assert.equal(contextCategory({...idle,hour:18}),'sunset')
 assert.equal(contextCategory({...idle,hour:22}),'night')
 assert.equal(contextCategory({...idle,weather:'snow'}),'snow')
 assert.equal(contextCategory({...idle,weather:'rain'}),'rain')
 assert.equal(contextCategory({...idle,weather:'snow',inside:true}),'indoor')
 assert.equal(contextCategory({...idle,nearWater:true}),'water')
})
test('one speech/emote channel prevents stacking, duplicates and rapid repeats',()=>{
 const m=createMoruExpression(()=>.5)
 assert.equal(m.say('안녕'),true);assert.equal(m.emote('heart'),false)
 assert.equal(m.take().speech,'안녕');assert.equal(m.take(),null)
 m.update(5,{...idle,idle:false});assert.equal(m.say('안녕'),false)
 assert.equal(m.say('다른 말'),true);m.take()
 m.update(5,{...idle,idle:false});assert.equal(m.offer({event:'BRAIN',speech:'자동 대사',duration:2},'ambient'),false)
 m.update(250,{...idle,idle:false});assert.equal(m.say('안녕'),true)
})
test('ambient does not dance, repeat wave, or interrupt active movement/actions',()=>{
 const m=createMoruExpression(()=>.5),played=[]
 m.bind(id=>{played.push(id);return true})
 assert.equal(m.perform('loveDance','ambient'),false)
 assert.equal(m.perform('wave'),true);assert.equal(m.perform('wave'),false)
 m.take();m.update(100,{...idle,idle:false});assert.equal(m.take(),null)
 m.update(30,idle);assert.ok(m.take()?.speech)
 assert.ok(played.every(id=>MORU_ACTIONS.find(a=>a.id===id).category!=='dance'))
})
test('ambient snow response has a real calm gesture and effects remain independent',()=>{
 const m=createMoruExpression(()=>.8),played=[]
 m.bind(id=>{played.push(id);return true});m.update(80,{...idle,weather:'snow'})
 assert.equal(m.take().speech,'발자국 남겨볼까?');assert.equal(played[0],'listen')
 m.update(10,{...idle,idle:false});assert.equal(m.emote('heart'),true);assert.equal(m.take().fx,'HEARTS')
})
