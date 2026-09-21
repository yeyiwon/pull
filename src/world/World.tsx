import { Component, Suspense, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useThree } from '@react-three/fiber'
import { Vector2 } from 'three'
import Character from './Character.tsx'
import Environment from './Environment.tsx'
import CameraRig from './CameraRig.tsx'

export type WorldPointer = { position: Vector2; active: boolean }

class CharacterBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error) {
    console.error('Character could not be loaded:', error)
    this.props.onError()
  }
  render() { return this.state.failed ? null : this.props.children }
}

function World({ onReady, onError }: { onReady: () => void; onError: () => void }) {
  const { gl } = useThree()
  const pointer = useRef<WorldPointer>({ position: new Vector2(), active: false })

  useEffect(() => {
    const canvas = gl.domElement
    const input = pointer.current
    function move(event: PointerEvent) {
      const rect = canvas.getBoundingClientRect()
      input.position.set(((event.clientX - rect.left) / rect.width) * 2 - 1,
        1 - ((event.clientY - rect.top) / rect.height) * 2)
      input.active = true
    }
    function reset() { input.active = false; input.position.set(0, 0) }
    function release(event: PointerEvent) { if (event.pointerType !== 'mouse') reset() }
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

  return (
    <>
      <color attach="background" args={['#080f20']} />
      <Environment />
      <CharacterBoundary onError={onError}>
        <Suspense fallback={null}>
          <Character pointer={pointer} onReady={onReady} />
        </Suspense>
      </CharacterBoundary>
      <CameraRig pointer={pointer} />
    </>
  )
}

export default World
