import { useCallback, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PCFShadowMap } from 'three'
import World from './world/World.tsx'
import './App.css'

function App() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const ready = useCallback(() => setStatus('ready'), [])
  const error = useCallback(() => setStatus('error'), [])

  return (
    <main className="experiment" aria-label="PULL — Character World">
      <Canvas
        camera={{ position: [1.6, 3.28, 10.5], fov: 40, near: 0.1, far: 150 }}
        shadows={{ type: PCFShadowMap }}
        dpr={[1, 1.5]}
        gl={{ alpha: false, antialias: true }}
        fallback={<p className="fallback">PULL requires a browser with WebGL support.</p>}
      >
        <World onReady={ready} onError={error} />
      </Canvas>
      <div className="world-caption">
        <span>PULL</span>
        <span>MORU / PLAYABLE WORLD</span>
      </div>
      <p className="world-status" role="status">
        {status === 'loading' ? '세계에 들어가는 중…' : status === 'error'
          ? '캐릭터를 불러오지 못했습니다. 페이지를 새로고침해 주세요.'
          : 'WASD / Arrow Keys — Move · Shift — Run · Space — Jump · E — React'}
      </p>
    </main>
  )
}

export default App
