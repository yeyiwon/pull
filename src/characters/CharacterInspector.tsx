import { useState, useEffect } from 'react'
import { moru } from './expression.ts'
import { manifests } from './assets.ts'
import { characters } from './registry.ts'
export default function CharacterInspector() {
  const [, refresh] = useState(0)
  useEffect(() => { const id = setInterval(() => refresh(n => n + 1), 1000); return () => clearInterval(id) }, [])
  return <details className="character-inspector"><summary>Characters</summary><fieldset><legend>MORU</legend>
    <output>{characters.MORU?.status ?? 'Loading'} · {characters.MORU?.clip}</output>
  <select aria-label="MORU clip" defaultValue="" onChange={e => characters.MORU?.play(e.target.value)}><option value="">Actions</option>{manifests.MORU.actions.map(a => <option key={a.name}>{a.name}</option>)}</select>
    <div className="moru-debug-actions">
      <button onClick={()=>moru.contextReaction()}>Say random</button>
      <button onClick={()=>moru.emote('heart')}>Heart</button>
      <button onClick={()=>moru.emote('sparkle')}>Sparkle</button>
      <button onClick={()=>moru.offer({event:'BRAIN',speech:'여기 좋다.',emotion:'happy',typing:true,duration:4},'conversation')}>Happy preview</button>
      <button onClick={()=>moru.offer({event:'BRAIN',speech:'오?',fx:'SURPRISE',typing:true,duration:3},'conversation')}>Surprise preview</button>
      <button onClick={()=>moru.offer({event:'BRAIN',speech:'같이 있으니까 좋네.',emotion:'warm',typing:true,duration:4},'conversation')}>Affection preview</button>
      <button onClick={()=>moru.perform('wave')}>Wave</button>
      <button onClick={()=>moru.perform('listen')}>Gesture</button>
      <button onClick={()=>moru.perform('bubbleDance')}>Dance</button>
      <button onClick={()=>moru.contextReaction('weather')}>Weather reaction</button>
      <button onClick={()=>moru.contextReaction('time')}>Time reaction</button>
    </div>
  </fieldset></details>
}
