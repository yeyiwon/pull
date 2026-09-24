import { useEffect,useState } from 'react'
import { cloudDiagnostics } from './model.ts'
import { cloudSync } from './sync.ts'
export default function CloudInspector(){const [,refresh]=useState(0);useEffect(()=>{const id=setInterval(()=>refresh(v=>v+1),1000);return()=>clearInterval(id)},[]);return <details><summary>Cloud persistence</summary><button onClick={()=>void cloudSync.syncNow()}>Force sync</button><pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(cloudDiagnostics,null,2)}</pre></details>}
