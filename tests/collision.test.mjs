import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Vector3 } from 'three'
import { moveWithCollisions, WORLD_OBSTACLES } from '../src/world/collision.ts'
const obstacle = { x: 0, z: 0, rx: 1, rz: 1, angle: 0, bottom: 0, top: 3 }

test('blocks a direct approach without tunneling and allows a glancing slide', () => {
  const p = new Vector3(0, 0, 4)
  moveWithCollisions(p, new Vector3(0, 0, -1), 10, [obstacle])
  assert.ok(p.z >= 1.65 && p.z < 1.66)
  const slide = new Vector3(.9, 0, 3)
  moveWithCollisions(slide, new Vector3(.3, 0, -1).normalize(), 4, [obstacle])
  assert.ok(Math.hypot(slide.x, slide.z) >= 1.65)
  assert.ok(slide.x > 1.5 && slide.z < 0)
})
test('jump height is respected and the celestial Arc leaves no invisible ground wall', () => {
  const low = new Vector3(0, .8, 3), high = new Vector3(0, 4, 3)
  moveWithCollisions(low, new Vector3(0, 0, -1), 5, [obstacle])
  moveWithCollisions(high, new Vector3(0, 0, -1), 5, [obstacle])
  assert.ok(low.z >= 1.65); assert.ok(high.z < -1.9)
  const opening = new Vector3(12, 6, -54)
  moveWithCollisions(opening, new Vector3(0, 0, -1), 6)
  assert.ok(opening.z < -59.9)
  const foot = new Vector3(12, 0, -54)
  moveWithCollisions(foot, new Vector3(0, 0, -1), 6)
  assert.ok(foot.z < -59.9)
})
test('all collision placements are finite and playable boundary is retained', () => {
  assert.ok(WORLD_OBSTACLES.length > 20)
  for (const o of WORLD_OBSTACLES) assert.ok([o.x,o.z,o.rx,o.rz,o.angle,o.bottom,o.top].every(Number.isFinite) && o.rx > 0 && o.rz > 0)
  const p = new Vector3(89, 0, 0)
  moveWithCollisions(p, new Vector3(1, 0, 0), 10, [])
  assert.equal(p.x, 90)
})
