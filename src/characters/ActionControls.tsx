import GestureGlyph from '../ui/GestureGlyph.tsx'
import type { RefObject } from 'react'
import type { Player } from '../world/locomotion.ts'
import type { MoruActionId } from './actions.ts'
import { MORU_ACTIONS } from './actions.ts'
import { moru } from './expression.ts'
import { characters } from './registry.ts'

const gestures = [
 ['skip','깡총'],['penguin','펭귄'],['hop','기쁜 점프'],['wave','손 인사'],
 ['bow','꾸벅'],['playful','장난'],
 ['squat','스쿼트'],
 ['bubbleDance','둥실둥실'],['loveDance','살랑살랑'],['youGroove','들썩들썩'],
] as const
export default function ActionControls({disabled,danceOnly=false}:{player:RefObject<Player>;disabled:boolean;danceOnly?:boolean}) {
  // Wardrobe is an animation preview, so it must not inherit the in-world
  // duplicate-action cooldown used to keep Moru's autonomous behavior sparse.
  const perform=(id:MoruActionId)=>{if(danceOnly){const action=MORU_ACTIONS.find(item=>item.id===id);return action?characters.MORU?.play(action.clip):false}return moru.perform(id)}
  const visible=danceOnly?gestures.filter(([id])=>['skip','playful','squat','loveDance','youGroove'].includes(id)):gestures
  return <div className="moru-context" aria-label="모루와 함께">
    <div className="moru-dances" role="group" aria-label={danceOnly?'프리뷰 춤 고르기':'몸짓 고르기'}>{visible.map(([id,label])=><button key={id} disabled={disabled} onClick={()=>perform(id)} aria-label={label}><GestureGlyph kind={id}/><span>{label}</span></button>)}</div>
  </div>
}
