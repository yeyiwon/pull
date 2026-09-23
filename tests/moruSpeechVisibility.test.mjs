import test from 'node:test'
import assert from 'node:assert/strict'
import {initialSpeech,speechDuration} from '../src/characters/presentation.ts'
import {createMoruExpression} from '../src/characters/expression.ts'
test('reduced motion renders the full reply instead of an empty typing placeholder',()=>{
 assert.equal(initialSpeech('왔네.',true,true),'왔네.')
 assert.equal(initialSpeech('왔네.',true,false),'')
 assert.equal(initialSpeech('왔네.',false,false),'왔네.')
})
test('long replies have reading time after typing and survive the expression duration cap',()=>{
 const text='가'.repeat(120),duration=speechDuration(text),m=createMoruExpression()
 m.offer({event:'BRAIN',speech:text,typing:true,duration},'conversation')
 assert.equal(m.take().duration,duration);assert.ok(duration-120*.055>=4)
})
test('busy presentation retains ambient speech but direct replies can preempt it',()=>{
 const m=createMoruExpression();m.offer({event:'BRAIN',speech:'기다리는 말',duration:3})
 assert.equal(m.take(false),null);assert.equal(m.take().speech,'기다리는 말')
 m.offer({event:'BRAIN',speech:'대답',typing:true,duration:5},'conversation')
 assert.equal(m.take(false).speech,'대답')
})
