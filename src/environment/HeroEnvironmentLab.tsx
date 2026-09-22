import { useSyncExternalStore } from 'react'
import { heroLab, HERO_IDS } from './heroLab.ts'
const names:Record<(typeof HERO_IDS)[number],string>={
 'pull-house-hero':'House','pull-tree-hero-a':'Tree A','pull-tree-hero-b':'Tree B',
 'moru-meadow-cluster':'Meadow','pull-riverbank-cluster-a':'Riverbank','pull-mountain-a':'Mountain A','pull-mountain-b':'Mountain B',
}
export default function HeroEnvironmentLab(){
 useSyncExternalStore(heroLab.subscribe,heroLab.snapshot)
 if(!import.meta.env.DEV)return null
 const selected=heroLab.selected()
 return <section className="hero-environment-lab" aria-label="Environment A/B">
  <p className="section-label">Environment A/B · candidate</p>
  <button aria-pressed={!heroLab.enabled()} onClick={()=>heroLab.setEnabled(false)}>CURRENT PROTOTYPE</button>
  <button aria-pressed={heroLab.layoutV3()} onClick={()=>heroLab.select('layout-v3')}>WORLD RECONSTRUCTION v3 · candidate</button>
  <button aria-pressed={heroLab.layoutV2()} onClick={()=>heroLab.select('layout-v2')}>WORLD LAYOUT v2 · candidate</button>
  <button aria-pressed={heroLab.enabled()&&!heroLab.layoutV2()&&!heroLab.layoutV3()} onClick={()=>heroLab.select(selected==='layout-v2'||selected==='layout-v3'?'all':selected)}>HERO ENVIRONMENT · {selected==='all'||selected==='layout-v2'||selected==='layout-v3'?'Full scene':names[selected]}</button>
  <div><button aria-pressed={heroLab.enabled()&&heroLab.selected()==='all'} onClick={()=>heroLab.select('all')}>Full scene</button>{HERO_IDS.map(id=><button key={id} aria-pressed={heroLab.enabled()&&heroLab.selected()===id} onClick={()=>heroLab.select(id)}>{names[id]}</button>)}</div>
  <small>미승인 후보의 개발용 미리보기입니다. 개별 asset 또는 전체 구도를 비교할 수 있어요.</small>
  <p className="section-label">Lakeside furniture · candidate</p>
  <div><button aria-pressed={heroLab.lakeside()===null} onClick={()=>heroLab.selectLakeside(null)}>FOUNDATION</button><button aria-pressed={heroLab.lakeside()==='pull-bench-a'} onClick={()=>heroLab.selectLakeside('pull-bench-a')}>BENCH</button><button aria-pressed={heroLab.lakeside()==='pull-lamppost-a'} onClick={()=>heroLab.selectLakeside('pull-lamppost-a')}>LAMPPOST</button></div>
  <small>4K texture 두 장을 쓰는 asset을 한 번에 하나만 불러와 검수합니다. Production에는 나타나지 않아요.</small>
 </section>
}
