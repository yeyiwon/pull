import { LAKE_BENCH } from './bench.ts'
import { useEffect,useMemo,useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry,Color,CatmullRomCurve3,Float32BufferAttribute,InstancedMesh,MeshStandardMaterial,Object3D,PointLight,Vector3 } from 'three'
import { artMaterial,updateArtMaterial } from '../graphics/artMaterial.ts'
import { environmentState as env } from './environmentState.ts'
import { worldTime } from './worldTime.ts'
import { surfaceHeight,streamCenter,streamWidth } from './terrain.ts'
import { homeWorldPoint } from './homeSpace.ts'
import type { Player } from './locomotion.ts'

const LAMP_COLORS={spring:'#bf8bea',summer:'#ffe4b8',autumn:'#ffae68',winter:'#d6ceff'}
function setGlow(material:MeshStandardMaterial,value:number){material.emissiveIntensity=value}
function bank(z:number,side:number){return new Vector3(streamCenter(z)+side*(streamWidth(z)+5),.045,z)}
function ribbon(curve:CatmullRomCurve3){
 const g=new BufferGeometry(),vertices:number[]=[],indices:number[]=[],colors:number[]=[]
 const rows=180,columns=12,soil=new Color('#afa48c'),edge=new Color('#7c8970'),c=new Color()
 for(let i=0;i<=rows;i++){
  const p=curve.getPoint(i/rows),t=curve.getTangent(i/rows),l=Math.hypot(t.x,t.z),nx=-t.z/l,nz=t.x/l
  for(let j=0;j<=columns;j++){
   const u=j/columns*2-1,edgeWeight=Math.abs(u)**5
   const width=2.5+edgeWeight*(.32+Math.sin(i*.29)*.13+Math.sin(i*.71)*.09)
   const x=p.x+nx*u*width,z=p.z+nz*u*width
   // A shallow crowned earth profile sinks into the verge rather than floating as a strip.
   const y=surfaceHeight(x,z)+.009+.055*(1-u*u)+Math.sin(x*2.1+z*.73)*.005*(1-edgeWeight)
   vertices.push(x,y,z)
   c.copy(soil).lerp(edge,edgeWeight).multiplyScalar(.96+.04*Math.sin(x*.67+z*.83));colors.push(c.r,c.g,c.b)
   if(i<rows&&j<columns){const k=i*(columns+1)+j;indices.push(k,k+columns+1,k+1,k+1,k+columns+1,k+columns+2)}
  }
 }
 g.setAttribute('position',new Float32BufferAttribute(vertices,3));g.setAttribute('color',new Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g
}
export default function ProceduralLakePark({player}:{player:RefObject<Player>}){
 const lamps=useRef<InstancedMesh>(null),caps=useRef<InstancedMesh>(null),bulbs=useRef<InstancedMesh>(null),festive=useRef<InstancedMesh>(null)
 const frames=useRef<InstancedMesh>(null),bases=useRef<InstancedMesh>(null),finials=useRef<InstancedMesh>(null)
 const lights=useRef<(PointLight|null)[]>([])
 const r=useMemo(()=>{
  const porch=homeWorldPoint(1.8,5.5)
  const points=Array.from({length:13},(_,i)=>28+i*5)
  const east=new CatmullRomCurve3([new Vector3(porch.x,.045,porch.z),new Vector3(17,.045,-9),new Vector3(27,.045,10),...points.map(z=>bank(z,1))])
  const west=new CatmullRomCurve3([new Vector3(-13,.045,5),new Vector3(-8,.045,17),...points.map(z=>bank(z,-1))])
  const stations=[35,46,59,72,83].flatMap((z,i)=>[-1,1].map(side=>{const p=bank(z+(side>0?1:0),side);p.x+=side*3.2;return {x:p.x,z:p.z,height:4.5+(i%2)*.25}}))
  return {paths:[ribbon(east),ribbon(west)],stations,object:new Object3D(),path:Object.assign(artMaterial('#ffffff','plaster'),{vertexColors:true}),benchMetal:new MeshStandardMaterial({color:'#151a1b',roughness:.46,metalness:.7}),metal:new MeshStandardMaterial({color:'#34403e',roughness:.57,metalness:.35}),glow:new MeshStandardMaterial({color:'#fff2db',emissive:'#d7b5ef',emissiveIntensity:.4,toneMapped:false,userData:{managedGlow:true}})}
 },[])
 useEffect(()=>{
  const o=r.object
  r.stations.forEach((p,i)=>{
   o.position.set(p.x,p.height/2,p.z);o.scale.set(.09,p.height,.09);o.updateMatrix();lamps.current?.setMatrixAt(i,o.matrix)
   o.position.y=p.height+.2;o.scale.set(.53,.42,.53);o.updateMatrix();caps.current?.setMatrixAt(i,o.matrix)
   o.position.y=p.height-.3;o.scale.set(.29,.66,.29);o.updateMatrix();bulbs.current?.setMatrixAt(i,o.matrix)
   for(let n=0;n<4;n++){const a=Math.PI/4+n*Math.PI/2;o.position.set(p.x+Math.cos(a)*.36,p.height-.3,p.z+Math.sin(a)*.36);o.scale.set(.028,.78,.028);o.updateMatrix();frames.current?.setMatrixAt(i*4+n,o.matrix)}
   o.position.set(p.x,.28,p.z);o.scale.set(.21,.56,.21);o.updateMatrix();bases.current?.setMatrixAt(i*2,o.matrix)
   o.position.y=p.height-.7;o.scale.set(.38,.13,.38);o.updateMatrix();bases.current?.setMatrixAt(i*2+1,o.matrix)
   o.position.y=p.height+.51;o.scale.set(.08,.22,.08);o.updateMatrix();finials.current?.setMatrixAt(i,o.matrix)
   for(let n=0;n<12;n++){const a=n*.95;o.position.set(p.x+Math.cos(a)*.13,.8+n*.2,p.z+Math.sin(a)*.13);o.scale.setScalar(.042);o.updateMatrix();festive.current?.setMatrixAt(i*12+n,o.matrix)}
  })
  for(const mesh of [lamps.current,caps.current,bulbs.current,festive.current,frames.current,bases.current,finials.current])if(mesh){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere()}
  return()=>{r.paths.forEach(g=>g.dispose());r.path.dispose();r.metal.dispose();r.benchMetal.dispose();r.glow.dispose()}
 },[r])
 useFrame(({clock})=>{
  updateArtMaterial(r.path,clock.elapsedTime)
  const winter=worldTime.realWorld.season==='winter',color=LAMP_COLORS[worldTime.realWorld.season]
  r.glow.emissive.set(color);setGlow(r.glow,.12+env.night*(winter?2.9:2.3))
  if(festive.current)festive.current.visible=winter
  let first=-1,second=-1,d1=Infinity,d2=Infinity
  for(let i=0;i<r.stations.length;i++){const p=r.stations[i],d=(p.x-player.current.position.x)**2+(p.z-player.current.position.z)**2;if(d<d1){second=first;d2=d1;first=i;d1=d}else if(d<d2){second=i;d2=d}}
  for(let i=0;i<2;i++){const light=lights.current[i],p=r.stations[i===0?first:second];if(light&&p){light.position.set(p.x,p.height-.4,p.z);light.color.set(color);light.intensity=env.night*42}}
 })
 return <group name="ProceduralLakePark">
  {r.paths.map((g,i)=><mesh key={i} geometry={g} material={r.path} receiveShadow/>)}
  <instancedMesh ref={lamps} args={[undefined,r.metal,10]}><cylinderGeometry args={[1,1,1,8]}/></instancedMesh>
  <instancedMesh ref={caps} args={[undefined,r.metal,10]}><coneGeometry args={[1,1,4]}/></instancedMesh>
  <instancedMesh ref={bulbs} args={[undefined,r.glow,10]}><cylinderGeometry args={[.85,1,1,4]}/></instancedMesh>
  <instancedMesh ref={festive} args={[undefined,r.glow,120]}><sphereGeometry args={[1,5,3]}/></instancedMesh>
  <instancedMesh ref={frames} args={[undefined,r.metal,40]}><cylinderGeometry args={[1,1,1,6]}/></instancedMesh>
  <instancedMesh ref={bases} args={[undefined,r.metal,20]}><cylinderGeometry args={[.8,1,1,8]}/></instancedMesh>
  <instancedMesh ref={finials} args={[undefined,r.metal,10]}><sphereGeometry args={[1,8,6]}/></instancedMesh>
  <group name="LakesideBench" position={[LAKE_BENCH.x,LAKE_BENCH.y,LAKE_BENCH.z]} rotation={[0,LAKE_BENCH.yaw,0]}>
   {Array.from({length:7},(_,i)=><mesh key={'seat'+i} position={[0,LAKE_BENCH.seatHeight-.045,-.35+i*.115]} material={r.benchMetal} castShadow receiveShadow><boxGeometry args={[2.85,.09,.085]}/></mesh>)}
   {Array.from({length:13},(_,i)=><mesh key={'back'+i} position={[-1.26+i*.21,1.45,-.46]} material={r.benchMetal} castShadow><cylinderGeometry args={[.025,.025,.78,6]}/></mesh>)}
   <mesh position={[0,1.86,-.46]} material={r.benchMetal} castShadow><boxGeometry args={[2.85,.09,.09]}/></mesh>
   <mesh position={[0,1.12,-.46]} material={r.benchMetal} castShadow><boxGeometry args={[2.85,.07,.09]}/></mesh>
   {[-1.23,1.23].flatMap(x=>[-.36,.3].map(z=><mesh key={`${x}:${z}`} position={[x,.51,z]} material={r.benchMetal} castShadow><cylinderGeometry args={[.045,.075,1.02,8]}/></mesh>))}
   {[-1.32,1.32].map(x=><group key={x}>
    <mesh position={[x,1.29,-.08]} rotation={[0,Math.PI/2,0]} material={r.benchMetal} castShadow><torusGeometry args={[.39,.04,6,16,Math.PI]}/></mesh>
    <mesh position={[x,1.25,-.47]} material={r.benchMetal} castShadow><cylinderGeometry args={[.045,.055,1.2,8]}/></mesh>
   </group>)}
  </group>
  {[0,1].map(i=><pointLight key={i} ref={light=>{lights.current[i]=light}} intensity={0} distance={16} decay={2}/>)}
 </group>
}
