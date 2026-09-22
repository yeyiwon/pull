import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group,InstancedMesh,MeshStandardMaterial,Object3D,MathUtils } from 'three'
import { environmentState as env } from './environmentState.ts'
import { homeWorldPoint } from './homeSpace.ts'
import { HOME,ROCKS } from './worldLayout.ts'
import { worldTime } from './worldTime.ts'
import { petalGeometry } from './seasonGeometry.ts'
const flowerPositions=Array.from({length:48},(_,i)=>homeWorldPoint((i%2?1:-1)*(4.8+Math.sin(i*2.399)),2+(i%12)*.55))
const runoffPositions=Array.from({length:12},(_,i)=>homeWorldPoint(i%2?4.4:-4.4,-3+(i/2)*1.1))
function alpha(m:MeshStandardMaterial,v:number){m.opacity=v}
export default function WorldAccents(){
 const insects=useRef<Group>(null),growth=useRef<Group>(null),flowers=useRef<InstancedMesh>(null),runoff=useRef<InstancedMesh>(null)
 const time=useRef(0)
 const r=useMemo(()=>({object:new Object3D(),petal:petalGeometry(),snow:new MeshStandardMaterial({color:'#e4edf3',roughness:.95,transparent:true,opacity:0,depthWrite:false})}),[])
 useEffect(()=>()=>{r.petal.dispose();r.snow.dispose()},[r])
 useFrame((_,delta)=>{
  time.current+=delta;const t=time.current,o=r.object
  alpha(r.snow,env.snow)
  const season=worldTime.realWorld.season
  if(insects.current){insects.current.visible=(season==='spring'||season==='summer')&&env.night<.8;insects.current.children.forEach((bug,i)=>{
    bug.position.set(HOME.x-6+Math.sin(t*.25+i*2)*3,1.5+Math.sin(t*.8+i)*.4,HOME.z+7+Math.cos(t*.19+i*2)*3)
    bug.rotation.y=t*.15+i;bug.children[0].rotation.y=Math.sin(t*9+i)*.65;bug.children[1].rotation.y=-Math.sin(t*9+i)*.65
  })}
  if(growth.current)growth.current.scale.setScalar(MathUtils.smoothstep(env.richness,.45,.95))
  if(flowers.current){for(let i=0;i<48;i++){
    const a=i*2.399,p=flowerPositions[i];o.position.set(p.x,.3+Math.sin(t*.3+a)*.04,p.z)
    o.rotation.set(-Math.PI/2+.3*Math.sin(a),0,a);const s=Math.max(0,Math.min(1,env.richness*48-i))*(.3+env.bloom*.7)*(1-env.snow*.85)
    o.scale.setScalar(.25*s);o.updateMatrix();flowers.current.setMatrixAt(i,o.matrix)
  }flowers.current.instanceMatrix.needsUpdate=true}
  if(runoff.current){for(let i=0;i<12;i++){
    const a=(t*1.7+i*.37)%1,p=runoffPositions[i];o.position.set(p.x,(4.2-a*4)*HOME.scale,p.z);o.rotation.set(0,0,-env.wind*.1)
    o.scale.setScalar(env.rain);o.updateMatrix();runoff.current.setMatrixAt(i,o.matrix)
  }runoff.current.instanceMatrix.needsUpdate=true}
 })
 return <>
  <group ref={insects}>{[0,1,2,3].map(i=><group key={i}>{[-1,1].map(side=><mesh key={side} geometry={r.petal} position={[side*.1,0,0]} scale={[.24,.16,.24]} rotation={[-Math.PI/2,0,side*.6]}><meshStandardMaterial color={i%2?'#c5d7f5':'#f3d9c7'} side={2} roughness={.8}/></mesh>)}</group>)}</group>
  <instancedMesh ref={flowers} args={[r.petal,undefined,48]} frustumCulled={false}><meshStandardMaterial color="#e9d8da" side={2} roughness={.7}/></instancedMesh>
  <instancedMesh ref={runoff} args={[undefined,undefined,12]} frustumCulled={false}><cylinderGeometry args={[.008,.01,.35,4]}/><meshBasicMaterial color="#c3dae8" transparent opacity={.4} depthWrite={false}/></instancedMesh>
  {ROCKS.map(([x,y,z,sx,sy,sz],i)=><mesh key={i} position={[x,y+sy*.92,z]} scale={[sx*.7,.11,sz*.7]} material={r.snow}><sphereGeometry args={[1,16,8]}/></mesh>)}
  <group position={[-102,0,-113]}><group ref={growth}>
    <mesh position={[0,15,0]} rotation={[0,0,.1]}><cylinderGeometry args={[1.2,3.8,30,12]}/><meshStandardMaterial color="#637f88" roughness={1}/></mesh>
    {[[-10,30,0,16,6,11],[8,34,-1,18,7,12],[1,41,2,14,6,10]].map(([x,y,z,sx,sy,sz],i)=><mesh key={i} position={[x,y,z]} scale={[sx,sy,sz]}><sphereGeometry args={[1,24,14]}/><meshStandardMaterial color={i===2?'#c4c4df':'#91b6b3'} roughness={.9}/></mesh>)}
  </group></group>
 </>
}
