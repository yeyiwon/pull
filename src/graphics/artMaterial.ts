import { MeshStandardMaterial } from 'three'
import { environmentState as env } from '../world/environmentState.ts'

// Uniforms are shared with the compiled shader: weather changes without recompilation.
export function artMaterial(color: string, kind: 'stone' | 'bark' | 'leaf' | 'plaster' = 'stone') {
 const m=new MeshStandardMaterial({color,roughness:kind==='leaf'?.78:.86})
 const u={artSnow:{value:0},artWet:{value:0},artTime:{value:0},artWind:{value:0}}
 m.userData.art=u
 m.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,u)
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
   varying vec3 artPosition,artNormal; uniform float artTime,artWind;`)
   .replace('#include <begin_vertex>',`#include <begin_vertex>
    artPosition=position;
    ${kind==='leaf'?`float leafPhase=0.;
    #ifdef USE_INSTANCING
      leafPhase=instanceMatrix[3].x*.71+instanceMatrix[3].z*.39;
    #endif
    transformed.x+=sin(artTime*.65+leafPhase+position.y*2.)*artWind*.035*max(0.,position.y);`:''}`)
   .replace('#include <defaultnormal_vertex>','#include <defaultnormal_vertex>\nartNormal=inverseTransformDirection(transformedNormal,viewMatrix);')
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 artPosition,artNormal;uniform float artSnow,artWet;
   float artNoise(vec3 p){return sin(p.x*3.1+sin(p.z*2.7))*sin(p.y*4.3+p.z*1.7);}`)
   .replace('#include <color_fragment>',`#include <color_fragment>
    float grain=artNoise(artPosition*${kind==='bark'?'vec3(5.,.3,5.)':kind==='plaster'?'2.0':'1.0'});
    diffuseColor.rgb*=.94+grain*.055;
    ${kind==='stone'?'float strata=sin(artPosition.y*24.+grain*2.);diffuseColor.rgb*=.97+strata*.025;':''}
    diffuseColor.rgb*=1.-artWet*.16;
    float snowMask=smoothstep(.35,.85,artNormal.y+grain*.12)*artSnow;
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.78,.85,.90),snowMask);
   `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
    roughnessFactor=clamp(mix(roughnessFactor-artWet*${kind==='stone'?'.25':kind==='bark'?'.18':'.12'}+grain*.035,.92,snowMask),.32,.98);`)
 }
 m.customProgramCacheKey=()=>`pull-art-${kind}-2`
 return m
}
export function updateArtMaterial(m:MeshStandardMaterial,time:number){
 const u=m.userData.art;if(!u)return
 u.artSnow.value=env.snow;u.artWet.value=env.wetness;u.artTime.value=time;u.artWind.value=env.wind
}
