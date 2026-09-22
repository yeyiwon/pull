import { useCallback, useRef, useState, useSyncExternalStore } from 'react'
import { Canvas } from '@react-three/fiber'
import { PCFShadowMap } from 'three'
import { createPlayer } from './world/locomotion.ts'
import World from './world/World.tsx'
import BrainInspector from './world/brain/BrainInspector.tsx'
import WorldClock from './world/WorldClock.tsx'
import TouchControls from './world/TouchControls.tsx'
import CharacterInspector from './characters/CharacterInspector.tsx'
import GraphicsControls from './graphics/GraphicsControls.tsx'
import AudioControls from './audio/AudioControls.tsx'
import ActionControls from './characters/ActionControls.tsx'
import ConversationInput from './conversation/ConversationInput.tsx'
import { conversationSession } from './conversation/session.ts'
import './App.css'


function App() {
  const conversation=useSyncExternalStore(conversationSession.subscribe,conversationSession.getSnapshot)
  const player = useRef(createPlayer())
  const bubble = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const ready = useCallback(() => setStatus('ready'), [])
  const error = useCallback(() => setStatus('error'), [])

  return (
    <main className="experiment" aria-label="PULL — Character World">
      <Canvas
        camera={{ position: [1.6, 3.28, 10.5], fov: 48, near: 0.1, far: 600 }}
        shadows={{ type: PCFShadowMap }}
        dpr={[1, 1.5]}
        gl={{ alpha: false, antialias: true }}
        fallback={<p className="fallback">PULL requires a browser with WebGL support.</p>}
      >
        <World onReady={ready} onError={error} player={player} bubble={bubble} />
      </Canvas>
      <div ref={bubble} className="moru-reaction" aria-hidden="true">
        <div className="moru-speech" />
        <div className="moru-fx" />
      </div>
      <WorldClock player={player} />
      <AudioControls />
      <GraphicsControls />
      {import.meta.env.DEV && <><BrainInspector /><CharacterInspector /></>}
      <TouchControls player={player} disabled={status !== 'ready'||conversation.phase!=='closed'} />
      <ActionControls player={player} disabled={status !== 'ready'||conversation.phase!=='closed'} />
      <ConversationInput player={player} disabled={status!=='ready'}/>
      <div className="world-caption">
        <span>PULL</span>
        <span>MORU / DREAM BLOOM</span>
      </div>
      <p className="world-status" role="status">
        {status === 'loading' ? '세계에 들어가는 중…' : status === 'error'
          ? '캐릭터를 불러오지 못했습니다. 페이지를 새로고침해 주세요.'
          : <><span className="desktop-hint">WASD / Arrows — Move · Shift — Run · Space — Jump · E — React · Drag — Look · 1 — Wave · 2 — Dance</span><span className="mobile-hint">Stick — Move / Run · Drag — Look · ↑ — Jump</span></>}
      </p>
    </main>
  )
}

export default App
