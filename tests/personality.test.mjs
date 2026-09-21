import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createPlayer } from '../src/world/locomotion.ts'
import { createPersonality } from '../src/world/personality.ts'

test('silence is default, bubbles are short and cooldown prevents stacking', () => {
  const p = createPlayer(); const rules = createPersonality(() => 0, { greet: false })
  assert.equal(rules.update(p, 10), null)
  p.events.push('WAVE'); const first = rules.update(p, .01)
  assert.equal(first.speech, '안녕'); assert.equal(first.duration, 2.5)
  p.events.push('BUBBLE_DANCE'); assert.equal(rules.update(p, 1), null)
  p.state = 'WALK'; rules.update(p, 39)
  p.events.push('WAVE'); assert.equal(rules.update(p, .01).speech, 'ㅎㅇ')
  assert.equal(p.events.length, 0)
})
test('repeated jumps, long rest and tired stop use separate event rules', () => {
  const p = createPlayer(); const rules = createPersonality(() => 0, { greet: false })
  p.events.push('JUMP'); assert.equal(rules.update(p, 1), null)
  p.events.push('JUMP'); assert.equal(rules.update(p, 1), null)
  p.events.push('JUMP'); assert.equal(rules.update(p, 1).speech, '또?')
  const idle = createPersonality(() => 0, { greet: false })
  assert.equal(idle.update(p, 39), null); assert.equal(idle.update(p, 2).event, 'LONG_IDLE')
  const tired = createPersonality(() => 0, { greet: false })
  p.state = 'RUN'; assert.equal(tired.update(p, 9), null)
  p.state = 'IDLE'; assert.equal(tired.update(p, .1).event, 'RUN_STOP')
})
test('probability may keep explicit actions silent', () => {
  const p = createPlayer(); const rules = createPersonality(() => .99)
  p.events.push('WAVE', 'BUBBLE_DANCE', 'CONFUSED')
  assert.equal(rules.update(p, 1), null)
})

test('automatic look-around does not prevent a long-idle thought', () => {
  const p = createPlayer(); const rules = createPersonality(() => 0, { greet: false })
  assert.equal(rules.update(p, 20), null)
  p.state = 'CONFUSED'; assert.equal(rules.update(p, 6), null)
  p.state = 'IDLE'; assert.equal(rules.update(p, 15).event, 'LONG_IDLE')
})

test('reaction FX are independent channels with sparse, typed action mappings', () => {
  for (const [event, expected] of [['WAVE', 'SPARKLES'], ['BUBBLE_DANCE', 'HEARTS'], ['CONFUSED', 'QUESTION'], ['LISTEN', 'SPARKLES']]) {
    const p = createPlayer(); const rules = createPersonality(() => 0, { greet: false })
    p.events.push(event); const reaction = rules.update(p, .1)
    assert.equal(reaction.fx, expected)
    assert.equal(reaction.expression, undefined)
    assert.equal(reaction.sound, undefined)
    p.events.push(event); assert.equal(rules.update(p, 1), null)
  }
  const p = createPlayer(); const rules = createPersonality(() => .6)
  p.events.push('BUBBLE_DANCE')
  const reaction = rules.update(p, .1)
  assert.equal(reaction.fx, 'JOY'); assert.equal(reaction.speech, undefined)
})

test('entry is optional and late-night context stays sparse', () => {
 const p = createPlayer(); const r = createPersonality(() => 0)
 assert.equal(r.update(p, 5, 2).event, 'ENTRY')
 assert.equal(r.mood, 'sleepy')
 assert.equal(r.update(p, 1, 2), null)
 p.state = 'WALK'; r.update(p, 94, 2)
 p.state = 'IDLE'; assert.equal(r.update(p, 1, 2).event, 'LATE_NIGHT')
 assert.equal(r.update(p, 1, 2), null)
})
