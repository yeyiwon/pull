import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { Box3, Group, Mesh, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import { createLocomotion, movePlayer } from './locomotion.ts'
import type { AnimationState, Player } from './locomotion.ts'

function Character({ player, onReady }: { player: RefObject<Player>; onReady: () => void }) {
  const [walkingAsset, runningAsset, idleAsset, confusedAsset, listenAsset] = useLoader(GLTFLoader,
    ['/moru/moru-walk.glb', '/moru/moru-run.glb', '/moru/moru-confused.glb', '/moru/moru-idle.glb', '/moru/moru-listen.glb'])
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
    // Export filenames for idle/confused are reversed; bind by inspected clip names.
    const sources = {
      IDLE: [idleAsset, 'Short_Breathe_and_Look_Around'], WALK: [walkingAsset, 'Walking'],
      RUN: [runningAsset, 'Running'], CONFUSED: [confusedAsset, 'Look_Around_Dumbfounded'],
      LISTEN: [listenAsset, 'Listening_Gesture'],
    } as const
    const clips = {} as Record<AnimationState, import('three').AnimationClip>
    for (const state of Object.keys(sources) as AnimationState[]) {
      const [asset, name] = sources[state]
      const clip = asset.animations.find((candidate) => candidate.name === name)
      if (!clip) throw new Error(`Missing Moru animation: ${name}`)
      clips[state] = clip
    }
    return { scene, scale: 2.8 / size.y, offset: new Vector3(-center.x, -bounds.min.y, -center.z), clips }
  }, [walkingAsset, runningAsset, idleAsset, confusedAsset, listenAsset])
  const animation = useRef<ReturnType<typeof createLocomotion> | null>(null)
  useEffect(() => {
    const controller = createLocomotion(model.scene, model.clips)
    animation.current = controller
    onReady()
    return () => { controller.dispose(); animation.current = null }
  }, [model, onReady])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    movePlayer(player.current, dt)
    animation.current?.update(player.current, dt)
    if (root.current) {
      root.current.position.copy(player.current.position)
      root.current.quaternion.copy(player.current.rotation)
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
