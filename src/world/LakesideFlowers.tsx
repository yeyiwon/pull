import { useEffect,useMemo,useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry,Color,DoubleSide,Float32BufferAttribute,Group,InstancedMesh,Object3D } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { branch,leafBlade } from './artGeometry.ts'
import { artMaterial,updateArtMaterial } from '../graphics/artMaterial.ts'
import { LAKESIDE_MEADOWS,acceptsLakesidePlant } from './lakesideDressing.ts'
import { riverbedHeight } from './terrain.ts'
import { worldTime } from './worldTime.ts'
import { QUALITY,useQuality } from '../graphics/quality.ts'
function paint(g:BufferGeometry,hex:string){const c=new Color(hex),values=new Float32Array(g.attributes.position.count*3);for(let i=0;i<values.length;i+=3)c.toArray(values,i);g.setAttribute('color',new Float32BufferAttribute(values,3));return g}
function flowerHead(x:number,y:number,z:number,petals:number,size:number){return Array.from({length:petals},(_,i)=>{const g=leafBlade(size*.25,size,.015);g.rotateX(Math.PI*.43);g.rotateY(i*Math.PI*2/petals);g.translate(x,y,z);return paint(g,'#eac851')})}
function flowers(bush:boolean){
 const parts:BufferGeometry[]=[]
 if(bush)for(let i=0;i<5;i++){
  const a=i*2.4,x=Math.cos(a)*.36,z=Math.sin(a)*.36,y=.65+(i%3)*.14
  parts.push(paint(branch([[0,0,0],[x*.4,y*.5,z*.4],[x,y,z]],.022,.006,8,5),'#78835c'))
  for(let j=1;j<=3;j++)parts.push(...flowerHead(x*j/3,y*j/3,z*j/3,4,.085))
 }else{
  parts.push(paint(branch([[0,0,0],[.02,.2,0],[.04,.38,.015]],.008,.005,6,4),'#71905a'))
  parts.push(...flowerHead(.04,.38,.015,14,.085))
  for(let i=0;i<4;i++){const g=leafBlade(.045,.24,.02);g.rotateX(1);g.rotateY(i*1.57);parts.push(paint(g,'#789356'))}
 }
 const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());return g
}
export default function LakesideFlowers(){
 const quality=useQuality(),group=useRef<Group>(null),bush=useRef<InstancedMesh>(null),dandelion=useRef<InstancedMesh>(null)
 const r=useMemo(()=>{const material=artMaterial('#ffffff','leaf');material.vertexColors=true;material.side=DoubleSide;return {bush:flowers(true),dandelion:flowers(false),material,object:new Object3D()}},[])
 useEffect(()=>{
  for(const [mesh,count,large] of [[bush.current,110,true],[dandelion.current,420,false]] as const){if(!mesh)continue
   for(let i=0;i<count;i++){
    const [cx,cz]=LAKESIDE_MEADOWS[i%LAKESIDE_MEADOWS.length],a=i*2.4,x=cx+Math.cos(a)*3,z=cz+Math.sin(a)*4
    r.object.position.set(x,riverbedHeight(x,z),z);r.object.rotation.set(0,a,0);r.object.scale.setScalar(acceptsLakesidePlant(x,z,large?.6:0)?(large?1.2:1.35)+(i%4)*.11:0);r.object.updateMatrix();mesh.setMatrixAt(i,r.object.matrix)
   }mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere()
  }
  return()=>{r.bush.dispose();r.dandelion.dispose();r.material.dispose()}
 },[r])
 useFrame(({clock})=>{if(group.current)group.current.visible=worldTime.realWorld.season==='spring';updateArtMaterial(r.material,clock.elapsedTime);if(bush.current)bush.current.count=Math.floor(110*QUALITY[quality].vegetation);if(dandelion.current)dandelion.current.count=Math.floor(420*QUALITY[quality].vegetation)})
 return <group ref={group} name="SpringForsythiaAndDandelions"><instancedMesh ref={bush} args={[r.bush,r.material,110]} receiveShadow/><instancedMesh ref={dandelion} args={[r.dandelion,r.material,420]} receiveShadow/></group>
}
