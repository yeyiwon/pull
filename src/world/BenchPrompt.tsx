import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import type { Player } from './locomotion.ts'
import { BENCH_STAND, benchPose, isSeated, nearBench, requestBench } from './bench.ts'
function promptState(p:Player){return isSeated(p)?benchPose(p)===BENCH_STAND?'hidden':'seated':nearBench(p)&&p.state==='IDLE'?'near':'hidden'}
export default function BenchPrompt({player,disabled}:{player:RefObject<Player>;disabled:boolean}){
 const [state,setState]=useState('hidden')
 useEffect(()=>{const timer=setInterval(()=>setState(promptState(player.current)),150);return()=>clearInterval(timer)},[player])
 if(disabled||state==='hidden')return null
 return <div className="bench-controls" role="group" aria-label="벤치에서 쉬기">
  <button onClick={()=>{requestBench(player.current);setState(promptState(player.current))}}>{state==='near'?'잠깐 앉기':'일어나기'}</button>
 </div>
}
