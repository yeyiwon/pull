import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import type { WorldPointer } from './World.tsx'

function CameraRig({ pointer }: { pointer: RefObject<WorldPointer> }) {
  const { camera, size } = useThree()
  const target = useRef(new Vector3())
  const focus = useRef(new Vector3(0, 1.6, 0.6))
  const distance = Math.max(10.5, 4.8 / (size.width / size.height))
  const height = 1.6 + distance * 0.16

  useEffect(() => {
    camera.position.set(1.6, height, distance)
    camera.lookAt(focus.current)
  }, [camera, distance, height])

  useFrame((_, delta) => {
    const input = pointer.current
    target.current.set(1.6 + (input.active ? input.position.x * 0.85 : 0),
      height + (input.active ? input.position.y * 0.4 : 0), distance)
    camera.position.lerp(target.current, 1 - Math.exp(-1.8 * Math.min(delta, 0.05)))
    camera.lookAt(focus.current)
  })

  return null
}

export default CameraRig
