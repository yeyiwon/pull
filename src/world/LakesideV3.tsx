import { LAMP_SEASONS } from './lakesideDressing.ts'
import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, Color, Float32BufferAttribute, Line, LineBasicMaterial, Mesh, MeshStandardMaterial, PointLight, Vector3 } from 'three'
import type { CatmullRomCurve3 } from 'three'
import { environmentState as env } from './environmentState.ts'
import { riverbedHeight, lakeWidthV3, streamCenter } from './terrain.ts'
import { connectedPromenadeRoute, promenadeHalfWidth, lampLightHeight, LAMP_STATIONS, lampPoint, promenadeRoute } from './lakesideRoute.ts'
import { DOOR, homeWorldPoint } from './homeSpace.ts'
import { worldTime } from './worldTime.ts'
import type { Player } from './locomotion.ts'

function ribbon(curve:CatmullRomCurve3,segments:number){
 const geometry=new BufferGeometry(),positions:number[]=[],colors:number[]=[],indices:number[]=[]
 const strips=[-1.25,-1,-.78,0,.78,1,1.25],shade=new Color()
 for(let i=0;i<=segments;i++){
  const t=i/segments,p=curve.getPoint(t),tangent=curve.getTangent(t),length=Math.hypot(tangent.x,tangent.z)||1
  const halfWidth=promenadeHalfWidth(p.z),nx=-tangent.z/length,nz=tangent.x/length,variation=1+.045*Math.sin(t*37)+.025*Math.sin(t*83)
  for(let j=0;j<strips.length;j++){
   const cross=strips[j],x=p.x+nx*cross*halfWidth*variation,z=p.z+nz*cross*halfWidth*variation
   positions.push(x,riverbedHeight(x,z)+(Math.abs(cross)>1?.006:.018),z)
   // World-space grain stays continuous where the house/bridge paths meet the promenade.
   const grain=.97+.035*Math.sin(x*.41+z*.23)+.02*Math.sin(x*1.13-z*.77)
   shade.set(Math.abs(cross)>1?'#8b9480':Math.abs(cross)>.8?'#aea89a':'#c2b5a4').multiplyScalar(grain)
   colors.push(shade.r,shade.g,shade.b,Math.abs(cross)>1?0:Math.abs(cross)>.8?.68:1)
  }
  if(i<segments)for(let j=0;j<strips.length-1;j++){
   const a=i*strips.length+j,b=a+strips.length
   indices.push(a,b,a+1,a+1,b,b+1)
  }
 }
 geometry.setAttribute('position',new Float32BufferAttribute(positions,3))
 geometry.setAttribute('color',new Float32BufferAttribute(colors,4))
 geometry.setIndex(indices);geometry.computeVertexNormals()
 return geometry
}

export default function LakesideV3({player}:{player:RefObject<Player>}){
 const debug=import.meta.env.DEV&&new URLSearchParams(window.location.search).has('layoutDebug')
 const r=useMemo(()=>({
  paths:[ribbon(connectedPromenadeRoute(),900)],
  material:new MeshStandardMaterial({vertexColors:true,roughness:.88,metalness:0,side:2,transparent:true,depthWrite:false}),
  stations:LAMP_STATIONS.map(({z,side})=>lampPoint(z,side)),
 }),[])
 const lamps=useRef<(PointLight|null)[]>([])
 const lightRings=useRef<(Mesh|null)[]>([])
 const guides=useMemo(()=>{
  if(!debug)return null
  const curve=promenadeRoute(),route=curve.getPoints(400)
  const shore=(side:-1|1,depth=0)=>Array.from({length:134},(_,i)=>{const z=30+i,span=Math.max(0,lakeWidthV3(z)-depth);return new Vector3(streamCenter(z)+side*span,.22,z)})
  return [new BufferGeometry().setFromPoints(route.map(p=>new Vector3(p.x,.24,p.z))),...([-1,1] as const).flatMap(side=>[new BufferGeometry().setFromPoints(shore(side)),new BufferGeometry().setFromPoints(shore(side,7))])].map((geometry,i)=>new Line(geometry,new LineBasicMaterial({color:i===0?'#ffcc77':i%2?'#51deea':'#7b8ce9',depthTest:false,transparent:true,opacity:.8})))
 },[debug])
 const material=useRef<MeshStandardMaterial|null>(null),selected=useRef(new Int32Array(4)),lampColor=useRef(new Color())
 useEffect(()=>{material.current=r.material;return()=>{r.paths.forEach(path=>path.dispose());r.material.dispose();guides?.forEach(guide=>{guide.geometry.dispose();(guide.material as LineBasicMaterial).dispose()})}},[r,guides])
 useFrame(()=>{
  if(material.current){material.current.roughness=.88-env.wetness*.35;material.current.color.set('#ffffff').multiplyScalar(1-env.wetness*.17)}
  const p=player.current.position,season=worldTime.realWorld.season
  lampColor.current.set(LAMP_SEASONS[season].light)
  selected.current.fill(-1)
  for(let slot=0;slot<4;slot++){
   let best=-1,bestDistance=Infinity
   for(let i=0;i<r.stations.length;i++){
    let used=false;for(let j=0;j<slot;j++)if(selected.current[j]===i)used=true
    if(used)continue
    const station=r.stations[i],distance=(station.x-p.x)**2+(station.z-p.z)**2
    if(distance<bestDistance){bestDistance=distance;best=i}
   }
   selected.current[slot]=best
   const light=lamps.current[slot]
   if(light&&best>=0){const station=r.stations[best];light.position.set(station.x,lampLightHeight(riverbedHeight(station.x,station.z)),station.z);light.color.copy(lampColor.current);light.intensity=env.night*(bestDistance<50*50?65:0)
    const ring=lightRings.current[slot];if(ring){ring.position.set(station.x,.22,station.z);ring.visible=light.intensity>0}
   }
  }
 })
 return <group name="ReconstructedLakeside">
  {r.paths.map((geometry,i)=><mesh key={i} geometry={geometry} material={r.material} receiveShadow/>)}
  {Array.from({length:4},(_,i)=><pointLight key={i} ref={light=>{lamps.current[i]=light}} color="#ffe9cc" intensity={0} distance={27} decay={2}/>)}
  {debug&&<group name="LakesideDebugGuides">
   {guides?.map((line,i)=><primitive key={i} object={line}/>)}
   {r.stations.map((point,i)=><mesh key={i} position={[point.x,.3,point.z]}><sphereGeometry args={[.38,8,6]}/><meshBasicMaterial color="#ffe4af" depthTest={false}/></mesh>)}
   {Array.from({length:4},(_,i)=><mesh key={`radius-${i}`} ref={ring=>{lightRings.current[i]=ring}} rotation={[-Math.PI/2,0,0]} visible={false}><ringGeometry args={[26.9,27,48]}/><meshBasicMaterial color="#d1b5fb" transparent opacity={.4} depthTest={false} side={2}/></mesh>)}
   <mesh position={(()=>{const p=homeWorldPoint(DOOR.x,DOOR.z+1);return [p.x,.5,p.z] as [number,number,number]})()}><sphereGeometry args={[.65,10,8]}/><meshBasicMaterial color="#ff91ac" depthTest={false}/></mesh>
  </group>}
 </group>
}
