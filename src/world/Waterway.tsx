import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, Float32BufferAttribute, ShaderMaterial, UniformsLib, UniformsUtils, Vector2, Vector3, MeshStandardMaterial, Color } from 'three'
import { graphicsState, QUALITY, useQuality } from '../graphics/quality.ts'
import { woodDetail } from '../graphics/materialDetail.ts'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { branch } from './artGeometry.ts'
import { artMaterial, updateArtMaterial } from '../graphics/artMaterial.ts'
import { worldTime } from './worldTime.ts'
import { environmentState as env } from './environmentState.ts'
import { BRIDGE, streamCenter, streamWidth, WATER_Y } from './terrain.ts'
import type { Player } from './locomotion.ts'
function wetWood(m:MeshStandardMaterial,base:Color,snow:Color,wet:number,amount:number){m.color.copy(base).multiplyScalar(1-wet*.25).lerp(snow,amount*.5);m.roughness=.8-wet*.45}
const vertex = `varying vec2 vUv; varying vec3 vWorld;
#include <fog_pars_vertex>
void main(){vUv=uv;vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;vec4 mvPosition=viewMatrix*world;gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`
const fragment = `uniform float uTime,uNight,uWind,uRain,uSnow,uQuality,uPhase,uMoonSize;uniform vec3 uTop,uHorizon,uMoon,uSun;uniform vec2 uMoru;uniform float uWade;
varying vec2 vUv;varying vec3 vWorld;
#include <fog_pars_fragment>
float square(float x){return x*x;}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
 float t=uTime;vec2 p=vWorld.xz;
 float a=sin(p.x*2.2+p.y*.9+t*.6),b=cos(p.y*2.6-p.x*.6-t*.45);
 float swell=sin(p.x*.42+p.y*.26+t*.19),crossSwell=cos(p.y*.51-p.x*.31-t*.16);
 vec2 fine=vec2(0.);
 if(uQuality>.5) fine=vec2(sin(p.x*8.4+p.y*4.1-t*.7),cos(p.y*9.7-p.x*3.2+t*.53))*.006;
 vec3 n=normalize(vec3((a*.026+swell*.012+fine.x)*(1.+uWind),1.,(b*.021+crossSwell*.011+fine.y)*(1.+uWind)));
 float radius=length(p-uMoru),ring=sin(radius*17.-t*7.)*exp(-radius*2.)*uWade;
 n.xz+=normalize(p-uMoru+vec2(.001))*ring*.075;
 if(uQuality>.5){
  vec2 id=floor(p*1.3),cell=fract(p*1.3)-.5;float seed=hash(id);
  float age=fract(t*.48+seed),d=length(cell);
  float drop=sin((d-age*.6)*70.)*exp(-square((d-age*.6)*20.))*(1.-age);
  n.xz+=normalize(cell+vec2(.001))*drop*uRain*.045;
 }
 n=normalize(n);
 vec3 view=normalize(cameraPosition-vWorld),r=reflect(-view,n);
 float fresnel=.02+.98*pow(1.-max(0.,dot(view,n)),5.);
 float center=6.+sin(p.y*.039)*14.+sin(p.y*.081)*3.;
 float lakeD=(p.y-58.)/30.;float basin=max(0.,1.-lakeD*lakeD);float width=3.4+sin(p.y*.03)*1.4+24.*basin*basin;
 float bank=abs(p.x-center)-width;
 float depth=max(0.,-.055+.42*(1.-smoothstep(-.5,1.,bank)))*smoothstep(0.,.22,min(vUv.x,1.-vUv.x));
 vec3 reflection=mix(uHorizon,uTop,pow(max(r.y,0.),.4));
 vec3 transmittance=exp(-vec3(2.4,.85,.55)*depth);
 vec3 bed=mix(vec3(.19,.26,.23),vec3(.038,.14,.18),depth*1.7);
 vec2 refracted=p+n.xz*depth*2.;
 float bedGrain=sin(refracted.x*9.+b)*sin(refracted.y*7.+a)*.012;
 bed+=bedGrain;
 vec3 color=mix(bed*transmittance,reflection,.2+fresnel*.76);
 vec3 east=normalize(cross(vec3(0.,1.,0.),uMoon)),north=cross(uMoon,east);
 vec3 diff=r-uMoon;float across=dot(diff,east),along=dot(diff,north);
 float phase=mix(uPhase,2.4,0.);
 float lunarEnergy=(1.+cos(phase))*.5;
 float disc=exp(-dot(diff,diff)*1100./square(uMoonSize));
 float path=exp(-square(across)*950.)*exp(-square(along)*13.);
 float broken=smoothstep(-.1,.88,sin(p.y*19.+a*3.+t*.3)+sin(p.x*8.-t*.2)*.3);
 color+=vec3(.44,.59,.84)*(disc*.45+path*broken*.48)*uNight*lunarEnergy*(.3+fresnel*.7);
 float sunGlint=pow(max(0.,dot(r,uSun)),210.)*(1.-uNight);
 color+=vec3(1.,.83,.56)*sunGlint*.75;
 float window=exp(-abs(p.x-11.5)*1.5)*exp(-abs(p.y+19.)*.3)*(max(0.,a)*.6+.4);
 color+=vec3(.35,.17,.045)*window*uNight;
 if(uQuality>1.5){float caustic=pow(max(0.,sin(refracted.x*4.+b)+cos(refracted.y*3.+a)-1.2),3.);color+=vec3(.04,.08,.07)*caustic*(1.-uNight)*exp(-depth*2.);}
 color+=vec3(.11,.18,.2)*abs(ring);
 float edgeDistance=min(vUv.x,1.-vUv.x);
 float wash=sin(p.y*2.4+t*.28)*.004+sin(p.y*7.2-t*.19)*.002;
 float edge=smoothstep(0.,.065+wash,edgeDistance);
 // Subtle shoreline wash, not a glowing outline. Existing bank/bridge geometry stays locked.
 color=mix(color,color+vec3(.025,.033,.027),exp(-edgeDistance*48.)*(.5+.5*swell)*(1.-uNight));
 float ice=(1.-smoothstep(.0,.17,min(vUv.x,1.-vUv.x)))*uSnow;
 color=mix(color,vec3(.48,.64,.74),ice*.75);
 gl_FragColor=vec4(color,clamp(.22+depth*.55+fresnel*.5+ice*.2,0.,.9)*edge);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 #include <fog_fragment>
}`
export default function Waterway({player}:{player:RefObject<Player>}){
 const quality=useQuality()
 const material=useRef<ShaderMaterial>(null)
 const r=useMemo(()=>{
  const geometry=new BufferGeometry(),position:number[]=[],uv:number[]=[],indices:number[]=[]
  for(let i=0;i<=300;i++){const z=-170+i*340/300,x=streamCenter(z),w=streamWidth(z);position.push(x-w,WATER_Y,z,x+w,WATER_Y,z);uv.push(0,i/300,1,i/300);if(i<300){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3)}}
  geometry.setAttribute('position',new Float32BufferAttribute(position,3));geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals()
  const wood=[new MeshStandardMaterial({color:'#a7ab96',roughness:.8}),new MeshStandardMaterial({color:'#909c8a',roughness:.8})];wood.forEach(woodDetail)
  const plank=new RoundedBoxGeometry(BRIDGE.halfLength*2/25+.015,.09,BRIDGE.halfWidth*2,2,.018)
  const beam=branch(Array.from({length:12},(_,i)=>{const x=(i/11*2-1)*BRIDGE.halfLength;return [x,.42*Math.cos(x/BRIDGE.halfLength*Math.PI/2)-.16,0]}),.12,.12)
  const beamMaterial=artMaterial('#677d72','bark')
  return {geometry,wood,plank,beam,beamMaterial,base:[new Color('#a7ab96'),new Color('#909c8a')],snowColor:new Color('#b9cedb'),uniforms:UniformsUtils.merge([UniformsLib.fog,{uQuality:{value:1},uPhase:{value:.8},uMoonSize:{value:1},uSun:{value:new Vector3()},uTime:{value:0},uNight:{value:0},uWind:{value:.2},uRain:{value:0},uWet:{value:0},uSnow:{value:0},uTop:{value:env.skyTop},uHorizon:{value:env.skyHorizon},uMoon:{value:env.moonDirection},uMoru:{value:new Vector2()},uWade:{value:0}}])}
 },[])
 useEffect(()=>()=>{r.geometry.dispose();r.plank.dispose();r.beam.dispose();r.beamMaterial.dispose();r.wood.forEach(m=>m.dispose())},[r])
 useFrame((_,delta)=>{
  const u=material.current?.uniforms;if(!u)return
  u.uQuality.value=QUALITY[quality].water;u.uPhase.value=graphicsState.moonPhase*(1-env.crescent)+2.4*env.crescent;u.uMoonSize.value=env.moonSize;u.uSun.value.set(worldTime.current.sunX,worldTime.current.sunY,-.4).normalize();
  for(let i=0;i<2;i++){wetWood(r.wood[i],r.base[i],r.snowColor,env.wetness,env.snow)}
  updateArtMaterial(r.beamMaterial,u.uTime.value);
  u.uTime.value+=delta;u.uNight.value=env.night;u.uWind.value=env.wind;u.uRain.value=env.rain;u.uSnow.value=env.snow
  u.uTop.value.copy(env.skyTop);u.uHorizon.value.copy(env.skyHorizon);u.uMoon.value.copy(env.moonDirection)
  const p=player.current;u.uMoru.value.set(p.position.x,p.position.z)
  const wet=p.waterDepth>.05&&p.position.y<WATER_Y+.05
  u.uWade.value+=(Number(wet)*(p.groundState==='IDLE'?.1:1)-u.uWade.value)*(1-Math.exp(-delta*5))
 })
 const x=streamCenter(BRIDGE.z)
 return <>
  <mesh geometry={r.geometry} renderOrder={1}><shaderMaterial ref={material} uniforms={r.uniforms} vertexShader={vertex} fragmentShader={fragment} transparent depthWrite={false} fog/></mesh>
  <group position={[x,0,BRIDGE.z]}>
   {[-1.35,1.35].map(z=><mesh key={z} geometry={r.beam} material={r.beamMaterial} position={[0,0,z]} castShadow receiveShadow/>)}
   {Array.from({length:25},(_,i)=>{const a=(i/24*2-1)*BRIDGE.halfLength,y=.42*Math.cos(a/BRIDGE.halfLength*Math.PI/2);return <mesh key={i} position={[a,y-.045,0]} rotation={[0,0,-.42*Math.PI/(2*BRIDGE.halfLength)*Math.sin(a/BRIDGE.halfLength*Math.PI/2)]} castShadow receiveShadow material={r.wood[i%3===0?0:1]} geometry={r.plank}/>})}
   {[-1,1].map(side=><group key={side}>{[-.75,0,.75].map(a=><group key={a} position={[a*BRIDGE.halfLength,.42*Math.cos(a*Math.PI/2),side*1.6]}><mesh position={[0,.5,0]} castShadow><cylinderGeometry args={[.055,.08,1,8]}/><meshStandardMaterial color="#778b83"/></mesh><mesh position={[0,1.03,0]}><sphereGeometry args={[.075,8,6]}/><meshStandardMaterial color="#ffe9b9" emissive="#dbcba1" emissiveIntensity={.3}/></mesh></group>)}</group>)}
  </group>
 </>
}
