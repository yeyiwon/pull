import { AnimationMixer, LoopOnce, MathUtils, Quaternion, Vector3 } from 'three'
import type { AnimationClip, Object3D } from 'three'
import { moveWithCollisions } from './collision.ts'

export type GroundState = 'IDLE' | 'WALK' | 'RUN'
export type UserAction = 'WAVE' | 'BUBBLE_DANCE'
export type MoruEvent = UserAction | 'JUMP' | 'LAND' | 'CONFUSED' | 'LISTEN'
export type AnimationState = GroundState | 'CONFUSED' | 'LISTEN' | 'JUMP' | UserAction
export type MovementState = AnimationState | 'AIRBORNE'
const JUMP_SPEED = 4.5
const GRAVITY = 12
export const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'Space', 'KeyE', 'Digit1', 'Digit2'])

export function createPlayer() {
  return { position: new Vector3(0, 0, 1), rotation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
    direction: new Vector3(), desiredRotation: new Quaternion(), up: new Vector3(0, 1, 0),
    headPosition: new Vector3(), events: [] as MoruEvent[], actionRequested: null as UserAction | null,
    keys: new Set<string>(), state: 'IDLE' as MovementState, groundState: 'IDLE' as GroundState,
    touchX: 0, touchZ: 0, cameraYaw: 0, verticalVelocity: 0, groundY: 0, isGrounded: true, jumpRequested: false, listenRequested: false }
}
export type Player = ReturnType<typeof createPlayer>

export function setTouchIntent(player: Player, x: number, z: number) { player.touchX = x; player.touchZ = z }

// Shared entry point for buttons and keyboard. A fresh movement press cancels actions.
export function requestAction(player: Player, action: UserAction) {
  if (!player.isGrounded) return false
  player.keys.clear()
  player.touchX = 0; player.touchZ = 0
  player.actionRequested = action
  return true
}

export function movePlayer(player: Player, delta: number) {
  const held = (a: string, b: string) => Number(player.keys.has(a) || player.keys.has(b))
  player.direction.set(held('KeyD', 'ArrowRight') - held('KeyA', 'ArrowLeft') + player.touchX, 0,
    held('KeyS', 'ArrowDown') - held('KeyW', 'ArrowUp') + player.touchZ)
  const moving = player.direction.lengthSq() > 0
  player.groundState = moving ? (player.keys.has('ShiftLeft') || player.keys.has('ShiftRight') || Math.hypot(player.touchX, player.touchZ) > .85 ? 'RUN' : 'WALK') : 'IDLE'
  if (moving) {
    player.direction.normalize().applyAxisAngle(player.up, player.cameraYaw)
    moveWithCollisions(player.position, player.direction, delta * (player.groundState === 'RUN' ? 4.6 : 2.1))
    player.desiredRotation.setFromAxisAngle(player.up, Math.atan2(player.direction.x, player.direction.z))
    player.rotation.slerp(player.desiredRotation, 1 - Math.exp(-10 * delta))
  }
  if (player.jumpRequested && player.isGrounded) {
    player.verticalVelocity = JUMP_SPEED
    player.isGrounded = false
    player.events.push('JUMP')
  }
  // Consume requests even in air: a rejected jump must not queue another landing jump.
  player.jumpRequested = false
  if (!player.isGrounded) {
    player.position.y += player.verticalVelocity * delta - 0.5 * GRAVITY * delta * delta
    player.verticalVelocity -= GRAVITY * delta
    if (player.position.y <= player.groundY) {
      player.position.y = player.groundY
      player.verticalVelocity = 0
      player.isGrounded = true
      player.events.push('LAND')
    }
  }
}

export function createLocomotion(scene: Object3D, clips: Record<AnimationState, AnimationClip>) {
  const mixer = new AnimationMixer(scene)
  const actions = {
    IDLE: mixer.clipAction(clips.IDLE), WALK: mixer.clipAction(clips.WALK), RUN: mixer.clipAction(clips.RUN),
    CONFUSED: mixer.clipAction(clips.CONFUSED), LISTEN: mixer.clipAction(clips.LISTEN), JUMP: mixer.clipAction(clips.JUMP),
    WAVE: mixer.clipAction(clips.WAVE), BUBBLE_DANCE: mixer.clipAction(clips.BUBBLE_DANCE),
  }
  for (const name of ['CONFUSED', 'LISTEN', 'JUMP', 'WAVE', 'BUBBLE_DANCE'] as const) {
    actions[name].setLoop(LoopOnce, 1)
    actions[name].clampWhenFinished = true
  }
  let active: AnimationState = 'IDLE'
  let gesture: 'CONFUSED' | 'LISTEN' | UserAction | null = null
  let gestureTime = 0
  let idleTime = 0
  let nextObservation = 12 + Math.random() * 8
  actions.IDLE.play()
  const names = Object.keys(actions) as AnimationState[]
  const weights = Object.fromEntries(names.map(name => [name, 0])) as Record<AnimationState, number>
  let blendTime = 1
  let blendDuration = 0.25
  function transition(next: AnimationState) {
    if (next === active) return
    blendDuration = next === 'JUMP' || active === 'JUMP' ? 0.1 : 0.25
    blendTime = 0
    for (const name of names) weights[name] = actions[name].getEffectiveWeight() * Number(actions[name].isScheduled())
    actions[next].reset().setEffectiveTimeScale(1).setEffectiveWeight(weights[next]).play()
    active = next
  }
  return {
    update(player: Player, delta: number) {
      const requested = player.actionRequested
      player.actionRequested = null
      const listen = player.listenRequested
      player.listenRequested = false
      if (!player.isGrounded || player.groundState !== 'IDLE') {
        gesture = null
        idleTime = 0
        transition(player.isGrounded ? player.groundState : 'JUMP')
        player.state = player.isGrounded ? player.groundState : 'AIRBORNE'
      } else {
        if (requested && requested !== gesture) {
          gesture = requested
          gestureTime = 0
          player.events.push(requested)
        }
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
            player.events.push(gesture)
            gestureTime = 0
          }
        }
        player.state = gesture ?? 'IDLE'
        transition(gesture ?? 'IDLE')
      }
      blendTime += delta
      const blend = Math.min(1, blendTime / blendDuration)
      for (const name of names) {
        const action = actions[name]
        if (action.isScheduled()) {
          action.setEffectiveWeight(MathUtils.lerp(weights[name], name === active ? 1 : 0, blend))
          if (blend === 1 && name !== active) action.stop()
        }
      }
      mixer.update(delta)
    },
    dispose() { mixer.stopAllAction(); mixer.uncacheRoot(scene) },
  }
}
