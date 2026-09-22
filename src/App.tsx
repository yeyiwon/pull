import WorldInterface from './ui/WorldInterface.tsx'
import { worldInterface } from './ui/interface.ts'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Canvas } from '@react-three/fiber'
import { PCFSoftShadowMap } from 'three'
import { createPlayer } from './world/locomotion.ts'
import World from './world/World.tsx'
import TouchControls from './world/TouchControls.tsx'
import ConversationInput from './conversation/ConversationInput.tsx'
import { conversationSession } from './conversation/session.ts'
import './App.css'
import './ui/renaissance.css'


type Theme = 'dark' | 'light'
function initialTheme():Theme {
  try { const saved=localStorage.getItem('pull.ui.theme');if(saved==='dark'||saved==='light')return saved } catch { /* Storage may be unavailable in private browsing. */ }
  return window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'
}
function App() {
  const [theme,setTheme]=useState<Theme>(initialTheme)
  useEffect(()=>{try{localStorage.setItem('pull.ui.theme',theme)}catch{/* Keep the theme usable without persistence. */}},[theme])
  const conversation=useSyncExternalStore(conversationSession.subscribe,conversationSession.getSnapshot)
  const panel=useSyncExternalStore(worldInterface.subscribe,worldInterface.getSnapshot)
  const player = useRef(createPlayer())
  const bubble = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const ready = useCallback(() => setStatus('ready'), [])
  const error = useCallback(() => setStatus('error'), [])

  return (
    <main data-theme={theme} className="experiment" aria-label="PULL — A living world">
      <Canvas
        camera={{ position: [1.6, 3.28, 10.5], fov: 48, near: 0.1, far: 600 }}
        shadows={{ type: PCFSoftShadowMap }}
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
      <WorldInterface player={player} ready={status==='ready'} theme={theme} onThemeChange={setTheme}/>
      <TouchControls player={player} disabled={status !== 'ready'||conversation.phase!=='closed'||panel!==null} />
      <ConversationInput player={player} disabled={status!=='ready'}/>
      <p className="world-status" role="status">
        {status === 'loading' ? '세계에 들어가는 중…' : status === 'error'
          ? '캐릭터를 불러오지 못했습니다. 페이지를 새로고침해 주세요.'
          : null}
      </p>
    </main>
  )
}

export default App
