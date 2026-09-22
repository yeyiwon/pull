import test from 'node:test'
import assert from 'node:assert/strict'
import {worldTime,refreshWorldTime,advancePresentation,sampleTime,DAY_PREVIEWS} from '../src/world/worldTime.ts'
import {observeWorld} from '../src/world/brain/observation.ts'
import {createPlayer} from '../src/world/locomotion.ts'
test('preview changes rendering but not canonical Brain time or season',()=>{
 const date=new Date(2026,8,22,13,30)
 worldTime.override=0;worldTime.seasonOverride={season:'winter',progress:.5};refreshWorldTime(date)
 const o=observeWorld(createPlayer(),{idle:0,interacted:false,returned:false,actions:[],speech:[]})
 assert.equal(worldTime.current.phase,'NIGHT');assert.equal(o.hour,13.5);assert.equal(o.timeOfDay,'DAY');assert.equal(o.season,'autumn');assert.equal(o.skyEvent,null)
 worldTime.override=null;worldTime.seasonOverride=null;refreshWorldTime(date)
 assert.equal(worldTime.current.hour,13.5)
})
test('presentation converges smoothly across midnight without changing canonical clock',()=>{
 worldTime.presentation=sampleTime(23.9);worldTime.current=sampleTime(.1)
 const before=worldTime.canonical.date.getTime()
 advancePresentation(1/60);assert.ok(worldTime.presentation.hour>23.9)
 for(let i=0;i<300;i++)advancePresentation(1/60)
 assert.ok(Math.abs(worldTime.presentation.hour-.1)<.001)
 assert.equal(worldTime.canonical.date.getTime(),before)
 assert.equal(DAY_PREVIEWS.length,6)
})
