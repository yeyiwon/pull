import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import type { Player } from './locomotion.ts'
import { BENCH_STAND, benchPose, isSeated, nearBench, requestBench } from './bench.ts'
import { contextAction } from '../ui/contextAction.ts'
function promptState(p:Player){return isSeated(p)?benchPose(p)===BENCH_STAND?'hidden':'seated':nearBench(p)&&p.state==='IDLE'?'near':'hidden'}
export default function BenchPrompt({player,disabled}:{player:RefObject<Player>;disabled:boolean}){
 const [state,setState]=useState('hidden')
 useEffect(()=>{const timer=setInterval(()=>setState(promptState(player.current)),150);return()=>clearInterval(timer)},[player])
 useEffect(()=>{if(disabled||state==='hidden'){contextAction.clear('seat');return}contextAction.set('seat',{id:'seat',kind:'INSPECT',label:state==='near'?'앉기':'일어나기',priority:58,perform:()=>{requestBench(player.current);setState(promptState(player.current))}});return()=>contextAction.clear('seat')},[disabled,player,state])
 return null
}
