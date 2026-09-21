import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import { AnimationMixer, Box3, Vector3 } from 'three'
import { createPlayer, movePlayer, createLocomotion } from '../src/world/locomotion.ts'

// Headless tests retain the actual skin and clips; browser checks original textures.
globalThis.ProgressEvent ??= class { constructor(type, props) { Object.assign(this, { type }, props) } }
async function load(name) {
  const buffer = await readFile(new URL(`../public/moru/${name}.glb`, import.meta.url))
  const length = buffer.readUInt32LE(12)
  const json = JSON.parse(buffer.subarray(20, 20 + length))
  const binary = buffer.subarray(28 + length)
  delete json.images
  delete json.textures
  json.materials = [{}]
  json.buffers = [{ byteLength: binary.length, uri: `data:application/octet-stream;base64,${binary.toString('base64')}` }]
  return new GLTFLoader().parseAsync(JSON.stringify(json), '')
}
const files = { IDLE: 'moru-confused', WALK: 'moru-walk', RUN: 'moru-run', CONFUSED: 'moru-idle', LISTEN: 'moru-listen' }
const assets = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([key, file]) => [key, await load(file)])))
const clips = Object.fromEntries(Object.entries(assets).map(([key, asset]) => [key, asset.animations[0]]))
function setup() {
  const player = createPlayer()
  const scene = clone(assets.WALK.scene)
  scene.updateMatrixWorld(true)
  const controller = createLocomotion(scene, clips)
  return { player, scene, controller, tick(seconds, fps = 60) {
    for (let i = 0; i < Math.ceil(seconds * fps); i++) { movePlayer(player, 1 / fps); controller.update(player, 1 / fps) }
  } }
}

test('all direction keys, normalized diagonal, frame-rate independent walk/run', () => {
  for (const [key, x, z] of [['KeyW', 0, -1], ['ArrowUp', 0, -1], ['KeyS', 0, 1], ['ArrowDown', 0, 1], ['KeyA', -1, 0], ['ArrowLeft', -1, 0], ['KeyD', 1, 0], ['ArrowRight', 1, 0]]) {
    const p = createPlayer(); p.keys.add(key); movePlayer(p, 1)
    assert.ok(Math.abs(p.position.x - x * 2.1) < 1e-8)
    assert.ok(Math.abs(p.position.z - 1 - z * 2.1) < 1e-8)
  }
  for (const fps of [30, 60, 120]) for (const run of [false, true]) {
    const p = createPlayer(); p.keys.add('KeyW'); p.keys.add('KeyD'); if (run) p.keys.add('ShiftLeft')
    for (let i = 0; i < fps; i++) movePlayer(p, 1 / fps)
    assert.ok(Math.abs(p.position.distanceTo(new Vector3(0, 0, 1)) - (run ? 4.6 : 2.1)) < 1e-8)
  }
})

test('idle, walking, running jumps land once; airborne requests do not queue', () => {
  for (const fps of [30, 60, 120]) for (const keys of [[], ['KeyW'], ['KeyW', 'ShiftLeft']]) {
    const s = setup(); keys.forEach(key => s.player.keys.add(key)); s.tick(.1, fps)
    s.player.jumpRequested = true; s.tick(.2, fps)
    assert.equal(s.player.state, 'AIRBORNE'); assert.ok(s.player.position.y > .5)
    s.player.jumpRequested = true; s.player.listenRequested = true; s.tick(.2, fps)
    assert.equal(s.player.state, 'AIRBORNE')
    s.tick(1, fps); assert.equal(s.player.isGrounded, true); assert.equal(s.player.position.y, 0)
    assert.equal(s.player.verticalVelocity, 0); assert.equal(s.player.state, keys.length === 0 ? 'IDLE' : keys.length === 1 ? 'WALK' : 'RUN')
    s.controller.dispose()
  }
})

test('real gesture clips finish, movement interrupts, automatic confused returns idle', () => {
  const s = setup(); s.player.listenRequested = true; s.tick(.1)
  assert.equal(s.player.state, 'LISTEN'); s.tick(10); assert.equal(s.player.state, 'IDLE')
  s.player.listenRequested = true; s.tick(.1); s.player.keys.add('KeyW'); s.tick(.1)
  assert.equal(s.player.state, 'WALK'); s.player.keys.clear()
  for (let i = 0; i < 1300 && s.player.state !== 'CONFUSED'; i++) s.tick(1 / 60)
  assert.equal(s.player.state, 'CONFUSED'); s.tick(7); assert.equal(s.player.state, 'IDLE')
  s.player.listenRequested = true; s.tick(.1); s.player.jumpRequested = true; s.tick(.1)
  assert.equal(s.player.state, 'AIRBORNE'); s.tick(1); assert.equal(s.player.state, 'IDLE')
  s.controller.dispose()
  const remounted = createLocomotion(s.scene, clips); remounted.update(s.player, .1); remounted.dispose()
})

test('scaled export bounds and actual skin stay finite through every clip', () => {
  const s = setup(); const bounds = new Box3().setFromObject(s.scene)
  assert.ok(bounds.max.y - bounds.min.y > 1.6 && bounds.max.y - bounds.min.y < 1.8)
  for (const state of ['IDLE', 'WALK', 'RUN', 'LISTEN', 'CONFUSED']) {
    // Each clip binds against the same cloned skeleton, including cross-file clips.
    const mixer = new AnimationMixer(s.scene); mixer.clipAction(clips[state]).play(); mixer.update(clips[state].duration / 2)
    s.scene.updateMatrixWorld(true)
    const b = new Box3().setFromObject(s.scene, true)
    assert.ok(Number.isFinite(b.min.y) && b.max.y < 3 && b.min.y > -1)
    mixer.stopAllAction(); mixer.uncacheRoot(s.scene)
  }
  s.controller.dispose()
})
