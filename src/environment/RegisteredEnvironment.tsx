import { LAMP_SEASONS } from '../world/lakesideDressing.ts'
import { heroLab } from './heroLab.ts'
import { evolutionView, setEvolutionRegistry, changeRendered, changeFailed } from '../world/evolution/runtime.ts'
import { renderableChanges } from '../world/evolution/history.ts'
import { getMemorySession } from '../world/brain/memory.ts'
import { Component, Suspense, startTransition, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { Group, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import { parseEnvironmentRegistry, lodAt } from './registry.ts'
import type { EnvironmentEntry, Season } from './registry.ts'
import { worldTime } from '../world/worldTime.ts'
import { environmentState as env } from '../world/environmentState.ts'
import { homeState, homeWorldPoint } from '../world/homeSpace.ts'
import { riverbedHeight, streamCenter, streamWidth } from '../world/terrain.ts'
import { LAMP_LIGHT_ANCHOR, LAMP_SCALE, LAMP_STATIONS, lampPoint, promenadeBank } from '../world/lakesideRoute.ts'

class Boundary extends Component<{children:ReactNode;onFail?:()=>void},{failed:boolean}>{
 state={failed:false}
 static getDerivedStateFromError(){return {failed:true}}
 componentDidCatch(error:Error){this.props.onFail?.();console.warn('Registered environment asset skipped:',error.message)}
 render(){return this.state.failed?null:this.props.children}
}
function updateRoughness(items:{material:MeshStandardMaterial;roughness:number}[],wetness:number){for(const m of items)m.material.roughness=Math.max(.18,m.roughness-wetness*.18)}
function setSnow(uniform:{value:number},value:number){uniform.value=value}
function LampGlow(){
 const material=useRef<MeshStandardMaterial>(null)
 useFrame(()=>{if(!material.current)return
  const season=worldTime.realWorld.season
  material.current.color.set(LAMP_SEASONS[season].core)
  material.current.emissive.copy(material.current.color)
  material.current.emissiveIntensity=.08+env.night*2.4
 })
 return <mesh position={[...LAMP_LIGHT_ANCHOR]}><sphereGeometry args={[.095,10,8]}/><meshStandardMaterial ref={material} color="#fff3dc" emissive="#fff3dc" emissiveIntensity={0} toneMapped={false}/></mesh>
}
function Model({url,response,onReady,id}:{onReady?:()=>void;url:string;id:string;response:EnvironmentEntry['materialResponse']}){
 const asset=useLoader(GLTFLoader,url)
 const data=useMemo(()=>{
  const scene=clone(asset.scene), materials:{material:MeshStandardMaterial;roughness:number}[]=[]
  const snow={value:0}
  scene.traverse(o=>{if(!(o instanceof Mesh))return;o.castShadow=id!=='pull-lamppost-a';o.receiveShadow=true
   const originals=Array.isArray(o.material)?o.material:[o.material]
   const mapped=originals.map(m=>{
    if(!(m instanceof MeshStandardMaterial))return m
    const material=m.clone()
    if(id.startsWith('pull-mountain-')){
      material.color.set(id==='pull-mountain-a'?'#889aaa':'#95a3b1')
      material.roughness=.95;material.metalness=0;material.emissive.set('#000000')
    }else if(id.startsWith('pull-')||id==='moru-meadow-cluster'){
      material.roughness=Math.min(.9,Math.max(.68,material.roughness))
      material.metalness=Math.min(.08,material.metalness)
    }
    materials.push({material,roughness:material.roughness})
    if(response.snow){material.onBeforeCompile=s=>{
     s.uniforms.uRegistrySnow=snow
     s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying float vSnowUp;').replace('#include <begin_vertex>','#include <begin_vertex>\nvSnowUp=max(0.,normalize(mat3(modelMatrix)*normal).y);')
     s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform float uRegistrySnow; varying float vSnowUp;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.72,.79,.83),uRegistrySnow*smoothstep(.35,.85,vSnowUp));')
    };material.customProgramCacheKey=()=> 'registry-snow-v1'}
    return material
   });o.material=Array.isArray(o.material)?mapped:mapped[0]
  });return {scene,materials,snow}
 },[asset,response,id])
 useEffect(()=>{onReady?.()},[onReady])
 useEffect(()=>()=>data.materials.forEach(m=>m.material.dispose()),[data])
 useFrame(()=>{setSnow(data.snow,env.snow);updateRoughness(data.materials,response.wetness?env.wetness:0)})
 return <primitive object={data.scene} dispose={null}/>
}
function Placed({entry,placement,changeId,housePreview=false}:{changeId?:string;entry:EnvironmentEntry;placement:EnvironmentEntry['placements'][number];housePreview?:boolean}){
 const [level,setLevel]=useState(0),timer=useRef(0),group=useRef<Group>(null),position=useMemo(()=>new Vector3(...placement.position),[placement])
 useFrame(({camera},delta)=>{if(housePreview&&group.current)group.current.visible=!homeState.inside
  timer.current+=delta;if(timer.current<.5)return;timer.current=0
  const next=lodAt(camera.position.distanceTo(position),entry.lod,level);if(next!==level)startTransition(()=>setLevel(next))
 })
 const url=level?entry.lod[level-1].url:entry.url
 return <group ref={group} position={placement.position} rotation={placement.rotation} scale={placement.scale}>
  <Boundary onFail={changeId?()=>changeFailed(changeId):undefined}><Suspense fallback={null}><Model url={url} id={entry.id} response={entry.materialResponse} onReady={changeId?()=>changeRendered(changeId):undefined}/></Suspense></Boundary>
  {entry.id==='pull-lamppost-a'&&heroLab.layoutV3()&&<LampGlow/>}
 </group>
}
export default function RegisteredEnvironment(){
 useSyncExternalStore(evolutionView.subscribe,evolutionView.snapshot)
 useSyncExternalStore(heroLab.subscribe,heroLab.snapshot)
 const [entries,setEntries]=useState<EnvironmentEntry[]>([]),[season,setSeason]=useState<Season>(worldTime.realWorld.season)
 useEffect(()=>{const controller=new AbortController()
  fetch('/environment/registry.json',{signal:controller.signal}).then(r=>{if(!r.ok)throw Error(`Registry HTTP ${r.status}`);return r.json()}).then(data=>{const parsed=parseEnvironmentRegistry(data);setEntries(parsed);setEvolutionRegistry(parsed)}).catch(e=>{if(!controller.signal.aborted)console.warn('Environment registry skipped:',e)})
  return()=>controller.abort()
 },[])
 useFrame(()=>{if(worldTime.realWorld.season!==season)setSeason(worldTime.realWorld.season)})
 // Explicit development preview is not a WorldHistory change or autonomous approval.
 const previewId=import.meta.env.DEV?new URLSearchParams(window.location.search).get('environmentPreview'):null
 const previewIds=heroLab.activeIds()
 const furniturePreview=heroLab.lakeside()
 const previews=entries.filter(e=>e.review?.status==='CANDIDATE'&&!(heroLab.layoutV3()&&e.id==='pull-house-hero')&&(e.id===furniturePreview||(heroLab.layoutV3()&&(e.id==='pull-lamppost-a'||e.id==='pull-bench-a'))||(previewIds.length?previewIds.includes(e.id as typeof previewIds[number]):e.id===previewId)))
 const layoutPreview=(entry:EnvironmentEntry):EnvironmentEntry['placements'][number]|undefined=>{
  if(!heroLab.layoutV2()&&!heroLab.layoutV3())return undefined
  const ground=(scale:number)=>-entry.review!.groundOffset*scale
  if(heroLab.layoutV3()){
   if(entry.id==='pull-tree-hero-a')return {position:[promenadeBank(43,-1).x-15,ground(5)+.13,43],rotation:[0,.33,0],scale:5}
   if(entry.id==='moru-meadow-cluster')return {position:[promenadeBank(53,-1).x-12,ground(.65)+.05,53],rotation:[0,.42,0],scale:.65}
   if(entry.id==='pull-riverbank-cluster-a')return {position:[streamCenter(108)+streamWidth(108)+1.2,ground(2)-.13,108],rotation:[0,-.22,0],scale:2}
   if(entry.id==='pull-mountain-a')return {position:[-78,ground(65),210],rotation:[0,.28,0],scale:65}
   return undefined
  }
  if(entry.id==='pull-tree-hero-a')return {position:[streamCenter(65)-streamWidth(65)-13,ground(5),65],rotation:[0,.33,0],scale:5}
  if(entry.id==='moru-meadow-cluster')return {position:[streamCenter(48)-streamWidth(48)-8,ground(.65)-.08,48],rotation:[0,.42,0],scale:.65}
  if(entry.id==='pull-riverbank-cluster-a')return {position:[streamCenter(98)+streamWidth(98)+1.2,ground(2)-.13,98],rotation:[0,-.22,0],scale:2}
  return undefined
 }
 const memory=getMemorySession().memory
 const changes=renderableChanges(memory.evolution,entries,season,memory.offline.lastSeenAt??0)
 const candidatePlacements=(entry:EnvironmentEntry):EnvironmentEntry['placements']=>{
  if(heroLab.layoutV3()&&entry.id==='pull-tree-hero-a')return [[-11,-24,4.5],[promenadeBank(38,-1).x-7.5,38,5],[33,9,4.7],[promenadeBank(43,1).x+7.5,43,4.3]].map(([x,z,scale],i)=>({position:[x,riverbedHeight(x,z)-entry.review!.groundOffset*scale,z],rotation:[0,.33+i*1.17,0],scale}))
  if(heroLab.layoutV3()&&entry.id==='moru-meadow-cluster')return [[promenadeBank(38,-1).x-6.5,38],[promenadeBank(40,-1).x-7,40],[-11,-21],[31,7],[34,11],[promenadeBank(43,1).x+6.5,43],[promenadeBank(45,1).x+7,45],[-12,-27]].map(([x,z],i)=>({position:[x,riverbedHeight(x,z)-entry.review!.groundOffset*.85-.045,z],rotation:[0,.42+i*1.3,0],scale:.85}))
  if(heroLab.layoutV3()&&entry.id==='pull-mountain-a')return [
   {position:[-92,-entry.review!.groundOffset*65,225],rotation:[0,.28,0],scale:65},
   {position:[82,-entry.review!.groundOffset*48,247],rotation:[0,2.05,0],scale:48},
   {position:[-162,-entry.review!.groundOffset*52,190],rotation:[0,-.8,0],scale:52},
   {position:[165,-entry.review!.groundOffset*56,203],rotation:[0,-2.4,0],scale:56},
  ]
  if(heroLab.layoutV3()&&entry.id==='pull-lamppost-a')return [...LAMP_STATIONS.map(({z,side})=>lampPoint(z,side)),homeWorldPoint(-5,5.4),homeWorldPoint(5,5.4)].map((p,i)=>({position:[p.x,-entry.review!.groundOffset*LAMP_SCALE+riverbedHeight(p.x,p.z),p.z],rotation:[0,i*.43,0],scale:LAMP_SCALE}))
  if(heroLab.layoutV3()&&entry.id==='pull-bench-a')return [46,69,98,130].map(z=>{const p=promenadeBank(z,-1),x=p.x-5.4;return {position:[x,riverbedHeight(x,z)-entry.review!.groundOffset*1.1,z],rotation:[0,Math.PI/2,0],scale:1.1}})
  return [layoutPreview(entry)??entry.review?.preview?.[0]??{position:[2,-entry.review!.groundOffset*entry.scaleRange[0],1],rotation:[0,0,0],scale:entry.scaleRange[0]}]
 }
 return <group name="RegisteredEnvironment">{previews.flatMap(preview=>candidatePlacements(preview).map((placement,i)=><Placed key={`${preview.id}-${i}`} entry={preview} housePreview={preview.id==='pull-house-hero'} placement={placement}/>))}{changes.map(({change,entry,placement})=><Placed key={change.id} changeId={change.id} entry={entry} placement={placement}/>)}{entries.filter(e=>e.placementType==='manual'&&e.season.includes(season)).flatMap(e=>e.placements.map((p,i)=><Placed key={`${e.id}-${i}`} entry={e} placement={p}/>))}</group>
}
