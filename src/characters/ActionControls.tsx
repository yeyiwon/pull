import GestureGlyph from '../ui/GestureGlyph.tsx'
import type { RefObject } from 'react'
import type { Player } from '../world/locomotion.ts'
import type { MoruActionId } from './actions.ts'
import { moru } from './expression.ts'

const gestures = [
 ['skip','깡총'],['penguin','펭귄'],['hop','기쁜 점프'],['wave','손 인사'],
 ['bow','꾸벅'],['playful','장난'],
 ['squat','스쿼트'],
 ['bubbleDance','둥실둥실'],['loveDance','살랑살랑'],['youGroove','들썩들썩'],
] as const
export default function ActionControls({disabled}:{player:RefObject<Player>;disabled:boolean}) {
  const perform=(id:MoruActionId)=>{moru.perform(id)}
  return <div className="moru-context" aria-label="모루와 함께">
    <div className="moru-dances" role="group" aria-label="몸짓 고르기">{gestures.map(([id,label])=><button key={id} disabled={disabled} onClick={()=>perform(id)} aria-label={label}><GestureGlyph kind={id}/><span>{label}</span></button>)}</div>
  </div>
}
