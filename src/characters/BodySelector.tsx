import { useSyncExternalStore } from 'react'
import { bodySelection, BODY_CHOICES } from './bodySelection.ts'
import { WARDROBE_CATEGORIES } from './wardrobe.ts'
export default function BodySelector({disabled=false}:{disabled?:boolean}){
 const ready=useSyncExternalStore(bodySelection.subscribe,bodySelection.getReadySnapshot)
 const selected=useSyncExternalStore(bodySelection.subscribe,bodySelection.getSnapshot)
 return <section className="body-selector" aria-label="모루 모습 선택"><p className="section-label">Moru · Wardrobe</p><div className="wardrobe-scroll">{WARDROBE_CATEGORIES.map(category=><section key={category} aria-label={category}><h3 className="section-label">{category}</h3><div className="body-options">{BODY_CHOICES.filter(body=>body.category===category).map(body=><button key={body.id} disabled={disabled||body.status!=='COMPATIBLE'} aria-pressed={selected===body.id} onClick={()=>bodySelection.select(body.id)}><span>{body.name}<small>{body.description}</small></span><span aria-hidden="true">{selected===body.id?'●':'○'}</span></button>)}</div></section>)}</div><p className="sheet-intro" role="status">{!ready?'모습을 불러오고 있어요…':'선택하면 바로 입어봐요. 마지막 선택은 자동 저장돼요.'}{disabled?' 벤치에서 일어난 뒤 바꿀 수 있어요.':''}</p></section>
}
