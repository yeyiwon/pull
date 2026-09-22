import { Component, Suspense, startTransition, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import { parseEnvironmentRegistry, lodAt } from './registry.ts'
import type { EnvironmentEntry, Season } from './registry.ts'
import { worldTime } from '../world/worldTime.ts'
import { environmentState as env } from '../world/environmentState.ts'

class Boundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false}
 static getDerivedStateFromError(){return {failed:true}}
 componentDidCatch(error:Error){console.warn('Registered environment asset skipped:',error.message)}
 render(){return this.state.failed?null:this.props.children}
}
function updateRoughness(items:{material:MeshStandardMaterial;roughness:number}[],wetness:number){for(const m of items)m.material.roughness=Math.max(.18,m.roughness-wetness*.18)}
function setSnow(uniform:{value:number},value:number){uniform.value=value}
function Model({url,response}:{url:string;response:EnvironmentEntry['materialResponse']}){
 const asset=useLoader(GLTFLoader,url)
 const data=useMemo(()=>{
  const scene=clone(asset.scene), materials:{material:MeshStandardMaterial;roughness:number}[]=[]
  const snow={value:0}
  scene.traverse(o=>{if(!(o instanceof Mesh))return;o.castShadow=true;o.receiveShadow=true
   const originals=Array.isArray(o.material)?o.material:[o.material]
   const mapped=originals.map(m=>{
    if(!(m instanceof MeshStandardMaterial)||(!response.snow&&!response.wetness))return m
    const material=m.clone();materials.push({material,roughness:m.roughness})
    if(response.snow){material.onBeforeCompile=s=>{
     s.uniforms.uRegistrySnow=snow
     s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying float vSnowUp;').replace('#include <begin_vertex>','#include <begin_vertex>\nvSnowUp=max(0.,normalize(mat3(modelMatrix)*normal).y);')
     s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform float uRegistrySnow; varying float vSnowUp;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.72,.79,.83),uRegistrySnow*smoothstep(.35,.85,vSnowUp));')
    };material.customProgramCacheKey=()=> 'registry-snow-v1'}
    return material
   });o.material=Array.isArray(o.material)?mapped:mapped[0]
  });return {scene,materials,snow}
 },[asset,response])
 useEffect(()=>()=>data.materials.forEach(m=>m.material.dispose()),[data])
 useFrame(()=>{setSnow(data.snow,env.snow);updateRoughness(data.materials,response.wetness?env.wetness:0)})
 return <primitive object={data.scene} dispose={null}/>
}
function Placed({entry,placement}:{entry:EnvironmentEntry;placement:EnvironmentEntry['placements'][number]}){
 const [level,setLevel]=useState(0),timer=useRef(0),position=useMemo(()=>new Vector3(...placement.position),[placement])
 useFrame(({camera},delta)=>{timer.current+=delta;if(timer.current<.5)return;timer.current=0
  const next=lodAt(camera.position.distanceTo(position),entry.lod,level);if(next!==level)startTransition(()=>setLevel(next))
 })
 const url=level?entry.lod[level-1].url:entry.url
 return <group position={placement.position} rotation={placement.rotation} scale={placement.scale}>
  <Boundary><Suspense fallback={null}><Model url={url} response={entry.materialResponse}/></Suspense></Boundary>
 </group>
}
export default function RegisteredEnvironment(){
 const [entries,setEntries]=useState<EnvironmentEntry[]>([]),[season,setSeason]=useState<Season>(worldTime.realWorld.season)
 useEffect(()=>{const controller=new AbortController()
  fetch('/environment/registry.json',{signal:controller.signal}).then(r=>{if(!r.ok)throw Error(`Registry HTTP ${r.status}`);return r.json()}).then(data=>setEntries(parseEnvironmentRegistry(data))).catch(e=>{if(!controller.signal.aborted)console.warn('Environment registry skipped:',e)})
  return()=>controller.abort()
 },[])
 useFrame(()=>{if(worldTime.realWorld.season!==season)setSeason(worldTime.realWorld.season)})
 return <group name="RegisteredEnvironment">{entries.filter(e=>e.placementType==='manual'&&e.season.includes(season)).flatMap(e=>e.placements.map((p,i)=><Placed key={`${e.id}-${i}`} entry={e} placement={p}/>))}</group>
}
