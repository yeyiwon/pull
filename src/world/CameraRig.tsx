import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import type { Player } from './locomotion.ts'

function CameraRig({ player }: { player: RefObject<Player> }) {
  const { camera, size } = useThree()
  const target = useRef(new Vector3())
  const focus = useRef(new Vector3(0, 1.5, 1))
  const desiredFocus = useRef(new Vector3())
  const distance = Math.max(7.5, 3.8 / (size.width / size.height))
  useEffect(() => {
    camera.position.copy(player.current.position).add(new Vector3(0, 3.4, distance))
    focus.current.copy(player.current.position).y += 1.5
    camera.lookAt(focus.current)
  }, [camera, distance, player])
  useFrame((_, delta) => {
    // Fixed world heading: W travels into the scene; reversing does not orbit the camera.
    target.current.set(player.current.position.x, player.current.position.y + 3.4, player.current.position.z + distance)
    desiredFocus.current.copy(player.current.position).y += 1.5
    const blend = 1 - Math.exp(-4 * Math.min(delta, 0.05))
    camera.position.lerp(target.current, blend)
    focus.current.lerp(desiredFocus.current, blend)
    camera.lookAt(focus.current)
  })
  return null
}
export default CameraRig
