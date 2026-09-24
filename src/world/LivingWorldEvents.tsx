import { useEffect,useMemo,useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending,BufferGeometry,CanvasTexture,Color,DoubleSide,Float32BufferAttribute,Group,InstancedMesh,MeshBasicMaterial,Object3D,PointLight,Points,PointsMaterial,SphereGeometry,Vector3 } from 'three'
import { environmentState as env } from './environmentState.ts'
import { tickWorldEvents,worldEvents } from './worldEvents.ts'
import { worldTime } from './worldTime.ts'

const SHELLS=10,SPARKS_PER_SHELL=220,SPARKS=SHELLS*SPARKS_PER_SHELL,TRAILS=180
const SHOW_TIMES=[2.2,6.6,10.4,15.2,20.1,25.4,31.2,39.2,40.5,42] as const
const SHELL_X=[-25,21,-10,27,-23,7,24,-27,15,0] as const
const SHELL_Y=[19,24,29,21,26,32,23,28,31,34] as const
const SHELL_Z=[-18,13,3,-14,19,-5,-20,8,16,0] as const
const SHELL_SCALE=[.72,.94,1.3,.86,1,1.28,.82,1.08,1.16,1.48] as const
// Permanent launch field beyond OldBridge. It never derives from the camera.
const FIREWORKS_LAUNCH_ZONE=new Vector3(-2,0,-105)
const PALETTE=['#ffd477','#ff5a45','#ff4fa2','#7c5cff','#36b7ff','#32e1d0','#43d982','#d9e7ff','#ff9b3d','#c788ff']
const GLYPHS:Record<string,readonly string[]>={M:['10001','11011','10101','10001','10001','10001','10001'],O:['01110','10001','10001','10001','10001','10001','01110'],R:['11110','10001','10001','11110','10100','10010','10001'],U:['10001','10001','10001','10001','10001','10001','01110']}
const MORU_POINTS=Object.values(GLYPHS).flatMap((rows,letter)=>rows.flatMap((row,y)=>[...row].flatMap((cell,x)=>cell==='1'?[[letter*6+x-11.5,6-y] as const]:[])))
const hash=(n:number)=>Math.abs(Math.sin(n*91.733)*43758.5453)%1
function streakGeometry(width:number){
 const geometry=new BufferGeometry()
 // Two crossed, cap-free tapered ribbons stay line-like from every camera angle.
 geometry.setAttribute('position',new Float32BufferAttribute([-width,-.5,0,width,-.5,0,0,.5,0,0,-.5,-width,0,-.5,width,0,.5,0],3))
 geometry.setAttribute('color',new Float32BufferAttribute(new Array(18).fill(1),3))
 return geometry
}
function whiteVertexColors<T extends BufferGeometry>(geometry:T){const colors=new Float32Array(geometry.attributes.position.count*3);colors.fill(1);geometry.setAttribute('color',new Float32BufferAttribute(colors,3));return geometry}
export default function LivingWorldEvents(){
 const group=useRef<Group>(null),burstGroups=useRef<Group[]>([]),sparks=useRef<InstancedMesh>(null),sparkDots=useRef<InstancedMesh>(null),sparkPoints=useRef<Points>(null),trails=useRef<InstancedMesh>(null),flash=useRef<PointLight>(null),clock=useRef(0),eventRevision=useRef(-1),anchored=useRef(false)
 const r=useMemo(()=>{
  const pointPositions=new Float32Array(SPARKS*3),pointColors=new Float32Array(SPARKS*3),pointGeometry=new BufferGeometry()
  pointGeometry.setAttribute('position',new Float32BufferAttribute(pointPositions,3));pointGeometry.setAttribute('color',new Float32BufferAttribute(pointColors,3));pointGeometry.setDrawRange(0,0)
  const canvas=document.createElement('canvas');canvas.width=canvas.height=32;const context=canvas.getContext('2d')!,gradient=context.createRadialGradient(16,16,0,16,16,16);gradient.addColorStop(0,'#fff');gradient.addColorStop(.28,'#fff');gradient.addColorStop(.7,'#ffffff88');gradient.addColorStop(1,'#ffffff00');context.fillStyle=gradient;context.fillRect(0,0,32,32);const glow=new CanvasTexture(canvas)
  const burstGeometries=SHOW_TIMES.map((_,burst)=>{const positions:number[]=[],colors:number[]=[];for(let u=0;u<180;u++){const angle=u/180*Math.PI*2;let x=0,y=0,z=(hash(u+burst*91)-.5)*.12
   if(burst===9){const point=MORU_POINTS[u%MORU_POINTS.length];x=point[0]/7;y=(point[1]-1.8)/5;z=(Math.floor(u/MORU_POINTS.length)-1)*.025}
   else if(burst===8){x=Math.sin(angle)**3;y=(13*Math.cos(angle)-5*Math.cos(2*angle)-2*Math.cos(3*angle)-Math.cos(4*angle))/16-.12}
   else if(burst===2||burst===6){const radius=.58+.34*Math.cos(angle*6);x=Math.cos(angle)*radius;y=Math.sin(angle)*radius}
   else {const fy=1-2*(u+.5)/180,radial=Math.sqrt(Math.max(0,1-fy*fy)),theta=u*2.399963;x=Math.cos(theta)*radial;y=burst===4?fy*.7+.15:fy;z=Math.sin(theta)*radial*.42}
   positions.push(x,y,z);const color=new Color(PALETTE[(burst+u%6)%PALETTE.length]).lerp(new Color('#fff9e8'),u%11===0?.5:.08);colors.push(color.r,color.g,color.b)}const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('color',new Float32BufferAttribute(colors,3));return geometry})
  const burstMaterials=SHOW_TIMES.map(()=>new PointsMaterial({map:glow,size:.68,sizeAttenuation:true,vertexColors:true,transparent:true,opacity:0,blending:AdditiveBlending,depthWrite:false,toneMapped:false}))
  return {o:new Object3D(),c:new Color(),gold:new Color('#f2c878'),bright:new Color('#ffffff'),up:new Vector3(0,1,0),velocity:new Vector3(),pointPositions,pointColors,pointGeometry,pointMat:new PointsMaterial({map:glow,size:.78,sizeAttenuation:true,vertexColors:true,transparent:true,opacity:1,blending:AdditiveBlending,depthWrite:false,toneMapped:false}),burstGeometries,burstMaterials,glow,dot:whiteVertexColors(new SphereGeometry(.19,6,5)),dotMat:new MeshBasicMaterial({vertexColors:true,transparent:true,opacity:1,blending:AdditiveBlending,depthWrite:false,toneMapped:false}),spark:streakGeometry(.14),trail:streakGeometry(.075),sparkMat:new MeshBasicMaterial({side:DoubleSide,vertexColors:true,transparent:true,opacity:1,blending:AdditiveBlending,depthWrite:false,toneMapped:false})}
 },[])
 useEffect(()=>()=>{r.spark.dispose();r.trail.dispose();r.sparkMat.dispose();r.dot.dispose();r.dotMat.dispose();r.pointGeometry.dispose();r.pointMat.dispose();r.burstGeometries.forEach(geometry=>geometry.dispose());r.burstMaterials.forEach(material=>material.dispose());r.glow.dispose()},[r])
 // Three.js instance buffers and temporary transforms are intentionally mutated per frame.
 // Three.js owns these mutable render resources; React state is not used for frame data.
 // oxlint-disable react/immutability
 useFrame((_,delta)=>{
  tickWorldEvents(delta,{season:worldTime.realWorld.season,night:env.night>.72,now:worldTime.realWorld.date.getTime()})
  const state=worldEvents.getSnapshot(),active=state.active.some(event=>event.id==='FIREWORKS')
  if(active&&eventRevision.current!==state.revision){clock.current=0;eventRevision.current=state.revision;anchored.current=false}
  if(!active){clock.current=0;anchored.current=false;if(group.current)group.current.visible=false;if(sparks.current)sparks.current.count=0;if(sparkDots.current)sparkDots.current.count=0;if(sparkPoints.current)sparkPoints.current.geometry.setDrawRange(0,0);if(trails.current)trails.current.count=0;if(flash.current)flash.current.intensity=0;env.fireworksFlash=0;return}
  if(group.current)group.current.visible=true
  clock.current+=Math.min(delta,.1);const t=clock.current%48
  if(!anchored.current&&clock.current>.45&&group.current){
   group.current.position.copy(FIREWORKS_LAUNCH_ZONE);group.current.quaternion.identity();group.current.visible=true;anchored.current=true
  }
  if(!anchored.current)return
  for(let burst=0;burst<SHOW_TIMES.length;burst++){
   const burstGroup=burstGroups.current[burst],age=t-SHOW_TIMES[burst]
   if(!burstGroup)continue
   const ignition=age>=0&&age<.14;burstGroup.visible=ignition
   if(!ignition)continue
   burstGroup.position.set(SHELL_X[burst],SHELL_Y[burst],SHELL_Z[burst]);burstGroup.scale.setScalar(.12+age*2.2);r.burstMaterials[burst].opacity=(1-age/.14)*.72
  }
  let sparkCount=0,peak=0,peakBurst=-1
  for(let i=0;i<SPARKS;i++){const burst=Math.floor(i/SPARKS_PER_SHELL),u=i%SPARKS_PER_SHELL,phase=hash(i*17+burst*31)*.16,age=t-SHOW_TIMES[burst]-phase;if(age<0||age>6.6)continue
   const hero=burst===2||burst>=7,angle=u/SPARKS_PER_SHELL*Math.PI*2+hash(burst)*1.4+(hash(i+8)-.5)*.025,type=burst%6,life=(type===2?7.2:5.4)*( .9+hash(i*23)*.2),fade=Math.max(0,1-age/life),speed=((hero?7.1:4.7)+(u%7)*.11)*SHELL_SCALE[burst]*(.9+hash(i*29)*.2)
   const centerX=SHELL_X[burst],centerY=SHELL_Y[burst],centerZ=SHELL_Z[burst]
   let x=0,y=0,z=0
   if(burst===9){const point=MORU_POINTS[u%MORU_POINTS.length],expand=1-Math.exp(-age*3);x=point[0]*1.25*expand;y=(point[1]-.6)*1.25*expand-age*age*.08;z=(Math.floor(u/MORU_POINTS.length)-1)*.16}
   else if(burst===7){const ring=u%2,radius=(.66+ring*.28)*speed*age;x=Math.cos(angle)*radius;z=Math.sin(angle)*radius*.72;y=(hash(u+41)-.5)*.65-.78*age*age}
   else if(type===1){const radius=speed*age;x=Math.cos(angle)*radius;z=Math.sin(angle)*radius*.76;y=(hash(u+burst*31)-.5)*1.2-.72*age*age}
   else if(type===2){const radius=speed*age*(.8+hash(u)*.3);x=Math.cos(angle)*radius;z=Math.sin(angle)*radius*.68;y=(2.2+hash(u+4)*2.8)*age-1.34*age*age}
   else if(type===3){const branch=Math.floor(u/18)/12*Math.PI*2+.18,along=(u%18)/18,radius=speed*age*(.72+along*.4);x=Math.cos(branch)*radius;z=Math.sin(branch)*radius*.82;y=(.32+along*.9)*speed*age*.36-1.12*age*age}
   else if(type===4){const h=angle;x=Math.sin(h)**3*speed*age*.92;z=Math.cos(h)*speed*age*.3;y=(13*Math.cos(h)-5*Math.cos(2*h)-2*Math.cos(3*h)-Math.cos(4*h))*age*.2-1.05*age*age}
   else {const vertical=(hash(i+3)-.28)*1.4,radius=speed*age*(.78+hash(i+9)*.34);x=Math.cos(angle)*radius;z=Math.sin(angle)*radius*.78;y=vertical*age*3.7-1.08*age*age}
   const flicker=.52+hash(Math.floor(age*13)+i)*.52;r.o.position.set(centerX+x,centerY+y,centerZ+z);r.velocity.set(x,y+3.2-age*(1.7+hash(i+5)*.7),z);if(r.velocity.lengthSq()<.001)r.velocity.set(0,1,0);r.o.quaternion.setFromUnitVectors(r.up,r.velocity.normalize());r.o.scale.set(.42*flicker*fade,(2.2+age*(.78+hash(i+3)*.46))*flicker*fade,.42*flicker*fade);r.o.updateMatrix();sparks.current?.setMatrixAt(sparkCount,r.o.matrix)
   r.c.set(PALETTE[burst%PALETTE.length]).lerp(u%7===0?r.bright:r.gold,Math.min(u%7===0?.3:.13,age/life*.22)).multiplyScalar(.84+hash(i*11)*.18);sparks.current?.setColorAt(sparkCount,r.c)
   r.o.quaternion.identity();r.o.scale.setScalar((.22+flicker*.24)*fade);r.o.updateMatrix();sparkDots.current?.setMatrixAt(sparkCount,r.o.matrix);sparkDots.current?.setColorAt(sparkCount,r.c)
   const offset=sparkCount*3;r.pointPositions[offset]=centerX+x;r.pointPositions[offset+1]=centerY+y;r.pointPositions[offset+2]=centerZ+z;r.pointColors[offset]=r.c.r*fade;r.pointColors[offset+1]=r.c.g*fade;r.pointColors[offset+2]=r.c.b*fade
   sparkCount++;const ignition=Math.max(0,1-age*7.7);if(hero&&ignition>peak){peak=ignition;peakBurst=burst}
  }
  if(sparks.current){sparks.current.count=sparkCount;sparks.current.instanceMatrix.needsUpdate=true;if(sparks.current.instanceColor)sparks.current.instanceColor.needsUpdate=true}
  if(sparkDots.current){sparkDots.current.count=sparkCount;sparkDots.current.instanceMatrix.needsUpdate=true;if(sparkDots.current.instanceColor)sparkDots.current.instanceColor.needsUpdate=true}
  if(sparkPoints.current){sparkPoints.current.geometry.setDrawRange(0,sparkCount);sparkPoints.current.geometry.attributes.position.needsUpdate=true;sparkPoints.current.geometry.attributes.color.needsUpdate=true}
  let trailCount=0
  for(let launch=0;launch<SHELLS;launch++){const age=t-(SHOW_TIMES[launch]-2.15);if(age<0||age>2.3)continue;for(let n=0;n<16;n++){const progress=Math.max(0,age-n*.065);if(progress<=0)continue;const p=Math.min(1,progress/2.15),eased=1-(1-p)*(1-p);r.o.position.set(SHELL_X[launch]+Math.sin(progress*6+launch)*.2+(hash(n+launch*17)-.5)*.12,1+eased*(SHELL_Y[launch]-1),SHELL_Z[launch]+(hash(n*5+launch)-.5)*.12);r.o.quaternion.identity();r.o.scale.set(.36,.48+hash(n+launch)*.34,.36);r.o.updateMatrix();trails.current?.setMatrixAt(trailCount,r.o.matrix);r.c.set(PALETTE[launch%PALETTE.length]).lerp(r.bright,.32);trails.current?.setColorAt(trailCount,r.c);trailCount++}}
  if(trails.current){trails.current.count=trailCount;trails.current.instanceMatrix.needsUpdate=true;if(trails.current.instanceColor)trails.current.instanceColor.needsUpdate=true}
  env.fireworksFlash=peak;if(peakBurst>=0)env.fireworksColor.set(PALETTE[peakBurst%PALETTE.length]);if(flash.current){const burst=peakBurst>=0?peakBurst:0;flash.current.position.set(SHELL_X[burst],SHELL_Y[burst],SHELL_Z[burst]);flash.current.intensity=peak*380;flash.current.color.copy(env.fireworksColor)}
 })
 // oxlint-enable react/immutability
 return <group ref={group} name="LivingWorldEvents">
  {r.burstGeometries.map((geometry,index)=><group key={index} ref={value=>{if(value)burstGroups.current[index]=value}} visible={false}><points args={[geometry,r.burstMaterials[index]]} frustumCulled={false}/></group>)}
  <instancedMesh ref={sparks} args={[r.spark,r.sparkMat,SPARKS]} frustumCulled={false}/>
  <instancedMesh ref={sparkDots} args={[r.dot,r.dotMat,SPARKS]} frustumCulled={false}/>
  <points ref={sparkPoints} args={[r.pointGeometry,r.pointMat]} frustumCulled={false}/>
  <instancedMesh ref={trails} args={[r.trail,r.sparkMat,TRAILS]} frustumCulled={false}/>
  <pointLight ref={flash} intensity={0} distance={120} decay={2}/>
 </group>
}
