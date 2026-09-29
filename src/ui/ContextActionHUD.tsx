import { useSyncExternalStore } from 'react'
import { contextAction } from './contextAction.ts'
import { gameUiMode } from './gameUiMode.ts'

export default function ContextActionHUD(){const target=useSyncExternalStore(contextAction.subscribe,contextAction.getSnapshot),mode=useSyncExternalStore(gameUiMode.subscribe,gameUiMode.getSnapshot),visible=target&&(mode==='EXPLORE'||mode==='PLACEMENT'&&target.kind==='PLACE');if(!visible)return null;return <button className="context-action" aria-label={target.label} onPointerDown={event=>event.stopPropagation()} onClick={()=>contextAction.perform()}><span>{target.label}</span></button>}
