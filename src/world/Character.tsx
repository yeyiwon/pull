import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { Box3, Group, Mesh, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import { createLocomotion, movePlayer } from './locomotion.ts'
import type { Player } from './locomotion.ts'

function Character({ player, onReady }: { player: RefObject<Player>; onReady: () => void }) {
  // Filenames are preserved: the first contains Running, the second Walking.
  const [runningAsset, walkingAsset] = useLoader(GLTFLoader,
    ['/models/character-walk.glb', '/models/character-run..glb'])
  const root = useRef<Group>(null)
  const model = useMemo(() => {
    const scene = clone(runningAsset.scene)
    scene.traverse((object) => {
      if (object instanceof Mesh) { object.castShadow = true; object.receiveShadow = true; object.frustumCulled = false }
    })
    const bounds = new Box3().setFromObject(scene)
    const size = bounds.getSize(new Vector3())
    const center = bounds.getCenter(new Vector3())
    const walking = walkingAsset.animations.find((clip) => clip.name === 'Walking')?.clone()
    const running = runningAsset.animations.find((clip) => clip.name === 'Running')?.clone()
    if (!walking || !running) throw new Error('Expected inspected Walking/Running clips are missing')
    // Both exports begin at 0.066667s. Remove the initial hold without changing assets.
    for (const clip of [walking, running]) {
      const start = Math.min(...clip.tracks.map((track) => track.times[0]))
      clip.tracks.forEach((track) => track.shift(-start))
      clip.resetDuration()
    }
    return { scene, scale: 2.8 / size.y, offset: new Vector3(-center.x, -bounds.min.y, -center.z), walking, running }
  }, [runningAsset, walkingAsset])
  const animation = useRef<ReturnType<typeof createLocomotion> | null>(null)
  useEffect(() => {
    const controller = createLocomotion(model.scene, model.walking, model.running)
    animation.current = controller
    onReady()
    return () => { controller.dispose(); animation.current = null }
  }, [model, onReady])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    movePlayer(player.current, dt)
    animation.current?.update(player.current.state, dt)
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
