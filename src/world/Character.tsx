import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { AnimationMixer, Box3, Group, MathUtils, Mesh, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { WorldPointer } from './World.tsx'

function Character({ pointer, onReady }: {
  pointer: RefObject<WorldPointer>
  onReady: () => void
}) {
  // useLoader caches this URL; geometry, materials and embedded textures stay shared.
  const gltf = useLoader(GLTFLoader, '/models/character.glb')
  const root = useRef<Group>(null)
  const motion = useRef({ time: 0, hop: 1, center: new Vector3() })
  const model = useMemo(() => {
    // The inspected asset has one static mesh and no skeleton.
    const scene = gltf.scene.clone(true)
    scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true
        object.receiveShadow = true
      }
    })
    const bounds = new Box3().setFromObject(scene)
    const size = bounds.getSize(new Vector3())
    const center = bounds.getCenter(new Vector3())
    const scale = 2.8 / Math.max(size.y, 0.001)
    return { scene, scale, offset: new Vector3(-center.x, -bounds.min.y, -center.z) }
  }, [gltf])
  const idle = useMemo(() => gltf.animations.find((clip) =>
    /(^|[\s_.|-])idle([\s_.|\d-]|$)/i.test(clip.name)), [gltf])
  const mixer = useMemo(() => new AnimationMixer(model.scene), [model.scene])

  useEffect(() => {
    if (!idle) return
    const action = mixer.clipAction(idle)
    action.reset().play()
    return () => { mixer.stopAllAction(); mixer.uncacheRoot(model.scene) }
  }, [idle, mixer, model.scene])

  useEffect(() => { onReady() }, [onReady])

  useFrame(({ camera, size }, delta) => {
    if (!root.current) return
    const dt = Math.min(delta, 0.05)
    const state = motion.current
    state.time += dt
    state.hop = Math.min(1, state.hop + dt / 0.9)
    if (idle) mixer.update(dt)

    // Compare the pointer with the projected torso, not with guessed bone names.
    state.center.set(0, 1.5, 1).project(camera)
    const dx = (pointer.current.position.x - state.center.x) * size.width / size.height
    const dy = pointer.current.position.y - state.center.y
    const near = pointer.current.active ? Math.max(0, 1 - Math.hypot(dx, dy) / 0.65) : 0
    const blend = 1 - Math.exp(-2.8 * dt)
    root.current.rotation.y = MathUtils.lerp(root.current.rotation.y,
      MathUtils.clamp(dx * 0.2, -0.07, 0.07) * near, blend)
    root.current.rotation.x = MathUtils.lerp(root.current.rotation.x,
      -MathUtils.clamp(dy * 0.12, -0.035, 0.035) * near, blend)
    const breath = idle ? 0 : Math.sin(state.time * 1.1) * 0.003
    root.current.scale.y = 1 + breath
    root.current.position.y = Math.sin(state.hop * Math.PI) ** 2 * 0.12
  })

  return (
    <group ref={root} position={[0, 0, 1]} onClick={(event) => {
      event.stopPropagation()
      motion.current.hop = 0
    }}>
      <group scale={model.scale}>
        <primitive object={model.scene} position={model.offset} dispose={null} />
      </group>
    </group>
  )
}

export default Character
