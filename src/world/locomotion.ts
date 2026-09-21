import { AnimationMixer, LoopOnce, MathUtils, Quaternion, Vector3 } from 'three'
import type { AnimationClip, Object3D } from 'three'

export type GroundState = 'IDLE' | 'WALK' | 'RUN'
export type AnimationState = GroundState | 'CONFUSED' | 'LISTEN'
export type MovementState = AnimationState | 'AIRBORNE'
export const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'Space', 'KeyE'])

export function createPlayer() {
  return { position: new Vector3(0, 0, 1), rotation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
    direction: new Vector3(), desiredRotation: new Quaternion(), up: new Vector3(0, 1, 0),
    keys: new Set<string>(), state: 'IDLE' as MovementState, groundState: 'IDLE' as GroundState,
    verticalVelocity: 0, groundY: 0, isGrounded: true, jumpRequested: false, listenRequested: false }
}
export type Player = ReturnType<typeof createPlayer>

export function movePlayer(player: Player, delta: number) {
  const held = (a: string, b: string) => Number(player.keys.has(a) || player.keys.has(b))
  player.direction.set(held('KeyD', 'ArrowRight') - held('KeyA', 'ArrowLeft'), 0,
    held('KeyS', 'ArrowDown') - held('KeyW', 'ArrowUp'))
  const moving = player.direction.lengthSq() > 0
  player.groundState = moving ? (player.keys.has('ShiftLeft') || player.keys.has('ShiftRight') ? 'RUN' : 'WALK') : 'IDLE'
  if (moving) {
    player.direction.normalize()
    player.position.addScaledVector(player.direction, delta * (player.groundState === 'RUN' ? 4.6 : 2.1))
    player.position.x = MathUtils.clamp(player.position.x, -90, 90)
    player.position.z = MathUtils.clamp(player.position.z, -90, 90)
    player.desiredRotation.setFromAxisAngle(player.up, Math.atan2(player.direction.x, player.direction.z))
    player.rotation.slerp(player.desiredRotation, 1 - Math.exp(-10 * delta))
  }
  if (player.jumpRequested && player.isGrounded) {
    player.verticalVelocity = 4.5
    player.isGrounded = false
  }
  // Consume requests even in air: a rejected jump must not queue another landing jump.
  player.jumpRequested = false
  if (!player.isGrounded) {
    player.position.y += player.verticalVelocity * delta - 0.5 * 12 * delta * delta
    player.verticalVelocity -= 12 * delta
    if (player.position.y <= player.groundY) {
      player.position.y = player.groundY
      player.verticalVelocity = 0
      player.isGrounded = true
    }
  }
}

export function createLocomotion(scene: Object3D, clips: Record<AnimationState, AnimationClip>) {
  const mixer = new AnimationMixer(scene)
  const actions = {
    IDLE: mixer.clipAction(clips.IDLE), WALK: mixer.clipAction(clips.WALK), RUN: mixer.clipAction(clips.RUN),
    CONFUSED: mixer.clipAction(clips.CONFUSED), LISTEN: mixer.clipAction(clips.LISTEN),
  }
  for (const name of ['CONFUSED', 'LISTEN'] as const) {
    actions[name].setLoop(LoopOnce, 1)
    actions[name].clampWhenFinished = true
  }
  let active: AnimationState = 'IDLE'
  let gesture: 'CONFUSED' | 'LISTEN' | null = null
  let gestureTime = 0
  let idleTime = 0
  let nextObservation = 12 + Math.random() * 8
  actions.IDLE.play()
  function transition(next: AnimationState) {
    if (next === active) return
    actions[active].fadeOut(0.25)
    actions[next].reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(0.25).play()
    active = next
  }
  return {
    update(player: Player, delta: number) {
      const listen = player.listenRequested
      player.listenRequested = false
      if (!player.isGrounded || player.groundState !== 'IDLE') {
        gesture = null
        idleTime = 0
        // No jump clip was supplied. Keep the current locomotion pose animated in air.
        if (player.isGrounded || active === 'LISTEN' || active === 'CONFUSED') transition(player.groundState)
        player.state = player.isGrounded ? player.groundState : 'AIRBORNE'
      } else {
        if (gesture) {
          gestureTime += delta
          if (gestureTime >= clips[gesture].duration) {
            gesture = null
            idleTime = 0
            nextObservation = 12 + Math.random() * 8
          }
        } else {
          idleTime += delta
          if (listen || idleTime >= nextObservation) {
            gesture = listen ? 'LISTEN' : 'CONFUSED'
            gestureTime = 0
          }
        }
        player.state = gesture ?? 'IDLE'
        transition(gesture ?? 'IDLE')
      }
      mixer.update(delta)
    },
    dispose() { mixer.stopAllAction(); mixer.uncacheRoot(scene) },
  }
}
