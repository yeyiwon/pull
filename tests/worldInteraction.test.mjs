import test from 'node:test'
import assert from 'node:assert/strict'
import {INTERACTION_RANGES,inRange} from '../src/world/worldInteraction.ts'
import {blockWorldMovement,consumeBlockedWorldMovement} from '../src/world/worldPointer.ts'

test('interaction ranges require physical proximity and use a small exit buffer',()=>{
 assert.equal(inRange(2.24,INTERACTION_RANGES.COLLECTIBLE.action),true)
 assert.equal(inRange(2.3,INTERACTION_RANGES.COLLECTIBLE.action),false)
 assert.equal(inRange(2.3,INTERACTION_RANGES.COLLECTIBLE.action,true),true)
 assert.ok(INTERACTION_RANGES.NPC.awareness>INTERACTION_RANGES.NPC.action)
})

test('a consumed world interaction pointer cannot become tap-to-move',()=>{
 blockWorldMovement(17)
 assert.equal(consumeBlockedWorldMovement(16),false)
 assert.equal(consumeBlockedWorldMovement(17),true)
 assert.equal(consumeBlockedWorldMovement(17),false)
})
