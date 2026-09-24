import { useEffect,useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { DoubleSide,Shape,ShapeGeometry } from 'three'
import { artMaterial,updateArtMaterial } from '../graphics/artMaterial.ts'
import { homeState } from './homeSpace.ts'
import { environmentState as env } from './environmentState.ts'

function glow(material:ReturnType<typeof artMaterial>,value:number){material.emissiveIntensity=value}
function fade(material:ReturnType<typeof artMaterial>,opacity:number){material.opacity=opacity}
// Wall panels surround real openings; glazing sits inside the reveal, not on a solid wall.
export default function NativeHouseShell(){
 const r=useMemo(()=>{
  const wall=artMaterial('#d9ccb6','plaster'),wood=artMaterial('#776453','bark'),roof=artMaterial('#52606b'),glass=artMaterial('#adccd1'),floor=artMaterial('#ad987b')
  for(const m of [wall,wood,roof,floor])m.transparent=true
  glass.transparent=true;glass.opacity=.2;glass.roughness=.24;glass.side=DoubleSide
  const windowGlow=artMaterial('#b89e7b');windowGlow.emissive.set('#ffd8a0');windowGlow.toneMapped=false
  const shape=new Shape();shape.moveTo(-4.6,8.05);shape.lineTo(0,10.35);shape.lineTo(4.6,8.05);shape.closePath()
  return {windowGlow,wall,wood,roof,glass,floor,gable:new ShapeGeometry(shape)}
 },[])
 useEffect(()=>()=>{for(const m of [r.windowGlow,r.wall,r.wood,r.roof,r.glass,r.floor])m.dispose();r.gable.dispose()},[r])
 useFrame(({clock})=>{glow(r.windowGlow,env.night*2.9);for(const m of [r.wall,r.wood,r.roof,r.floor])updateArtMaterial(m,clock.elapsedTime);fade(r.wall,1-homeState.cutaway*.82);fade(r.wood,1-homeState.cutaway*.8);fade(r.roof,1-homeState.cutaway*.98);fade(r.floor,1-homeState.cutaway*.98)})
 const box=(key:string,p:[number,number,number],size:[number,number,number],material=r.wall)=><mesh key={key} position={p} material={material} castShadow receiveShadow><boxGeometry args={size}/></mesh>
 function windowAt(x:number,y:number,z:number,width:number,height:number,turn=0){return <group key={`${x}-${y}-${z}`} position={[x,y,z]} rotation={[0,turn,0]}>
  {[-1,1].map(side=>box(`jamb${side}`,[side*width/2,0,0],[.12,height+.22,.24],r.wood))}
  {[-1,1].map(side=>box(`sill${side}`,[0,side*height/2,0],[width+.22,.13,.32],r.wood))}
  {box('mullion',[0,0,.015],[.055,height,.15],r.wood)}
  <mesh position={[0,0,-.065]} material={r.glass}><planeGeometry args={[width,height]}/></mesh>
  <mesh position={[0,0,-.18]} material={r.windowGlow}><planeGeometry args={[width-.07,height-.07]}/></mesh>
 </group>}
 const panels=[]
 const xs=[-4,-3.3,-1.1,.65,2.95,4],ys=[0,1.05,2.8,3.44,4.5,5.2,7,8.1]
 for(let xi=0;xi<xs.length-1;xi++)for(let yi=0;yi<ys.length-1;yi++){
  const x=(xs[xi]+xs[xi+1])/2,y=(ys[yi]+ys[yi+1])/2,w=xs[xi+1]-xs[xi],h=ys[yi+1]-ys[yi]
  const door=x>.65&&x<2.95&&y<3.44,opening=(x>-3.3&&x<-1.1&&y>1.05&&y<2.8)||((xi===1||xi===3)&&y>5.2&&y<7)
  if(!door&&!opening)panels.push(box(`front${xi}-${yi}`,[x,y,3.5],[w,h,.26]))
 }
 return <group name="NativeLakesideManor">
  {panels}
  {windowAt(-2.2,1.925,3.54,2.2,1.75)}{windowAt(-2.2,6.1,3.54,2.2,1.8)}{windowAt(1.8,6.1,3.54,2.3,1.8)}
  {box('back',[0,4.05,-3.5],[8,8.1,.26])}
  {[-1,1].map(side=><group key={side} position={[side*4,0,0]} rotation={[0,side*Math.PI/2,0]}>
   {box('lower',[0,.52,0],[7,1.04,.26])}{box('belt',[0,3.65,0],[7,1.7,.26])}{box('upper-base',[0,4.85,0],[7,.7,.26])}{box('top',[0,7.55,0],[7,1.1,.26])}
   {[-3.15,0,3.15].map((x,i)=>box(`pier${i}`,[x,4.05,0],[i===1?1.4:.7,8.1,.26]))}
   {windowAt(-1.85,1.925,.035,2.2,1.75)}{windowAt(1.85,1.925,.035,2.2,1.75)}
   {windowAt(-1.85,6.1,.035,2.2,1.8)}{windowAt(1.85,6.1,.035,2.2,1.8)}
  </group>)}
  {box('foundation',[0,-.13,0],[8.45,.26,7.45],r.floor)}
  {box('upper-floor',[0,4.12,-.6],[7.8,.18,5.6],r.floor)}
  {[4.25,8.05].map(y=>box(`timber${y}`,[0,y,3.68],[8.35,.18,.2],r.wood))}
  {[-4,4].map(x=>box(`post${x}`,[x,4.1,3.64],[.18,8.2,.2],r.wood))}
  {[-1,1].map(side=><group key={`roof${side}`} position={[side*2.3,9.2,0]} rotation={[0,0,-side*Math.atan(.5)]}>
   {box('roof',[0,0,0],[5.15,.25,8.25],r.roof)}{box('eave',[side*2.45,-.06,0],[.18,.35,8.4],r.wood)}
   {Array.from({length:13},(_,i)=>box(`seam${i}`,[0,.15,-3.9+i*.65],[5.12,.028,.03],r.roof))}
  </group>)}
  {[-1,1].map(side=><mesh key={`gable${side}`} position={[0,0,side*3.51]} rotation={[0,side<0?Math.PI:0,0]} geometry={r.gable} material={r.wall}/>)}
  {box('chimney',[-2.6,9.5,-1.9],[.8,3.8,.95])}{box('chimney-cap',[-2.6,11.42,-1.9],[1.02,.16,1.14],r.roof)}
  {/* Shallow asymmetric service wing, reserved for future room navigation. */}
  {box('wing-back',[-5.5,2.2,-3.4],[3,4.4,.25])}{box('wing-side',[-7,2.2,-1],[.25,4.4,4.8])}
  {box('wing-front-base',[-5.5,.5,1.4],[3,1,.25])}{box('wing-front-head',[-5.5,3.65,1.4],[3,1.5,.25])}
  {[-6.8,-4.2].map(x=>box(`wing-pier${x}`,[x,2.2,1.4],[.4,4.4,.25]))}{windowAt(-5.5,1.95,1.43,2.2,1.9)}
  <group position={[-5.5,4.65,-1]} rotation={[0,0,.17]}>{box('wing-roof',[0,0,0],[3.6,.28,5.5],r.roof)}</group>
  {box('wing-floor',[-5.5,-.1,-1],[3.3,.2,5.1],r.floor)}
 </group>
}
