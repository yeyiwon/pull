import { useEffect, useState } from 'react'
import { graphicsState, QUALITY, setQuality, useQuality } from './quality.ts'
import type { Quality } from './quality.ts'
export default function GraphicsControls({diagnostics=true}:{diagnostics?:boolean}) {
 const quality=useQuality(),[stats,setStats]=useState('')
 useEffect(()=>{const id=setInterval(()=>setStats(`${graphicsState.fps.toFixed(0)} FPS · ${graphicsState.frameMs.toFixed(1)} ms · ${graphicsState.calls} calls · ${(graphicsState.triangles/1000).toFixed(0)}k triangles`),1000);return()=>clearInterval(id)},[])
 return <details className="graphics-preview" open><summary>Graphics</summary>
 <div className="quality-choices">{Object.keys(QUALITY).map(q=><button key={q} aria-pressed={q===quality} onClick={()=>setQuality(q as Quality)}>{{PERFORMANCE:'가볍게',BEAUTIFUL:'아름답게',DREAM:'몽환적으로'}[q]}<span>{q===quality?'●':'○'}</span><small>{q==='DREAM'?'더 풍부한 빛과 분위기':q==='BEAUTIFUL'?'화질과 움직임의 균형':'부드러운 움직임을 우선해요'}</small></button>)}</div>
 {import.meta.env.DEV&&diagnostics&&<><output aria-label="Graphics diagnostics">{stats}</output>
 <label>Moon<select aria-label="Moon phase" defaultValue=".8" onChange={e=>{graphicsState.moonPhase=Number(e.target.value)}}><option value="0">Full</option><option value=".8">Gibbous</option><option value="1.57">Quarter</option><option value="2.4">Crescent</option><option value="3.14">New</option></select></label>
 {(['bloom','contact','rays'] as const).map(effect=><label key={effect}><input type="checkbox" defaultChecked onChange={e=>{graphicsState[effect]=e.target.checked}}/>{effect}</label>)}
 </>}
 </details>
}
