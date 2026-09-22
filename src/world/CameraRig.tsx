import { conversationActive } from '../conversation/session.ts'
import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, Vector3 } from 'three'
import { homeState } from './homeSpace.ts'
import type { Player } from './locomotion.ts'

// Shared mutable simulation data stays outside React render state.
function updateHeading(player: Player, yaw: number) { player.cameraYaw = yaw }

function CameraRig({ player }: { player: RefObject<Player> }) {
  const { camera, gl, size } = useThree()
  const orbit = useRef({ yaw: 0, pitch: 0.1, desiredYaw: 0, desiredPitch: 0.1, pointer: -1, x: 0, y: 0 })
  const focus = useRef(new Vector3(0, 1.3, 1))
  const desiredFocus = useRef(new Vector3())
  const distance = Math.max(11.5, 7 / (size.width / size.height))
  useEffect(() => {
    const canvas = gl.domElement
    const state = orbit.current
    function down(event: PointerEvent) {
      if(conversationActive())return
      if (event.button !== 0 || state.pointer !== -1) return
      state.pointer = event.pointerId; state.x = event.clientX; state.y = event.clientY
      canvas.setPointerCapture(event.pointerId)
    }
    function move(event: PointerEvent) {
      if(conversationActive()){stop();return}
      if (event.pointerId !== state.pointer) return
      state.desiredYaw -= (event.clientX - state.x) * 0.005
      state.desiredPitch = MathUtils.clamp(state.desiredPitch + (event.clientY - state.y) * 0.004, 0.08, 1.1)
      state.x = event.clientX; state.y = event.clientY
    }
    function stop() {
      if (state.pointer !== -1 && canvas.hasPointerCapture(state.pointer)) canvas.releasePointerCapture(state.pointer)
      state.pointer = -1
    }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', stop)
    canvas.addEventListener('pointercancel', stop)
    canvas.addEventListener('lostpointercapture', stop)
    window.addEventListener('blur', stop)
    return () => {
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', stop)
      canvas.removeEventListener('pointercancel', stop)
      canvas.removeEventListener('lostpointercapture', stop)
      window.removeEventListener('blur', stop)
      stop()
    }
  }, [gl])
  // Run before movement so input uses this frame's visible viewing direction.
  useFrame((_, delta) => {
    const state = orbit.current
    const blend = 1 - Math.exp(-9 * Math.min(delta, 0.05))
    state.yaw = MathUtils.lerp(state.yaw, state.desiredYaw, blend)
    state.pitch = MathUtils.lerp(state.pitch, state.desiredPitch, blend)
    if (Math.abs(state.yaw - state.desiredYaw) < 0.00001) state.yaw = state.desiredYaw
    if (Math.abs(state.pitch - state.desiredPitch) < 0.00001) state.pitch = state.desiredPitch
    updateHeading(player.current, state.yaw)
  }, -2)
  useFrame((_, delta) => {
    const p = player.current
    desiredFocus.current.set(p.position.x, p.groundY + (p.position.y - p.groundY) * 0.3 + 1.3, p.position.z)
    focus.current.lerp(desiredFocus.current, 1 - Math.exp(-5 * Math.min(delta, 0.05)))
    const { yaw, pitch } = orbit.current
    const followDistance = MathUtils.lerp(distance, 7, homeState.cutaway)
    const viewPitch = MathUtils.lerp(pitch, Math.max(.55, pitch), homeState.cutaway)
    camera.position.set(
      focus.current.x + Math.sin(yaw) * Math.cos(viewPitch) * followDistance,
      focus.current.y + Math.sin(viewPitch) * followDistance,
      focus.current.z + Math.cos(yaw) * Math.cos(viewPitch) * followDistance,
    )
    desiredFocus.current.copy(focus.current).y += 1.65 * (1 - homeState.cutaway)
    camera.lookAt(desiredFocus.current)
  })
  return null
}
export default CameraRig
