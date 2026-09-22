import { useEffect, useState } from 'react'
import { graphicsState, QUALITY, setQuality, useQuality } from './quality.ts'
import type { Quality } from './quality.ts'
export default function GraphicsControls() {
 const quality=useQuality(),[stats,setStats]=useState('')
 useEffect(()=>{const id=setInterval(()=>setStats(`${graphicsState.fps.toFixed(0)} FPS · ${graphicsState.frameMs.toFixed(1)} ms · ${graphicsState.calls} calls · ${(graphicsState.triangles/1000).toFixed(0)}k triangles`),1000);return()=>clearInterval(id)},[])
 return <details className="graphics-preview"><summary>Graphics</summary>
 <select aria-label="Graphics quality" value={quality} onChange={e=>setQuality(e.target.value as Quality)}>{Object.keys(QUALITY).map(q=><option key={q}>{q}</option>)}</select>
 {import.meta.env.DEV&&<><output aria-label="Graphics diagnostics">{stats}</output>
 <label>Moon<select aria-label="Moon phase" defaultValue=".8" onChange={e=>{graphicsState.moonPhase=Number(e.target.value)}}><option value="0">Full</option><option value=".8">Gibbous</option><option value="1.57">Quarter</option><option value="2.4">Crescent</option><option value="3.14">New</option></select></label>
 {(['bloom','contact','rays'] as const).map(effect=><label key={effect}><input type="checkbox" defaultChecked onChange={e=>{graphicsState[effect]=e.target.checked}}/>{effect}</label>)}
 </>}
 </details>
}
