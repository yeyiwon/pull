import { AnimationMixer, MathUtils, Quaternion, Vector3 } from 'three'
import type { AnimationClip, Object3D } from 'three'

export type MovementState = 'REST' | 'WALK' | 'RUN'
export const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'ShiftLeft', 'ShiftRight'])

export function createPlayer() {
  return { position: new Vector3(0, 0, 1), rotation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
    direction: new Vector3(), desiredRotation: new Quaternion(), up: new Vector3(0, 1, 0),
    keys: new Set<string>(), state: 'REST' as MovementState }
}
export type Player = ReturnType<typeof createPlayer>

export function movePlayer(player: Player, delta: number) {
  const held = (a: string, b: string) => Number(player.keys.has(a) || player.keys.has(b))
  player.direction.set(held('KeyD', 'ArrowRight') - held('KeyA', 'ArrowLeft'), 0,
    held('KeyS', 'ArrowDown') - held('KeyW', 'ArrowUp'))
  const moving = player.direction.lengthSq() > 0
  player.state = moving ? (player.keys.has('ShiftLeft') || player.keys.has('ShiftRight') ? 'RUN' : 'WALK') : 'REST'
  if (!moving) return
  player.direction.normalize()
  player.position.addScaledVector(player.direction, delta * (player.state === 'RUN' ? 4.6 : 2.1))
  // Keep the prototype on the existing 200-unit floor, without a collision system.
  player.position.x = MathUtils.clamp(player.position.x, -90, 90)
  player.position.z = MathUtils.clamp(player.position.z, -90, 90)
  player.desiredRotation.setFromAxisAngle(player.up, Math.atan2(player.direction.x, player.direction.z))
  player.rotation.slerp(player.desiredRotation, 1 - Math.exp(-10 * delta))
}

export function createLocomotion(scene: Object3D, walking: AnimationClip, running: AnimationClip) {
  const mixer = new AnimationMixer(scene)
  const actions = { WALK: mixer.clipAction(walking), RUN: mixer.clipAction(running) }
  const rest: { object: Object3D; position: Vector3; rotation: Quaternion; scale: Vector3 }[] = []
  scene.traverse((object) => {
    if (object.type === 'Bone') rest.push({ object, position: object.position.clone(), rotation: object.quaternion.clone(), scale: object.scale.clone() })
  })
  let state: MovementState = 'REST'
  let restElapsed = 0
  return {
    update(next: MovementState, delta: number) {
      if (next !== state) {
        if (next === 'REST') {
          Object.values(actions).forEach((action) => action.fadeOut(0.2))
          restElapsed = 0
        } else {
          const incoming = actions[next]
          incoming.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(0.2).play()
          Object.entries(actions).forEach(([name, action]) => { if (name !== next) action.fadeOut(0.2) })
        }
        state = next
      }
      mixer.update(delta)
      if (state === 'REST') {
        restElapsed += delta
        if (restElapsed >= 0.2) {
          mixer.stopAllAction()
          // Explicitly restore the authored default pose, never a frozen gait frame.
          rest.forEach(({ object, position, rotation, scale }) => {
            object.position.copy(position); object.quaternion.copy(rotation); object.scale.copy(scale)
          })
        }
      }
    },
    dispose() { mixer.stopAllAction(); mixer.uncacheRoot(scene) },
  }
}
