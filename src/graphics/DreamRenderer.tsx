import { NIGHT_TUNING, nightCorrection } from './nightTuning.ts'
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { WebGLRenderer } from 'three'
import { Vector2, Vector3 } from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { QUALITY, graphicsState, useQuality } from './quality.ts'
import { worldTime } from '../world/worldTime.ts'
import { environmentState as env } from '../world/environmentState.ts'
function setInfoReset(gl:WebGLRenderer,value:boolean){gl.info.autoReset=value}
const gradeShader = {
 uniforms: { tDiffuse: {value:null}, uTint:{value:new Vector3(1,1,1)}, uAmount:{value:.35},uNight:{value:0} },
 vertexShader:'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'uniform sampler2D tDiffuse;uniform vec3 uTint;uniform float uAmount;uniform float uNight;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);c.rgb*=mix(vec3(1.),uTint,uAmount);float l=dot(c.rgb,vec3(.2126,.7152,.0722));float shadow=1.-smoothstep(.08,.42,l);c.rgb+=vec3(.005,.008,.018)*shadow*uNight;gl_FragColor=c;}',
}
const TINTS={spring:[1.025,1.01,1.02],summer:[.98,1.015,1.035],autumn:[1.035,1.005,.98],winter:[.985,1.012,1.04]} as const
export default function DreamRenderer(){
 const {gl,scene,camera,size,setDpr,viewport}=useThree(),quality=useQuality(),preset=QUALITY[quality]
 const resources=useRef<{composer:EffectComposer;bloom:UnrealBloomPass;grade:ShaderPass;output:OutputPass;render:RenderPass}|null>(null)
 const meter=useRef({elapsed:0,frames:0})
 useEffect(()=>{setDpr(Math.min(window.devicePixelRatio,preset.dpr))},[setDpr,preset.dpr])
 useEffect(()=>{
  if(quality==='PERFORMANCE')return
  const composer=new EffectComposer(gl),render=new RenderPass(scene,camera),bloom=new UnrealBloomPass(new Vector2(1,1),preset.bloom,.32,.95),grade=new ShaderPass(gradeShader),output=new OutputPass()
  composer.addPass(render);composer.addPass(bloom);composer.addPass(grade);composer.addPass(output)
  resources.current={composer,bloom,grade,output,render}
  return()=>{resources.current=null;composer.dispose();bloom.dispose();grade.dispose();output.dispose();render.dispose()}
 },[gl,scene,camera,quality,preset.bloom])
 useEffect(()=>{const r=resources.current;if(r){r.composer.setPixelRatio(gl.getPixelRatio());r.composer.setSize(size.width,size.height)}},[gl,size.width,size.height,quality,preset.dpr,viewport.dpr])
 useFrame((_,delta)=>{
  gl.info.reset()
  const r=resources.current
  if(r){
   r.bloom.enabled=graphicsState.bloom;r.bloom.strength=preset.bloom*(.62+env.night*NIGHT_TUNING.bloomIntensity)
   const tint=TINTS[worldTime.realWorld.season];r.grade.uniforms.uTint.value.set(...tint)
   // Night readability comes from scene lights, not a full-screen lift of the sky.
   r.grade.uniforms.uNight.value=env.night*(1-nightCorrection(env.night))
   r.composer.render(delta)
  }else gl.render(scene,camera)
  const m=meter.current;m.elapsed+=delta;m.frames++
  if(m.elapsed>=1){graphicsState.fps=m.frames/m.elapsed;graphicsState.frameMs=m.elapsed/m.frames*1000;graphicsState.calls=gl.info.render.calls;graphicsState.triangles=gl.info.render.triangles;m.frames=0;m.elapsed=0}
 },1)
 useEffect(()=>{const before=gl.info.autoReset;setInfoReset(gl,false);return()=>{setInfoReset(gl,before)}},[gl])
 return null
}
