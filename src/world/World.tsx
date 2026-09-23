import { bodySelection } from '../characters/bodySelection.ts'
import { useSyncExternalStore } from 'react'
import { useThree, useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { appearanceAssets } from '../characters/appearanceAssets.ts'
import { worldInterface } from '../ui/interface.ts'
import { conversationActive } from '../conversation/session.ts'
import { Component, Suspense, useEffect, useRef } from 'react'
import type { ReactNode, RefObject } from 'react'
import { MOVE_KEYS } from './locomotion.ts'
import { moru } from '../characters/expression.ts'
import type { Player } from './locomotion.ts'
import SpeechBubble from './SpeechBubble.tsx'
import MoruFeedback from './MoruFeedback.tsx'
import Character from './Character.tsx'
import Environment from './Environment.tsx'
import LivingWorldBridge from './LivingWorldBridge.tsx'
import DreamRenderer from '../graphics/DreamRenderer.tsx'
import WorldAudio from '../audio/WorldAudio.tsx'
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

function World({ onReady, onError, player, bubble }: { onReady: () => void; onError: () => void; player: RefObject<Player>; bubble: RefObject<HTMLDivElement | null> }) {
  const {gl}=useThree()
  const bodyId=useSyncExternalStore(bodySelection.subscribe,bodySelection.getSnapshot)
  // Outside Suspense: also evict an outfit abandoned before it finished loading.
  // Retain the selected entry during StrictMode's effect replay.
  useEffect(()=>()=>{
    if(bodySelection.getSnapshot()!==bodyId)useLoader.clear(GLTFLoader,appearanceAssets[bodyId])
  },[bodyId])
  useEffect(()=>()=>{gl.domElement.style.removeProperty('cursor')},[gl])
  const selection=useRef({x:0,y:0})
  useEffect(() => {
    const input = player.current
    function down(event: KeyboardEvent) {
      if(conversationActive())return
      if (event.target instanceof HTMLElement && (event.target.isContentEditable || event.target.closest('button,summary,[role=dialog]') || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName))) return
      if (!MOVE_KEYS.has(event.code) || event.metaKey || event.ctrlKey || event.altKey) return
      event.preventDefault()
      if (event.repeat) return
      if (!event.repeat && !input.keys.has(event.code)) {
        if (event.code === 'Space') input.jumpRequested = true
        if (event.code === 'KeyE') input.listenRequested = true
        if (event.code === 'Digit1') moru.perform('wave')
        if (event.code === 'Digit2') moru.perform('bubbleDance')
      }
      input.keys.add(event.code)
    }
    function up(event: KeyboardEvent) { input.keys.delete(event.code) }
    function reset() { input.keys.clear(); input.jumpRequested = false; input.listenRequested = false; input.actionRequested = null }
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
  }, [player])

  return (
    <>
      <color attach="background" args={['#858093']} />
      <LivingWorldBridge />
      <Environment player={player} />
      <CharacterBoundary key={bodyId} onError={onError}>
        <Suspense fallback={null}>
          <group onPointerOver={()=>{gl.domElement.style.setProperty('cursor','pointer')}} onPointerOut={()=>{gl.domElement.style.removeProperty('cursor')}} onPointerDown={e=>{selection.current={x:e.clientX,y:e.clientY}}} onPointerUp={e=>{if(Math.hypot(e.clientX-selection.current.x,e.clientY-selection.current.y)<6&&!conversationActive()){moru.perform('listen','user',false);worldInterface.open('moru')}}}><Character player={player} onReady={onReady} /></group>

        </Suspense>
      </CharacterBoundary>
      <SpeechBubble player={player} element={bubble} />
      <MoruFeedback player={player} />
      <WorldAudio player={player} />
      <DreamRenderer />
      <CameraRig player={player} />
    </>
  )
}

export default World
