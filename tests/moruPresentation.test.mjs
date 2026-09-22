import test from 'node:test'
import assert from 'node:assert/strict'
import {speechEnvelope} from '../src/characters/presentation.ts'
test('attention pause, readable hold and fade stay within existing reaction lifetime',()=>{
 for(const duration of [1.5,2.8,8]){
  assert.equal(speechEnvelope(.2,duration).opacity,0)
  assert.equal(speechEnvelope(.8,duration).opacity,1)
  assert.equal(speechEnvelope(duration,duration).opacity,0)
  for(let age=0;age<=duration+.2;age+=.05){const p=speechEnvelope(age,duration);assert.ok(p.rise>=0&&p.rise<=6);assert.ok(p.opacity>=0&&p.opacity<=1)}
 }
})
test('reduced motion keeps fade without blur or drift',()=>{const p=speechEnvelope(1,3,true);assert.equal(p.blur,0);assert.equal(p.rise,0);assert.equal(p.opacity,1)})
