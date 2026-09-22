import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, InstancedMesh, MeshStandardMaterial, Object3D } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { riverbedHeight } from '../world/terrain.ts'
import { environmentState as env } from '../world/environmentState.ts'
import { QUALITY, useQuality } from '../graphics/quality.ts'
import { VEGETATION } from './vegetationRegistry.ts'
import { worldTime } from '../world/worldTime.ts'
import { MEADOW_CLUSTERS, acceptsPlant } from './heroLayout.ts'

function blendDensity(uniform:{value:number},target:number,smooth:number){uniform.value+=(target-uniform.value)*smooth}
function blade() {
  const g=new BufferGeometry()
  g.setAttribute('position',new Float32BufferAttribute([-.03,0,0,.03,0,0,-.022,.28,.035,.022,.28,.035,-.012,.53,.12,.012,.53,.12,0,.72,.23],3))
  g.setIndex([0,1,2,1,3,2,2,3,4,3,5,4,4,5,6]);g.computeVertexNormals();return g
}
function leafBlade(width:number,length:number,cup:number) {
  const vertices:number[]=[],indices:number[]=[]
  for(let row=0;row<=4;row++)for(let column=0;column<3;column++) {
    const t=row/4,side=column-1,w=Math.sin(Math.PI*t)*width
    vertices.push(side*w,t*length,cup*t*t+Math.abs(side)*w*.25)
    if(row<4&&column<2){const k=row*3+column;indices.push(k,k+1,k+3,k+1,k+4,k+3)}
  }
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g
}
function fern() {
  const parts:BufferGeometry[]=[]
  for(let i=0;i<7;i++) for(const side of [-1,1]){
    const leaf=leafBlade(.06,.3*(1-i*.09),.05)
    leaf.rotateZ(side*(1.05+i*.045));leaf.translate(0,.06+i*.075,i*.055);parts.push(leaf)
  }
  const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());return g
}
function blossom() {
  const parts:BufferGeometry[]=[]
  for(let i=0;i<5;i++){const p=leafBlade(.04,.13,.035);p.rotateX(1.25);p.rotateY(i*Math.PI*.4);p.translate(0,.22,0);parts.push(p)}
  const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());return g
}
function windMaterial(color:string,family:keyof typeof VEGETATION) {
  const {windSpeed:speed,windAmplitude:amplitude,near,mid,far}=VEGETATION[family]
  const m=new MeshStandardMaterial({color,roughness:.85,side:DoubleSide})
  const u={time:{value:0},wind:{value:.2},snow:{value:0},wet:{value:0},density:{value:1}}
  m.onBeforeCompile=s=>{
    Object.assign(s.uniforms,{uPlantTime:u.time,uPlantWind:u.wind,uPlantSnow:u.snow,uPlantWet:u.wet,uPlantDensity:u.density})
    s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nuniform float uPlantTime,uPlantWind,uPlantDensity; varying float vLeafHeight;')
      .replace('#include <begin_vertex>',`#include <begin_vertex>
        vec3 origin=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
        float range=distance(cameraPosition,origin);
        float seed=fract(sin(dot(origin.xz,vec2(127.1,311.7)))*43758.5453);
        float tier=mix(1.,.48,smoothstep(${near.toFixed(1)},${mid.toFixed(1)},range));
        tier*=1.-smoothstep(${mid.toFixed(1)},${far.toFixed(1)},range);
        float visibility=smoothstep(seed-.06,seed+.06,tier*uPlantDensity);
        transformed*=visibility;
        float phase=instanceMatrix[3].x*.7+instanceMatrix[3].z*.43;
        float gust=sin(uPlantTime*.23+phase*.18)*.35+.65;
        float bend=sin(uPlantTime*${speed.toFixed(2)}+phase+position.y*1.7)*${amplitude.toFixed(3)}*(.2+uPlantWind)*gust;
        transformed.x+=bend*position.y*position.y*visibility;transformed.z+=bend*.37*position.y*visibility;
        vLeafHeight=clamp(position.y*1.8,0.,1.);`)
    s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform float uPlantSnow,uPlantWet; varying float vLeafHeight;')
      .replace('#include <color_fragment>',`#include <color_fragment>
        diffuseColor.rgb*=mix(.82,1.08,vLeafHeight)*(1.-uPlantWet*.12);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.72,.79,.82),uPlantSnow*smoothstep(.28,.9,vLeafHeight));`)
  }
  m.customProgramCacheKey=()=>`hero-wind-${speed}-${amplitude}`
  return {material:m,u}
}
export default function HeroMeadow({clusters=MEADOW_CLUSTERS,accepts=acceptsPlant,dense=false}:{clusters?:readonly (readonly number[])[];accepts?:(x:number,z:number)=>boolean;dense?:boolean}) {
  const grassCount=dense?16000:3000,fernCount=dense?1000:210,flowerCount=dense?2200:260
  const quality=useQuality(),grass=useRef<InstancedMesh>(null),ferns=useRef<InstancedMesh>(null),flowers=useRef<InstancedMesh>(null)
  const r=useMemo(()=>({blade:blade(),fern:fern(),flower:blossom(),green:windMaterial('#8b9b72','grass'),shrub:windMaterial('#6e9579','fern'),petals:windMaterial('#ded2b8','flower'),object:new Object3D(),color:new Color()}),[])
  useEffect(()=>{
    for(const [mesh,count,family] of [[grass.current,grassCount,0],[ferns.current,fernCount,1],[flowers.current,flowerCount,2]] as const){
      if(!mesh)continue
      for(let i=0;i<count;i++){
        // Interleave clusters so lower quality retains the whole composition.
        const [cx,cz,rx,rz]=clusters[i%clusters.length],a=i*2.399963,radius=Math.sqrt(((i*37)%101)/101)
        const x=cx+Math.cos(a)*radius*rx,z=cz+Math.sin(a)*radius*rz
        const scale=accepts(x,z)?(.5+((i*17)%13)/13*(dense?1.35:.65)):0
        r.object.position.set(x,riverbedHeight(x,z)+.008,z);r.object.rotation.set(.05,a,family===1?.2:0)
        r.object.scale.setScalar(scale);r.object.updateMatrix();mesh.setMatrixAt(i,r.object.matrix)
        r.color.setRGB(.78+(i%7)*.03,.82+(i%5)*.035,.75+(i%3)*.055);mesh.setColorAt(i,r.color)
      }
      mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true
      mesh.computeBoundingSphere()
    }
    return()=>{for(const g of [r.blade,r.fern,r.flower])g.dispose();for(const m of [r.green,r.shrub,r.petals])m.material.dispose()}
  },[r,clusters,accepts,dense,grassCount,fernCount,flowerCount])
  useFrame((_,delta)=>{
    const season=worldTime.realWorld.season, smooth=1-Math.exp(-delta*1.4)
    blendDensity(r.green.u.density,VEGETATION.grass.season[season],smooth)
    blendDensity(r.shrub.u.density,VEGETATION.fern.season[season],smooth)
    blendDensity(r.petals.u.density,VEGETATION.flower.season[season],smooth)
    for(const m of [r.green,r.shrub,r.petals]){m.u.time.value+=delta;m.u.wind.value=env.wind;m.u.snow.value=env.snow;m.u.wet.value=env.wetness}
    r.green.material.color.copy(env.grass).lerp(env.foliage,.35).multiplyScalar(1.15);r.shrub.material.color.copy(env.foliage);r.petals.material.color.copy(env.flower)
    const density=QUALITY[quality].vegetation
    if(grass.current)grass.current.count=Math.floor(grassCount*density)
    if(ferns.current)ferns.current.count=Math.floor(fernCount*density)
    if(flowers.current)flowers.current.count=Math.floor(flowerCount*density*(1-env.snow*.9))
  })
  return <group name="HeroMeadow">
    <instancedMesh ref={grass} args={[r.blade,r.green.material,grassCount]} receiveShadow/>
    <instancedMesh ref={ferns} args={[r.fern,r.shrub.material,fernCount]} receiveShadow/>
    <instancedMesh ref={flowers} args={[r.flower,r.petals.material,flowerCount]} receiveShadow/>
  </group>
}
