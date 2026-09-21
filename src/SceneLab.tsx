import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector2, Vector3 } from 'three'

function SceneLab() {
  const { camera, gl, size } = useThree()
  const motion = useRef({ pointer: new Vector2(), target: new Vector3() })
  // Step back on narrow screens so all three objects stay in the composition.
  const distance = Math.max(11, 4.8 / (size.width / size.height))
  const height = 0.8 + distance * 0.34

  useEffect(() => {
    camera.position.set(0, height, distance)
    camera.lookAt(0, 0.8, 0)
  }, [camera, distance, height])

  useEffect(() => {
    const canvas = gl.domElement
    const state = motion.current
    function move(event: PointerEvent) {
      const bounds = canvas.getBoundingClientRect()
      state.pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        1 - ((event.clientY - bounds.top) / bounds.height) * 2,
      )
    }
    function reset() { state.pointer.set(0, 0) }
    function release(event: PointerEvent) {
      if (event.pointerType !== 'mouse') reset()
    }
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerdown', move)
    canvas.addEventListener('pointerleave', reset)
    canvas.addEventListener('pointercancel', reset)
    canvas.addEventListener('pointerup', release)
    window.addEventListener('blur', reset)
    return () => {
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerdown', move)
      canvas.removeEventListener('pointerleave', reset)
      canvas.removeEventListener('pointercancel', reset)
      canvas.removeEventListener('pointerup', release)
      window.removeEventListener('blur', reset)
    }
  }, [gl])

  useFrame((_, delta) => {
    const { pointer, target } = motion.current
    target.set(pointer.x * 0.35, height + pointer.y * 0.2, distance)
    camera.position.lerp(target, 1 - Math.exp(-2.4 * Math.min(delta, 0.05)))
    camera.lookAt(0, 0.8, 0)
  })

  return (
    <>
      <ambientLight intensity={0.45} color="#c6d1df" />
      <directionalLight
        position={[-3, 7, 5]}
        intensity={2.2}
        color="#fff1dc"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-camera-near={0.5}
        shadow-camera-far={25}
        shadow-normalBias={0.025}
      />

      {/* PlaneGeometry starts in the XY plane; rotate it onto the XZ floor. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#1b2229" roughness={0.95} metalness={0} />
      </mesh>

      <mesh position={[-2.6, 0.85, 0.4]} castShadow receiveShadow>
        <sphereGeometry args={[0.85, 48, 32]} />
        <meshStandardMaterial color="#819c98" roughness={0.48} metalness={0.08} />
      </mesh>

      <mesh position={[0, 0.75, -0.65]} rotation={[0, Math.PI / 5, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial color="#ac927c" roughness={0.7} metalness={0.02} />
      </mesh>

      <mesh position={[2.6, 1.04, 0.3]} rotation={[0, -Math.PI / 7, 0]} castShadow receiveShadow>
        <torusGeometry args={[0.76, 0.28, 24, 80]} />
        <meshStandardMaterial color="#858fae" roughness={0.32} metalness={0.18} />
      </mesh>
    </>
  )
}

export default SceneLab
