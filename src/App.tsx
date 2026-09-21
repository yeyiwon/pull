import { useCallback, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PCFShadowMap } from 'three'
import { createPlayer, requestAction } from './world/locomotion.ts'
import World from './world/World.tsx'
import WorldClock from './world/WorldClock.tsx'
import TouchControls from './world/TouchControls.tsx'
import './App.css'

function App() {
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
      <WorldClock />
      <TouchControls player={player} disabled={status !== 'ready'} />
      <div className="moru-actions" aria-label="Moru actions">
        <button className="touch-jump" type="button" aria-label="Jump" disabled={status !== 'ready'} onClick={() => { player.current.jumpRequested = true }}>↑</button>
        <button type="button" aria-label="Wave" title="Wave · 1" disabled={status !== 'ready'} onClick={() => requestAction(player.current, 'WAVE')}>👋</button>
        <button type="button" aria-label="Bubble Dance" title="Bubble Dance · 2" disabled={status !== 'ready'} onClick={() => requestAction(player.current, 'BUBBLE_DANCE')}>♪</button>
      </div>
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
