import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Mesh, Vector2, Vector3 } from 'three'

function EnvironmentLab() {
  const { camera, gl, size } = useThree()
  const motion = useRef({ pointer: new Vector2(), target: new Vector3(), time: 0 })
  const arch = useRef<Mesh>(null)
  const satellite = useRef<Mesh>(null)
  // Step back on narrow screens so all three objects stay in the composition.
  const distance = Math.max(18, 9 / (size.width / size.height))
  const height = 2.1 + distance * 0.2

  useEffect(() => {
    camera.position.set(distance * 0.28, height, distance)
    camera.lookAt(0, 2.1, 0)
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
    const state = motion.current
    const dt = Math.min(delta, 0.05)
    state.time += dt
    state.target.set(distance * 0.28 + state.pointer.x * 0.85,
      height + state.pointer.y * 0.45, distance)
    camera.position.lerp(state.target, 1 - Math.exp(-1.5 * dt))
    camera.lookAt(0, 2.1, 0)
    if (arch.current) {
      arch.current.position.y = 3.65 + Math.sin(state.time * 0.23) * 0.12
      arch.current.rotation.y = -0.25 + Math.sin(state.time * 0.13) * 0.12
    }
    if (satellite.current) {
      satellite.current.position.y = 1.65 + Math.sin(state.time * 0.3 + 1) * 0.2
      satellite.current.rotation.y = state.time * 0.065
    }
  })

  return (
    <>
      <ambientLight intensity={0.2} color="#8098c0" />
      <directionalLight
        position={[-5, 10, 6]}
        intensity={2.4}
        color="#b7d5f5"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
        shadow-normalBias={0.03}
      />
      <pointLight position={[3, 6, -4]} color="#6c97ee" intensity={65} distance={22} decay={2} />
      <pointLight position={[-5, 2.8, 3]} color="#dfb18b" intensity={28} distance={15} decay={2} />

      {/* Low roughness catches the lights; this is not a mirror/reflection pass. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#101a2b" roughness={0.3} metalness={0.38} />
      </mesh>

      <mesh ref={arch} position={[-1.1, 3.65, -0.7]} rotation={[0.12, -0.25, -0.18]}
        scale={[1, 1.18, 0.8]} castShadow receiveShadow>
        <torusGeometry args={[2.25, 0.48, 40, 128]} />
        <meshStandardMaterial color="#7b91a8" roughness={0.28} metalness={0.65} />
      </mesh>

      <mesh position={[3.1, 2.55, -4]} rotation={[0, -0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.25, 5.1, 1.5]} />
        <meshStandardMaterial color="#364763" roughness={0.72} metalness={0.12} />
      </mesh>

      <mesh position={[-4.2, 0.95, 2.4]} castShadow receiveShadow>
        <sphereGeometry args={[0.95, 48, 32]} />
        <meshStandardMaterial color="#9c897b" roughness={0.5} metalness={0.22} />
      </mesh>

      <mesh ref={satellite} position={[3.5, 1.65, 2.3]} rotation={[0.3, 0, 0.2]} castShadow receiveShadow>
        <octahedronGeometry args={[0.85]} />
        <meshStandardMaterial color="#889eaa" roughness={0.38} metalness={0.45} flatShading />
      </mesh>
    </>
  )
}

export default EnvironmentLab
