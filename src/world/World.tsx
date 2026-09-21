import { Component, Suspense, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPlayer, MOVE_KEYS } from './locomotion.ts'
import Character from './Character.tsx'
import Environment from './Environment.tsx'
import CameraRig from './CameraRig.tsx'


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
  const player = useRef(createPlayer())
  useEffect(() => {
    const input = player.current
    function down(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && (event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName))) return
      if (!MOVE_KEYS.has(event.code) || event.metaKey || event.ctrlKey || event.altKey) return
      event.preventDefault()
      if (!event.repeat && !input.keys.has(event.code)) {
        if (event.code === 'Space') input.jumpRequested = true
        if (event.code === 'KeyE') input.listenRequested = true
      }
      input.keys.add(event.code)
    }
    function up(event: KeyboardEvent) { input.keys.delete(event.code) }
    function reset() { input.keys.clear(); input.jumpRequested = false; input.listenRequested = false }
    function visibility() { if (document.hidden) reset() }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', reset)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      reset()
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', reset)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [])

  return (
    <>
      <color attach="background" args={['#080f20']} />
      <Environment />
      <CharacterBoundary onError={onError}>
        <Suspense fallback={null}>
          <Character player={player} onReady={onReady} />
        </Suspense>
      </CharacterBoundary>
      <CameraRig player={player} />
    </>
  )
}

export default World
