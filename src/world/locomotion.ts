import { Quaternion, Vector3 } from 'three'
import type { AnimationClip, Object3D } from 'three'
import { createMotion } from '../characters/motion.ts'
import type { ClipInfo } from '../characters/motion.ts'
import { surfaceHeight, waterDepth } from './terrain.ts'
import { updateHome } from './homeSpace.ts'
import { moveWithCollisions } from './collision.ts'

export type GroundState = 'IDLE' | 'WALK' | 'RUN'
export type UserAction = 'WAVE' | 'BUBBLE_DANCE'
export type BodyAction = UserAction | 'LISTEN' | 'CONFUSED'
export type MoruEvent = UserAction | 'JUMP' | 'LAND' | 'CONFUSED' | 'LISTEN'
export type AnimationState = GroundState | 'CONFUSED' | 'LISTEN' | 'JUMP' | UserAction
export type MovementState = AnimationState | 'AIRBORNE'
const JUMP_SPEED = 4.5
const GRAVITY = 12
export const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'Space', 'KeyE', 'Digit1', 'Digit2'])

export function createPlayer() {
  return { position: new Vector3(0, 0, 1), rotation: new Quaternion(),
    direction: new Vector3(), desiredRotation: new Quaternion(), up: new Vector3(0, 1, 0),
    headPosition: new Vector3(), events: [] as MoruEvent[], eventListeners: new Set<(event: MoruEvent) => void>(), brainRequested: false, actionRequested: null as BodyAction | null,
    keys: new Set<string>(), state: 'IDLE' as MovementState, groundState: 'IDLE' as GroundState,
    touchX: 0, touchZ: 0, cameraYaw: 0, verticalVelocity: 0, groundY: 0, waterDepth: 0, isGrounded: true, jumpRequested: false, listenRequested: false,
    agentMovement: null as { direction: Vector3; run: boolean } | null, agentInterrupted: false }
}
export type Player = ReturnType<typeof createPlayer>

// Presentation listeners observe events without draining the Brain queue.
export function emitMoruEvent(player: Player, event: MoruEvent) {
  player.events.push(event)
  for (const listener of player.eventListeners ?? []) listener(event)
}

export function setTouchIntent(player: Player, x: number, z: number) { player.touchX = x; player.touchZ = z }

// Shared entry point for buttons and keyboard. A fresh movement press cancels actions.
export function requestAction(player: Player, action: UserAction) {
  if (!player.isGrounded) return false
  player.keys.clear()
  player.touchX = 0; player.touchZ = 0
  player.actionRequested = action
  player.brainRequested = false
  return true
}

// Autonomous intent must never clear input or interrupt a user action.
export function requestBrainAction(player: Player, action: BodyAction) {
  if (!player.isGrounded || player.state !== 'IDLE' || player.actionRequested || player.jumpRequested || player.listenRequested
    || player.keys.size > 0 || player.touchX !== 0 || player.touchZ !== 0) return false
  player.actionRequested = action; player.brainRequested = true
  return true
}

export function movePlayer(player: Player, delta: number) {
  const held = (a: string, b: string) => Number(player.keys.has(a) || player.keys.has(b))
  player.direction.set(held('KeyD', 'ArrowRight') - held('KeyA', 'ArrowLeft') + player.touchX, 0,
    held('KeyS', 'ArrowDown') - held('KeyW', 'ArrowUp') + player.touchZ)
  const manualMoving = player.direction.lengthSq() > 0
  if (manualMoving && player.agentMovement) { player.agentMovement = null; player.agentInterrupted = true }
  if (!manualMoving && player.agentMovement) player.direction.copy(player.agentMovement.direction)
  const moving = player.direction.lengthSq() > 0
  player.groundState = moving ? (player.agentMovement?.run || player.keys.has('ShiftLeft') || player.keys.has('ShiftRight') || Math.hypot(player.touchX, player.touchZ) > .85 ? 'RUN' : 'WALK') : 'IDLE'
  if (moving) {
    player.direction.normalize()
    if (manualMoving) player.direction.applyAxisAngle(player.up, player.cameraYaw)
    moveWithCollisions(player.position, player.direction, delta * (player.groundState === 'RUN' ? 4.6 : 2.1) * (player.waterDepth > .12 ? .72 : 1))
    player.desiredRotation.setFromAxisAngle(player.up, Math.atan2(player.direction.x, player.direction.z))
    player.rotation.slerp(player.desiredRotation, 1 - Math.exp(-10 * delta))
  }
  updateHome(player.position.x, player.position.z, delta)
  player.groundY = surfaceHeight(player.position.x, player.position.z)
  player.waterDepth = waterDepth(player.position.x, player.position.z)
  if (player.isGrounded) player.position.y = player.groundY
  if (player.jumpRequested && player.isGrounded) {
    player.verticalVelocity = JUMP_SPEED
    player.isGrounded = false
    emitMoruEvent(player, 'JUMP')
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
      emitMoruEvent(player, 'LAND')
    }
  }
}

export function createLocomotion(scene: Object3D, clips: Record<AnimationState, AnimationClip>, { automaticObservation = false, extras = {} as Record<string, {clip: AnimationClip; loop: boolean; hold?: boolean; next?: string; layer?: string}> } = {}) {
  const sources:Record<string,AnimationClip>={...clips}
  const info:Record<string,ClipInfo>={}
  for(const name of Object.keys(clips))info[name]={layer:'BODY',loop:['IDLE','WALK','RUN'].includes(name)}
  for(const [name,entry]of Object.entries(extras)){sources[name]=entry.clip;info[name]={layer:entry.layer??'BODY',loop:entry.loop,next:entry.next}}
  const motion=createMotion(scene,sources,info,extras.Neutral?.clip)
  let active='IDLE',extra:string|null=null
  motion.play('IDLE',0)
  let gesture: 'CONFUSED' | 'LISTEN' | UserAction | null = null
  let gestureTime = 0
  let idleTime = 0
  let nextObservation = 12 + Math.random() * 8
  function transition(next:string){if(next===active)return;motion.play(next,next==='JUMP'||active==='JUMP'?.1:.25);active=next}
  return {
    get activeClip(){return extra??active},
    stopExtra(){extra=null;gesture=null;transition('IDLE')},
    playLayer(name:string){return !!info[name]&&info[name].layer!=='BODY'&&motion.play(name)},
    playExtra(name:string){if(!(name in extras))return false;gesture=null;idleTime=0;extra=name;transition(name);return true},
    update(player: Player, delta: number) {
      const requested = player.actionRequested
      const fromBrain = player.brainRequested
      player.brainRequested = false
      player.actionRequested = null
      const listen = player.listenRequested
      player.listenRequested = false
      if (!player.isGrounded || player.groundState !== 'IDLE') {
        gesture = null
        extra = null
        motion.clear('HEAD',.15)
        idleTime = 0
        transition(player.isGrounded ? player.groundState : 'JUMP')
        player.state = player.isGrounded ? player.groundState : 'AIRBORNE'
      } else {
        if(requested||listen)extra=null
        if(extra&&!extras[extra].hold&&motion.finished(extra)){const next=extras[extra].next;extra=next&&next in extras?next:null}
        if (extra) {
          player.state = 'BUBBLE_DANCE'
          motion.update(delta)
          return
        }
        if (requested && requested !== gesture) {
          gesture = requested
          gestureTime = 0
          if (!fromBrain) emitMoruEvent(player, requested)
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
          if (listen || automaticObservation && idleTime >= nextObservation) {
            gesture = listen ? 'LISTEN' : 'CONFUSED'
            emitMoruEvent(player, gesture)
            gestureTime = 0
          }
        }
        player.state = gesture ?? 'IDLE'
        transition(extra??gesture??'IDLE')
      }
      motion.update(delta)
    },
    dispose() { motion.dispose() },
  }
}
