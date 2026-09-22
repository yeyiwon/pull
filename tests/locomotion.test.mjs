import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import { AnimationMixer, AnimationUtils, Box3, Vector3 } from 'three'
import { createPlayer, movePlayer, createLocomotion, requestAction } from '../src/world/locomotion.ts'

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
const files = { IDLE: 'moru-idle', WALK: 'moru-walk', RUN: 'moru-run', CONFUSED: 'moru-idle', LISTEN: 'moru-listen', JUMP: 'moru-raised', WAVE: 'moru-wave-one-hand', BUBBLE_DANCE: 'moru-bubble-dance' }
const assets = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([key, file]) => [key, await load(file)])))
const clips = Object.fromEntries(Object.entries(assets).map(([key, asset]) => [key, asset.animations[0]]))
clips.JUMP = AnimationUtils.subclip(clips.JUMP, clips.JUMP.name, 19, 38, 24)
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
    const p = createPlayer(); p.position.set(-45,0,1); p.keys.add('KeyW'); p.keys.add('KeyD'); if (run) p.keys.add('ShiftLeft')
    for (let i = 0; i < fps; i++) movePlayer(p, 1 / fps)
    assert.ok(Math.abs(p.position.distanceTo(new Vector3(-45, 0, 1)) - (run ? 4.6 : 2.1)) < 1e-8)
  }
})

test('idle, walking, running jumps land once; airborne requests do not queue', () => {
  for (const fps of [30, 60, 120]) for (const keys of [[], ['KeyW'], ['KeyW', 'ShiftLeft']]) {
    const s = setup(); keys.forEach(key => s.player.keys.add(key)); s.tick(.1, fps)
    s.player.jumpRequested = true; s.tick(.2, fps)
    assert.equal(s.player.state, 'AIRBORNE'); assert.ok(s.player.position.y > .5)
    s.player.jumpRequested = true; s.player.listenRequested = true; s.tick(.2, fps)
    assert.equal(s.player.state, 'AIRBORNE')
    s.tick(1, fps); assert.equal(s.player.isGrounded, true); assert.equal(s.player.position.y, s.player.groundY)
    assert.equal(s.player.verticalVelocity, 0); assert.equal(s.player.state, keys.length === 0 ? 'IDLE' : keys.length === 1 ? 'WALK' : 'RUN')
    s.controller.dispose()
  }
})

test('real gesture clips finish, movement interrupts, idle never starts removed look-around', () => {
  const s = setup(); s.player.listenRequested = true; s.tick(.1)
  assert.equal(s.player.state, 'LISTEN'); s.tick(10); assert.equal(s.player.state, 'IDLE')
  s.player.listenRequested = true; s.tick(.1); s.player.keys.add('KeyW'); s.tick(.1)
  assert.equal(s.player.state, 'WALK'); s.player.keys.clear()
  s.tick(30); assert.equal(s.player.state, 'IDLE')
  s.player.listenRequested = true; s.tick(.1); s.player.jumpRequested = true; s.tick(.1)
  assert.equal(s.player.state, 'AIRBORNE'); s.tick(1); assert.equal(s.player.state, 'IDLE')
  s.controller.dispose()
  const remounted = createLocomotion(s.scene, clips); remounted.update(s.player, .1); remounted.dispose()
})

test('scaled export bounds and actual skin stay finite through every clip', () => {
  const s = setup(); const bounds = new Box3().setFromObject(s.scene)
  assert.ok(bounds.max.y - bounds.min.y > 1.6 && bounds.max.y - bounds.min.y < 1.8)
  for (const state of ['IDLE', 'WALK', 'RUN', 'LISTEN', 'CONFUSED', 'JUMP']) {
    // Each clip binds against the same cloned skeleton, including cross-file clips.
    const mixer = new AnimationMixer(s.scene); mixer.clipAction(clips[state]).play(); mixer.update(clips[state].duration / 2)
    s.scene.updateMatrixWorld(true)
    const b = new Box3().setFromObject(s.scene, true)
    assert.ok(Number.isFinite(b.min.y) && b.max.y < 3 && b.min.y > -1)
    mixer.stopAllAction(); mixer.uncacheRoot(s.scene)
  }
  s.controller.dispose()
})

test('airborne plays Hop_with_Arms_Raised at original speed and restarts on the next jump', () => {
  const s = setup()
  const reference = clone(assets.WALK.scene)
  const mixer = new AnimationMixer(reference)
  const action = mixer.clipAction(clips.JUMP)
  for (let jump = 0; jump < 2; jump++) {
    s.player.jumpRequested = true
    s.tick(.2)
    action.reset().play()
    mixer.update(.2)
    const actual = s.scene.getObjectByName('mixamorigLeftUpLeg')
    const expected = reference.getObjectByName('mixamorigLeftUpLeg')
    assert.ok(actual.quaternion.clone().normalize().angleTo(expected.quaternion.clone().normalize()) < 1e-5)
    s.tick(1)
    assert.equal(s.player.state, 'IDLE')
  }
  mixer.stopAllAction(); mixer.uncacheRoot(reference); s.controller.dispose()
})

test('camera-relative movement preserves idle facing and can reach the landmark', () => {
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2, Math.PI * 2]) {
    const p = createPlayer(); const facing = p.rotation.clone(); p.cameraYaw = yaw
    movePlayer(p, 1 / 60); assert.ok(p.rotation.angleTo(facing) < 1e-7)
    p.keys.add('KeyW')
    for (let i = 0; i < 60; i++) movePlayer(p, 1 / 60)
    const expected = new Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)).multiplyScalar(2.1).add(new Vector3(0, 0, 1))
    assert.ok(p.position.distanceTo(expected) < 1e-7)
  }
  const p = createPlayer(); p.keys.add('KeyW'); p.keys.add('ShiftLeft')
  // The enlarged home is a real obstacle. Reach the landmark via its west side,
  // rather than asserting that a straight line may pass through its wall.
  for(const target of [new Vector3(0,0,-38),new Vector3(12,0,-57)]){
    for(let i=0;i<1200&&Math.hypot(target.x-p.position.x,target.z-p.position.z)>.15;i++){
      p.cameraYaw=-Math.atan2(target.x-p.position.x,p.position.z-target.z)
      movePlayer(p,1/60)
    }
  }
  assert.ok(p.position.distanceTo(new Vector3(12, 0, -57)) < 3)
})

test('Wave and Dance one-shots finish, cancel for movement, reject airborne requests', () => {
  for (const action of ['WAVE', 'BUBBLE_DANCE']) {
    const s = setup()
    s.player.keys.add('KeyW'); s.player.keys.add('ShiftLeft'); s.tick(.3)
    assert.equal(s.player.state, 'RUN')
    assert.equal(requestAction(s.player, action), true)
    const start = s.player.position.clone(); s.tick(.4)
    assert.equal(s.player.state, action); assert.ok(s.player.position.equals(start))
    s.tick(clips[action].duration + .5); assert.equal(s.player.state, 'IDLE')
    requestAction(s.player, action); s.tick(.3); s.player.keys.add('KeyW'); s.tick(.3)
    assert.equal(s.player.state, 'WALK')
    s.player.keys.clear(); s.player.jumpRequested = true; s.tick(.1)
    assert.equal(requestAction(s.player, action), false)
    s.tick(1); assert.equal(s.player.state, 'IDLE')
    // Rapid transitions must still settle without stranded actions or invalid bone poses.
    for (let i = 0; i < 8; i++) { requestAction(s.player, i % 2 ? 'WAVE' : 'BUBBLE_DANCE'); s.tick(.05) }
    s.tick(10); assert.equal(s.player.state, 'IDLE')
    s.scene.traverse(o => { if (o.isBone) assert.ok(o.quaternion.toArray().every(Number.isFinite)) })
    s.controller.dispose()
  }
})

test('all retained locomotion sources have no facial morph controls', async () => {
  for (const asset of Object.values(assets)) {
    let bones = 0
    asset.scene.traverse(object => {
      if (object.isBone) bones++
      if (object.isMesh) {
        assert.deepEqual(Object.keys(object.morphTargetDictionary ?? {}), [])
        assert.equal(object.morphTargetInfluences?.length ?? 0, 0)
        assert.equal(object.geometry.morphAttributes.position?.length ?? 0, 0)
      }
    })
    assert.equal(bones, 23)
    assert.ok(asset.animations.every(c => c.tracks.every(t => !t.name.includes('morphTargetInfluences'))))
  }
})

test('new one-shot actions complete, reject idle interruption and cancel on movement/jump', async () => {
 const asset = await load('clips/moru-pod-baby-groove')
 const clip = asset.animations[0]
 const scene = clone(assets.WALK.scene), p = createPlayer()
 const c = createLocomotion(scene, clips, { extras: { PodGroove: {clip, loop:false} } })
 const tick = seconds => { for(let i=0;i<Math.ceil(seconds*60);i++){movePlayer(p,1/60);c.update(p,1/60)} }
 assert.equal(c.playExtra('PodGroove'),true);tick(13)
 assert.equal(c.activeClip,'PodGroove'); assert.equal(p.state,'BUBBLE_DANCE')
 tick(4);assert.equal(c.activeClip,'IDLE')
 c.playExtra('PodGroove');p.keys.add('KeyW');tick(.2);assert.equal(c.activeClip,'WALK')
 p.keys.clear();tick(.2);c.playExtra('PodGroove');p.jumpRequested=true;tick(.1)
 assert.equal(c.activeClip,'JUMP');tick(1);assert.equal(p.state,'IDLE')
 c.dispose()
})
