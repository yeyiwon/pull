import { useEffect,useMemo,useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry,Color,CapsuleGeometry,CylinderGeometry,DoubleSide,IcosahedronGeometry,InstancedMesh,Matrix4,MeshStandardMaterial,Object3D,PlaneGeometry,SphereGeometry,TorusGeometry } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { artMaterial,updateArtMaterial } from '../graphics/artMaterial.ts'
import { useQuality } from '../graphics/quality.ts'
import { useRendererMode } from '../graphics/rendererV2.ts'
import { branch,leafBlade } from './artGeometry.ts'
import { environmentState as env } from './environmentState.ts'
import { surfaceHeight } from './terrain.ts'
import { allowsTerrestrialDetail,isShoreline } from './ecology.ts'
import { worldTime } from './worldTime.ts'
import { V3_FOREST_BANDS,V3_MOUNTAIN_LAYERS,WORLD_V3_LANDMARKS } from './worldV3.ts'

const GOLDEN=2.399963
function mergeLitGeometry(pieces:BufferGeometry[]){
 const prepared=pieces.map(piece=>{
  for(const name of Object.keys(piece.attributes))if(name!=='position'&&name!=='normal')piece.deleteAttribute(name)
  if(!piece.getAttribute('normal'))piece.computeVertexNormals()
  const geometry=piece.index?piece.toNonIndexed():piece
  if(geometry!==piece)piece.dispose()
  return geometry
 })
 const merged=mergeGeometries(prepared)
 prepared.forEach(piece=>piece.dispose())
 if(!merged)throw new Error('WorldV3Landscape: incompatible procedural geometry')
 return merged
}
function geologicalMass(){
 const g=new IcosahedronGeometry(1,3),p=g.attributes.position
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),ridge=1+.12*Math.sin(x*7+z*3)+.07*Math.cos(z*11-y*4),erosion=1-.1*Math.max(0,.42-y);p.setXYZ(i,x*ridge*erosion,y*(1+.24*Math.sin(x*6+z*5))+Math.max(0,y)*.13*Math.sin(z*13),z*ridge*erosion)}
 g.computeVertexNormals();return g
}
function forestTrunk(){return branch([[0,0,0],[-.08,2,.05],[.12,4.8,-.08],[.04,8.3,.08]],.42,.06)}
function ancientTrunk(){
 const pieces=[branch([[0,0,0],[-.5,3,.3],[.3,7,-.2],[0,12,0]],1.2,.18)]
 for(let i=0;i<10;i++){const a=i*GOLDEN,y=4.2+(i%5)*1.25,r=3.8+(i%3)*1.3;pieces.push(branch([[0,y,0],[Math.cos(a)*1.2,y+1.1,Math.sin(a)*1.2],[Math.cos(a)*r,y+2.7,Math.sin(a)*r]],.35,.06))}
 return mergeLitGeometry(pieces)
}

function craftedFlowerHead(){
 const pieces=[]
 for(let i=0;i<6;i++){const a=i*Math.PI/3,g=new IcosahedronGeometry(.12,1);g.applyMatrix4(new Matrix4().makeScale(1.25,.28,.62));g.applyMatrix4(new Matrix4().makeRotationY(a));g.applyMatrix4(new Matrix4().makeTranslation(Math.cos(a)*.105,0,Math.sin(a)*.105));pieces.push(g)}
 const center=new SphereGeometry(.065,8,5);center.applyMatrix4(new Matrix4().makeScale(1,.55,1));pieces.push(center)
 return mergeLitGeometry(pieces)
}
function craftedFlowerStem(){
 const stem=new CylinderGeometry(.025,.035,.52,6),leafA=leafBlade(.08,.26,.11),leafB=leafBlade(.07,.22,.1)
 leafA.applyMatrix4(new Matrix4().makeRotationZ(-.82));leafA.applyMatrix4(new Matrix4().makeTranslation(.12,.2,0))
 leafB.applyMatrix4(new Matrix4().makeRotationZ(.85));leafB.applyMatrix4(new Matrix4().makeRotationY(Math.PI));leafB.applyMatrix4(new Matrix4().makeTranslation(-.1,.3,.02))
 return mergeLitGeometry([stem,leafA,leafB])
}
function seasonalLeaves(){const s=worldTime.realWorld.season;return s==='spring'?'#a8bd86':s==='autumn'?'#a67843':s==='winter'?'#667c75':'#587e58'}
function mountainMaterial(color:string){return new MeshStandardMaterial({color,roughness:.98,metalness:0,flatShading:false})}

export default function WorldV3Landscape(){
 const mode=useRendererMode(),quality=useQuality(),treeLimit=quality==='PERFORMANCE'?92:quality==='BEAUTIFUL'?124:150,mountains=useRef<InstancedMesh[]>([]),trunks=useRef<InstancedMesh>(null),crowns=useRef<InstancedMesh>(null),reeds=useRef<InstancedMesh>(null),ferns=useRef<InstancedMesh>(null),flowerStems=useRef<InstancedMesh>(null),flowerHeads=useRef<InstancedMesh>(null),shoreStones=useRef<InstancedMesh>(null),moss=useRef<InstancedMesh>(null),ancientRoots=useRef<InstancedMesh>(null),ancientCrowns=useRef<InstancedMesh>(null),shrinePillars=useRef<InstancedMesh>(null),gardenStones=useRef<InstancedMesh>(null)
 const clock=useRef(0),lastSeason=useRef('')
 const r=useMemo(()=>({
  o:new Object3D(),color:new Color(),mountain:geologicalMass(),trunk:forestTrunk(),crown:new IcosahedronGeometry(1,2),blade:leafBlade(.16,1.35,.28),fern:leafBlade(.34,.72,.7),ancient:ancientTrunk(),ancientCrown:new IcosahedronGeometry(1,2),stone:new CylinderGeometry(1.8,2.3,5.8,10),ring:new TorusGeometry(2.15,.16,7,28),waterfall:new PlaneGeometry(3.2,15,4,16),flowerStem:craftedFlowerStem(),flowerHead:craftedFlowerHead(),shoreStone:new IcosahedronGeometry(1,2),moss:new CapsuleGeometry(.32,.16,3,7),
  mountainMaterials:V3_MOUNTAIN_LAYERS.map(layer=>mountainMaterial(layer.color)),wood:artMaterial('#625348','bark'),leaves:artMaterial('#617f60','leaf'),reed:Object.assign(artMaterial('#718b65','leaf'),{side:DoubleSide}),fernMat:Object.assign(artMaterial('#4f765b','leaf'),{side:DoubleSide}),ruin:artMaterial('#6e7479','stone'),stem:artMaterial('#5d815d','leaf'),petal:new MeshStandardMaterial({color:'#d8b3ca',roughness:.76}),shoreRock:artMaterial('#69787a','stone'),mossMat:artMaterial('#496952','leaf'),water:new MeshStandardMaterial({color:'#9ee8ed',emissive:'#4ba3b5',emissiveIntensity:.18,transparent:true,opacity:.42,roughness:.18,metalness:.02,side:DoubleSide,depthWrite:false}),garden:new MeshStandardMaterial({color:'#bda7d2',emissive:'#705c98',emissiveIntensity:.14,roughness:.66}),
 }),[])
 useEffect(()=>()=>{for(const g of [r.mountain,r.trunk,r.crown,r.blade,r.fern,r.ancient,r.ancientCrown,r.stone,r.ring,r.waterfall,r.flowerStem,r.flowerHead,r.shoreStone,r.moss])g.dispose();for(const m of [...r.mountainMaterials,r.wood,r.leaves,r.reed,r.fernMat,r.ruin,r.stem,r.petal,r.shoreRock,r.mossMat,r.water,r.garden])m.dispose()},[r])
 useEffect(()=>{
  if(mode!=='V3_FULL')return
  for(let layer=0;layer<V3_MOUNTAIN_LAYERS.length;layer++){
   const mesh=mountains.current[layer],items=V3_MOUNTAIN_LAYERS[layer].positions;if(!mesh)continue
   items.forEach(([x,y,z,sx,sy,sz],i)=>{r.o.position.set(x,y,z);r.o.rotation.set(0,(i*.73+layer*.41)%Math.PI,0);r.o.scale.set(sx,sy,sz);r.o.updateMatrix();mesh.setMatrixAt(i,r.o.matrix)});mesh.count=items.length;mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere()
  }
  let tree=0
  for(const [bandIndex,band] of V3_FOREST_BANDS.entries())for(let i=0;i<band.count&&tree<treeLimit;i++){
   const a=i/band.count*Math.PI*2+bandIndex*.19;if(band.gaps.some(g=>Math.abs(Math.atan2(Math.sin(a-g),Math.cos(a-g)))<.19))continue
   const wobble=Math.sin(i*12.9898+bandIndex*4.17)*5.8,x=Math.cos(a)*(band.radius+wobble),z=Math.sin(a)*(band.radius+wobble),scale=(band.scale[0]+((i*37)%100)/100*(band.scale[1]-band.scale[0]))*1.18
   r.o.position.set(x,surfaceHeight(x,z),z);r.o.rotation.set(0,a+i*.41,0);r.o.scale.set(scale*.9,scale,scale*.9);r.o.updateMatrix();trunks.current?.setMatrixAt(tree,r.o.matrix)
   r.o.position.setY(r.o.position.y+6.4*scale);r.o.scale.set(2.3*scale,2.1*scale,2.3*scale);r.o.updateMatrix();crowns.current?.setMatrixAt(tree,r.o.matrix);tree++
  }
  if(trunks.current){trunks.current.count=tree;trunks.current.instanceMatrix.needsUpdate=true;trunks.current.computeBoundingSphere()}if(crowns.current){crowns.current.count=tree;crowns.current.instanceMatrix.needsUpdate=true;crowns.current.computeBoundingSphere()}
  let reed=0,fern=0
  for(let i=0;i<820&&reed<180;i++){const a=i*GOLDEN,z=25+(i%210)*.31,x=Math.sin(a)*(16+(i%5)*1.25);if(!isShoreline(x,z)||i%5===0||i%7===0)continue;r.o.position.set(x,surfaceHeight(x,z)+.03,z);r.o.rotation.set(.08,a,(i%5-2)*.04);const s=.62+(i%9)*.08;r.o.scale.set(s,s*(1.1+(i%4)*.13),s);r.o.updateMatrix();reeds.current?.setMatrixAt(reed++,r.o.matrix)}
  for(let i=0;i<520&&fern<180;i++){const landmark=WORLD_V3_LANDMARKS[i%3],a=i*GOLDEN,rad=3+(i%17)*.42,x=landmark.visual[0]+Math.cos(a)*rad,z=landmark.visual[1]+Math.sin(a)*rad;if(!allowsTerrestrialDetail(x,z))continue;r.o.position.set(x,surfaceHeight(x,z)+.02,z);r.o.rotation.set(.1,a,(i%7-3)*.05);const s=.45+(i%8)*.08;r.o.scale.set(s,s,s);r.o.updateMatrix();ferns.current?.setMatrixAt(fern++,r.o.matrix)}
  let flower=0,stone=0
  const flowerLimit=quality==='PERFORMANCE'?36:72,stoneLimit=quality==='PERFORMANCE'?32:58
  for(let i=0;i<flowerLimit;i++){const anchor=WORLD_V3_LANDMARKS[i%3],a=i*GOLDEN+.4,rad=2.4+(i%13)*.39,x=anchor.visual[0]+Math.cos(a)*rad,z=anchor.visual[1]+Math.sin(a)*rad;if(!allowsTerrestrialDetail(x,z))continue;const y=surfaceHeight(x,z),h=.62+(i%5)*.08;r.o.position.set(x,y+h*.5,z);r.o.rotation.set((i%3-1)*.04,a,(i%5-2)*.05);r.o.scale.set(1,h/.52,1);r.o.updateMatrix();flowerStems.current?.setMatrixAt(flower,r.o.matrix);r.o.position.setY(y+h);r.o.rotation.set(i*.17,a,i*.09);r.o.scale.set(.82+(i%4)*.08,.58+(i%3)*.06,.82+(i%4)*.08);r.o.updateMatrix();flowerHeads.current?.setMatrixAt(flower,r.o.matrix);flower++}
  for(let i=0;i<stoneLimit;i++){const a=i*GOLDEN,z=28+(i%39)*1.25,x=Math.sin(a)*(18+(i%4)*1.3);if(!isShoreline(x,z)||i%4===0)continue;const y=surfaceHeight(x,z),scale=.22+(i%7)*.075;r.o.position.set(x,y+scale*.15,z);r.o.rotation.set(i*.11,a,(i%5-2)*.09);r.o.scale.set(scale*(1+(i%3)*.2),scale*.48,scale);r.o.updateMatrix();shoreStones.current?.setMatrixAt(stone,r.o.matrix);r.o.position.set(x+.05,y+scale*.41,z-.03);r.o.rotation.set(0,a,Math.PI/2);r.o.scale.setScalar(scale*.65);r.o.updateMatrix();moss.current?.setMatrixAt(stone,r.o.matrix);stone++}
  for(const [mesh,count] of [[reeds.current,reed],[ferns.current,fern],[flowerStems.current,flower],[flowerHeads.current,flower],[shoreStones.current,stone],[moss.current,stone]] as const)if(mesh){mesh.count=count;mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere()}
  for(let i=0;i<9;i++){const a=i*GOLDEN;r.o.position.set(Math.cos(a)*1.2,.2,Math.sin(a)*1.2);r.o.rotation.set(Math.PI/2,0,-a);r.o.scale.set(.42,.7+(i%3)*.16,.32);r.o.updateMatrix();ancientRoots.current?.setMatrixAt(i,r.o.matrix)}
  for(let i=0;i<7;i++){r.o.position.set(Math.cos(i*GOLDEN)*3.8,10.5+(i%3)*1.25,Math.sin(i*GOLDEN)*3.5);r.o.rotation.set(0,i*.31,0);r.o.scale.set(3.8+(i%2),2.7+(i%3)*.35,3.6+(i%2)*.7);r.o.updateMatrix();ancientCrowns.current?.setMatrixAt(i,r.o.matrix)}
  for(const [i,side] of [-1,1].entries()){r.o.position.set(side*3.2,1.25,.6);r.o.rotation.set(0,0,0);r.o.scale.set(.38,.44,.38);r.o.updateMatrix();shrinePillars.current?.setMatrixAt(i,r.o.matrix)}
  for(let i=0;i<8;i++){r.o.position.set(Math.cos(i*Math.PI/4)*4.3,.7,Math.sin(i*Math.PI/4)*4.3);r.o.rotation.set(0,-i*Math.PI/4,0);r.o.scale.set(.26,.25+(i%3)*.08,.26);r.o.updateMatrix();gardenStones.current?.setMatrixAt(i,r.o.matrix)}
  for(const mesh of [ancientRoots.current,ancientCrowns.current,shrinePillars.current,gardenStones.current])if(mesh){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere()}
 },[mode,r,treeLimit,quality])
 // Materials are persistent Three.js resources; frame updates intentionally mutate their runtime uniforms.
 // oxlint-disable-next-line react/immutability
 useFrame((_,delta)=>{if(mode!=='V3_FULL')return;clock.current+=delta;for(const material of [r.wood,r.leaves,r.reed,r.fernMat,r.ruin,r.stem,r.shoreRock,r.mossMat])updateArtMaterial(material,clock.current);const season=worldTime.realWorld.season;if(lastSeason.current!==season){lastSeason.current=season;r.leaves.color.set(seasonalLeaves());r.reed.color.copy(env.grass).multiplyScalar(.88);r.fernMat.color.copy(env.grass).multiplyScalar(.72);r.mossMat.color.copy(env.grass).multiplyScalar(.58);r.petal.color.set(season==='spring'?'#e8afca':season==='autumn'?'#c99450':season==='winter'?'#aab9c2':'#d9c36f')}r.water.opacity=.32+env.rain*.12;r.water.emissiveIntensity=.1+env.night*.16})
 if(mode!=='V3_FULL')return null
 return <group name="WorldV3LivingLandscape">
  {V3_MOUNTAIN_LAYERS.map((layer,i)=><instancedMesh key={i} ref={mesh=>{if(mesh)mountains.current[i]=mesh}} args={[r.mountain,r.mountainMaterials[i],layer.positions.length]} receiveShadow={false}/>) }
  <instancedMesh ref={trunks} args={[r.trunk,r.wood,treeLimit]} castShadow={false} receiveShadow/>
  <instancedMesh ref={crowns} args={[r.crown,r.leaves,treeLimit]} castShadow={false} receiveShadow/>
  <instancedMesh ref={reeds} args={[r.blade,r.reed,180]} receiveShadow/>
  <instancedMesh ref={ferns} args={[r.fern,r.fernMat,180]} receiveShadow/>
  <instancedMesh ref={flowerStems} args={[r.flowerStem,r.stem,72]} receiveShadow/>
  <instancedMesh ref={flowerHeads} args={[r.flowerHead,r.petal,72]} receiveShadow/>
  <instancedMesh ref={shoreStones} args={[r.shoreStone,r.shoreRock,58]} castShadow receiveShadow/>
  <instancedMesh ref={moss} args={[r.moss,r.mossMat,58]} receiveShadow/>
  <group name="AncientTree" position={[-56,surfaceHeight(-56,47),47]}>
   <mesh geometry={r.ancient} material={r.wood} castShadow receiveShadow/>
   <instancedMesh ref={ancientRoots} args={[r.trunk,r.wood,9]} castShadow receiveShadow/>
   <instancedMesh ref={ancientCrowns} args={[r.ancientCrown,r.leaves,7]} castShadow receiveShadow/>
  </group>
  <group name="MoonShrine" position={[62,surfaceHeight(62,57),57]} rotation={[0,-.55,0]}>
   <mesh geometry={r.stone} material={r.ruin} position={[0,2.9,0]} castShadow receiveShadow/>
   <mesh geometry={r.ring} material={r.garden} position={[0,6.1,0]} rotation={[0,0,Math.PI/2]}/>
   <instancedMesh ref={shrinePillars} args={[r.stone,r.ruin,2]} castShadow receiveShadow/>
  </group>
  <group name="HiddenGarden" position={[-55,surfaceHeight(-55,-48),-48]}>
   <instancedMesh ref={gardenStones} args={[r.stone,r.ruin,8]} receiveShadow/>
   <mesh geometry={r.ring} material={r.garden} position={[0,.3,0]} rotation={[Math.PI/2,0,0]} scale={1.7}/>
  </group>
  <group name="DistantWaterfall" position={[-81,10,-116]} rotation={[0,.18,0]}>
   <mesh geometry={r.waterfall} material={r.water}/>
  </group>
 </group>
}
