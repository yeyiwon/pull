import { useEffect,useMemo,useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color,ConeGeometry,CylinderGeometry,Group,IcosahedronGeometry,InstancedMesh,MeshPhysicalMaterial,MeshStandardMaterial,Object3D,PointLight,SphereGeometry } from 'three'
import { artificialLightLevel,useRendererMode } from '../graphics/rendererV2.ts'
import { environmentState as env } from './environmentState.ts'
import { surfaceHeight } from './terrain.ts'
import { TREES } from './worldLayout.ts'
import { worldTime } from './worldTime.ts'

const SELECTED_TREES=[0,1,2,4,5,6,8,9,11,12,14,16,18,19,20,22,23,26,28]
const COLORS=['#ffe1aa','#c9c7ff','#a63242','#23805d'] as const
function lightMaterial(color:string){return new MeshStandardMaterial({color,emissive:color,emissiveIntensity:0,roughness:.38,metalness:.03,toneMapped:false})}
function updateBulb(material:MeshStandardMaterial,base:Color,level:number,index:number){material.emissiveIntensity=level*(index<2?3.3:2.5);material.color.copy(base).multiplyScalar(.2+level*.8)}

export default function WinterIllumination(){
 const mode=useRendererMode(),meshes=useRef<(InstancedMesh|null)[]>([]),lights=useRef<(PointLight|null)[]>([]),decor=useRef<Group>(null)
 const snowBodies=useRef<InstancedMesh>(null),snowHeads=useRef<InstancedMesh>(null),snowHats=useRef<InstancedMesh>(null),snowNoses=useRef<InstancedMesh>(null),ice=useRef<InstancedMesh>(null)
 const r=useMemo(()=>({o:new Object3D(),bulb:new SphereGeometry(.078,7,5),snowball:new SphereGeometry(1,12,8),hat:new CylinderGeometry(.62,.7,.42,12),nose:new ConeGeometry(.15,.72,9),crystal:new IcosahedronGeometry(1,1),materials:COLORS.map(lightMaterial),base:COLORS.map(value=>new Color(value)),snowMat:new MeshStandardMaterial({color:'#e8f2f7',roughness:.72,emissive:'#b9d4e4',emissiveIntensity:.08}),hatMat:new MeshStandardMaterial({color:'#26303c',roughness:.65}),noseMat:new MeshStandardMaterial({color:'#d88445',roughness:.72}),iceMat:new MeshPhysicalMaterial({color:'#b9eaff',emissive:'#729fcb',emissiveIntensity:.45,transparent:true,opacity:.72,roughness:.18,metalness:.03,transmission:.12})}),[])
 useEffect(()=>{
  const slots=[0,0,0,0]
  for(const treeIndex of SELECTED_TREES){const tree=TREES[treeIndex];if(!tree)continue;const [x,z,s]=tree
   for(let n=0;n<36;n++){const palette=(treeIndex+n)%4,a=n*2.399+treeIndex*.4,ring=1.15+(n%5)*.4
    r.o.position.set(x+Math.cos(a)*ring*s,surfaceHeight(x,z)+(3.1+(n%7)*.53)*s,z+Math.sin(a)*ring*s);r.o.scale.setScalar(.82+(n%3)*.12);r.o.updateMatrix();meshes.current[palette]?.setMatrixAt(slots[palette]++,r.o.matrix)}
  }
  // A restrained path/house/bridge rhythm, rather than outlining every edge.
  const accents=[[-4,-7],[2,-11],[8,-17],[11,-24],[6,-31],[0,-38],[-7,-45],[-13,-52],[-5,-10],[1,-10],[7,-21],[13,-22],[6,-26],[14,-26],[-11,8],[-17,18]] as const
  for(let i=0;i<accents.length;i++)for(let n=0;n<5;n++){const palette=(i+n)%4,[x,z]=accents[i];r.o.position.set(x+(n-2)*.24,surfaceHeight(x,z)+.25+Math.sin(n*1.7)*.1,z);r.o.scale.setScalar(.75);r.o.updateMatrix();meshes.current[palette]?.setMatrixAt(slots[palette]++,r.o.matrix)}
  for(let i=0;i<meshes.current.length;i++){const mesh=meshes.current[i];if(mesh){mesh.count=slots[i];mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere()}}
  const snowmen=[[-9,-14,1],[14,-28,.9],[-18,13,1.15]] as const
  for(let i=0;i<snowmen.length;i++){const [x,z,s]=snowmen[i],y=surfaceHeight(x,z)
   r.o.position.set(x,y+.72*s,z);r.o.rotation.set(0,i*.7,0);r.o.scale.set(.72*s,.72*s,.72*s);r.o.updateMatrix();snowBodies.current?.setMatrixAt(i,r.o.matrix)
   r.o.position.set(x,y+1.68*s,z);r.o.scale.set(.5*s,.5*s,.5*s);r.o.updateMatrix();snowHeads.current?.setMatrixAt(i,r.o.matrix)
   r.o.position.set(x,y+2.23*s,z);r.o.scale.set(.72*s,.72*s,.72*s);r.o.updateMatrix();snowHats.current?.setMatrixAt(i,r.o.matrix)
   r.o.position.set(x,y+1.72*s,z+.58*s);r.o.rotation.set(Math.PI/2,0,0);r.o.scale.set(s,s,s);r.o.updateMatrix();snowNoses.current?.setMatrixAt(i,r.o.matrix)
  }
  const sculptures=[[-13,-9,1.25],[10,-19,1.45],[-7,-41,1.2],[17,8,1.35]] as const
  sculptures.forEach(([x,z,s],i)=>{r.o.position.set(x,surfaceHeight(x,z)+1.1*s,z);r.o.rotation.set(i*.31,i*.73,i*.18);r.o.scale.set(.55*s,1.35*s,.55*s);r.o.updateMatrix();ice.current?.setMatrixAt(i,r.o.matrix)})
  for(const mesh of [snowBodies.current,snowHeads.current,snowHats.current,snowNoses.current,ice.current])if(mesh){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere()}
  return()=>{for(const geometry of [r.bulb,r.snowball,r.hat,r.nose,r.crystal])geometry.dispose();for(const material of [...r.materials,r.snowMat,r.hatMat,r.noseMat,r.iceMat])material.dispose()}
 },[r])
 useFrame(()=>{
  const active=(mode==='V2_FULL'||mode==='V3_FULL'||mode==='V4_COZY_TEST')&&worldTime.realWorld.season==='winter',level=active?artificialLightLevel(env.night):0
	  for(let i=0;i<r.materials.length;i++){updateBulb(r.materials[i],r.base[i],level,i);if(meshes.current[i])meshes.current[i]!.visible=active}
	  if(decor.current)decor.current.visible=active
	  // Three.js owns this persistent runtime material; winter light follows the shared time profile.
	  // oxlint-disable-next-line react/immutability
	  r.iceMat.emissiveIntensity=.18+level*.72
  const pools=[[TREES[4]?.[0]??0,TREES[4]?.[1]??0],[8,-17],[-8,-45]] as const
  for(let i=0;i<lights.current.length;i++){const light=lights.current[i],point=pools[i];if(!light)continue;light.position.set(point[0],surfaceHeight(point[0],point[1])+2.2,point[1]);light.intensity=level*(i===0?70:55)}
 })
 return <group name="V2WinterIllumination">
  {COLORS.map((_,i)=><instancedMesh key={i} ref={mesh=>{meshes.current[i]=mesh}} args={[r.bulb,r.materials[i],192]}/>) }
  <group ref={decor}>
   <instancedMesh ref={snowBodies} args={[r.snowball,r.snowMat,3]} castShadow receiveShadow/>
   <instancedMesh ref={snowHeads} args={[r.snowball,r.snowMat,3]} castShadow receiveShadow/>
   <instancedMesh ref={snowHats} args={[r.hat,r.hatMat,3]} castShadow/>
   <instancedMesh ref={snowNoses} args={[r.nose,r.noseMat,3]} castShadow/>
   <instancedMesh ref={ice} args={[r.crystal,r.iceMat,4]}/>
  </group>
  <pointLight ref={light=>{lights.current[0]=light}} color="#ffe1aa" intensity={0} distance={8} decay={2}/>
  <pointLight ref={light=>{lights.current[1]=light}} color="#c9c7ff" intensity={0} distance={7} decay={2}/>
  <pointLight ref={light=>{lights.current[2]=light}} color="#b6cdf4" intensity={0} distance={7} decay={2}/>
 </group>
}
