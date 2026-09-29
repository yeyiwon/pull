import { useSyncExternalStore } from 'react'
import { aliveWorldStore } from '../world/aliveWorldState.ts'
import { gardenStore } from '../world/gardenState.ts'

export default function TasksPanel(){
 const alive=useSyncExternalStore(aliveWorldStore.subscribe,aliveWorldStore.getSnapshot),garden=useSyncExternalStore(gardenStore.subscribe,gardenStore.getSnapshot),mission=alive.lostSeeds
 const missionText=mission.status==='AVAILABLE'?'Mallow에게 말을 걸어보자':mission.status==='ACTIVE'?`흩어진 씨앗 찾기 · ${mission.collected.length}/3`:mission.status==='RETURN'?'Mallow에게 씨앗을 가져다주자':'씨앗을 모두 돌려줬어'
 const gardenText=garden.plants.length===0?'집 앞 밭에 씨앗을 심어보자':garden.plants.some(plant=>!plant.collectedAt)?`${garden.plants.length}개의 꽃을 돌보는 중`:'피어난 꽃으로 정원을 꾸며보자'
 const discovered=mission.status!=='AVAILABLE'
 const missionComplete=mission.status==='COMPLETE'
 const missionNote=discovered&&<article data-complete={missionComplete}><span><strong>잃어버린 씨앗</strong><small>{missionText}</small>{mission.status==='ACTIVE'&&<em>{mission.collected.length} / 3</em>}</span></article>
 return <div className="task-list note-list">
  <p className="task-section">NOW</p>
  {discovered&&!missionComplete&&missionNote}
  <article data-complete="false"><span><strong>작은 정원</strong><small>{gardenText}</small></span></article>
  {missionComplete&&<><p className="task-section task-done-section">DONE</p>{missionNote}</>}
 </div>
}
