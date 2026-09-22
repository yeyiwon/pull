import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { AnimationClip, AnimationUtils, Box3, Group, Mesh, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import { createLocomotion, movePlayer } from './locomotion.ts'
import type { AnimationState, Player } from './locomotion.ts'
import { moru } from '../characters/expression.ts'
import { MORU_ACTIONS } from '../characters/actions.ts'
import { moruAnimations } from '../characters/assets.ts'
import { characters } from '../characters/registry.ts'

function Character({ player, onReady }: { player: RefObject<Player>; onReady: () => void }) {
  const walkingAsset = useLoader(GLTFLoader, '/moru/moru-walk.glb')
  const animationAssets = useLoader(GLTFLoader, moruAnimations.map(a => a.url))
  const root = useRef<Group>(null)
  const model = useMemo(() => {
    const scene = clone(walkingAsset.scene)
    scene.traverse((object) => {
      if (object instanceof Mesh) { object.castShadow = true; object.receiveShadow = true; object.frustumCulled = false }
    })
    // Update every bone before measuring: this export has a 0.01 root scale.
    scene.updateMatrixWorld(true)
    const bounds = new Box3().setFromObject(scene)
    const size = bounds.getSize(new Vector3())
    const center = bounds.getCenter(new Vector3())
    const sources = Object.fromEntries(animationAssets.flatMap(asset => asset.animations.map(clip => [clip.name, clip])))
    const names = { IDLE: 'Short_Breathe_and_Look_Around', WALK: 'Walking', RUN: 'Running',
      CONFUSED: 'Short_Breathe_and_Look_Around', LISTEN: 'Listening_Gesture', JUMP: 'Hop_with_Arms_Raised',
      WAVE: 'Wave_One_Hand', BUBBLE_DANCE: 'Bubble_Dance' } as const
    const clips = {} as Record<AnimationState, import('three').AnimationClip>
    for (const state of Object.keys(names) as AnimationState[]) {
      const name = names[state]
      const clip = sources[name]
      if (!clip) throw new Error(`Missing Moru animation: ${name}`)
      clips[state] = clip.clone()
      if (state === 'JUMP') {
        // Keep the inspected hop (0.79–1.58s), not its long anticipation/recovery.
        clips[state] = AnimationUtils.subclip(clip, clip.name, 19, 38, 24)
        // The inspected export translates Hips during its leap. World motion owns
        // displacement, so retain limb rotations but make this clip in-place.
        const hips = clips[state].tracks.find((track) => track.name === 'mixamorigHips.position')
        if (!hips) throw new Error('Expected Moru jump hips track is missing')
        for (let i = 3; i < hips.values.length; i++) hips.values[i] = hips.values[i % 3]
      }
    }
    const extras: Record<string, { clip: AnimationClip; loop: boolean }> = {}
    for (const [name, source] of Object.entries(sources)) {
      if (Object.values(names).some(value => value === name)) continue
      const clip = source.clone()
      // Keep dances within the controller footprint; retain vertical body motion.
      const hips = clip.tracks.find(track => track.name === 'mixamorigHips.position')
      if (hips) for (let i = 3; i < hips.values.length; i += 3) {
        hips.values[i] = hips.values[0]; hips.values[i + 2] = hips.values[2]
      }
      extras[name] = { clip, loop: false }
    }
    const head = scene.getObjectByName('mixamorigHead')
    if (!head) throw new Error('Inspected Moru head bone is missing')
    return { scene, head, scale: 2.8 / size.y, offset: new Vector3(-center.x, -bounds.min.y, -center.z), clips, extras }
  }, [walkingAsset, animationAssets])
  const animation = useRef<ReturnType<typeof createLocomotion> | null>(null)
  useEffect(() => {
    const controller = createLocomotion(model.scene, model.clips, { extras: model.extras, automaticObservation: false })
    animation.current = controller
    characters.MORU = {
      play: (name) => { const state = (Object.keys(model.clips) as AnimationState[]).find(key => model.clips[key].name === name)
        if (!player.current.isGrounded || player.current.groundState !== 'IDLE' || player.current.jumpRequested) return false
        if (name in model.extras) return controller.playExtra(name)
        if (!state) return false
        if (state === 'JUMP') { player.current.jumpRequested = true; return true }
        if (state === 'WAVE' || state === 'BUBBLE_DANCE' || state === 'LISTEN' || state === 'CONFUSED') { player.current.actionRequested = state; return true }
        return false
      }, greet: () => { player.current.actionRequested = 'WAVE' },
      clip: 'IDLE', position: player.current.position, head: player.current.headPosition,
      anchors: [], status: `Original Moru · ${moruAnimations.length} compatible animations`,
    }
    const unbind=moru.bind(id=>{
      const action=MORU_ACTIONS.find(a=>a.id===id)
      return action?characters.MORU?.play(action.clip)??false:false
    })
    onReady()
    return () => { unbind(); controller.dispose(); animation.current = null; delete characters.MORU }
  }, [model, player, onReady])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    movePlayer(player.current, dt)
    animation.current?.update(player.current, dt)
    if (characters.MORU && animation.current) characters.MORU.clip = animation.current.activeClip
    if (root.current) {
      root.current.position.copy(player.current.position)
      root.current.quaternion.copy(player.current.rotation)
      root.current.updateMatrixWorld(true)
      model.head.getWorldPosition(player.current.headPosition)
      player.current.headPosition.addScaledVector(player.current.up, 0.85)
    }
  }, -1)

  return (
    <group ref={root} position={[0, 0, 1]} rotation={[0, Math.PI, 0]}>
      <group scale={model.scale}>
        <primitive object={model.scene} position={model.offset} dispose={null} />
      </group>
    </group>
  )
}
export default Character
