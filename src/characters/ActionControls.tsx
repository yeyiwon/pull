import type { RefObject } from 'react'
import type { Player } from '../world/locomotion.ts'
import type { MoruActionId } from './actions.ts'
import { moru } from './expression.ts'

const gestures = [
  ['skip', '깡총'], ['penguin', '펭귄'],
  ['bubbleDance', '둥실둥실'], ['funnyDance', '장난스럽게'],
  ['loveDance', '살랑살랑'], ['superloveDance', '두근두근'],
  ['podGroove', '까딱까딱'], ['youGroove', '들썩들썩'],
] as const
export default function ActionControls({disabled}:{player:RefObject<Player>;disabled:boolean}) {
  const perform=(id:MoruActionId)=>{moru.perform(id)}
  return <div className="moru-context" aria-label="모루와 함께">
    <div className="moru-dances" role="group" aria-label="몸짓 고르기">{gestures.map(([id,label])=><button key={id} disabled={disabled} onClick={()=>perform(id)}>{label}</button>)}</div>
  </div>
}
