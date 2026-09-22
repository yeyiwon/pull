import { PATH_SEGMENTS } from '../environment/heroLayout.ts'
import type { MeshStandardMaterial } from 'three'
// Fine local-space grain preserves the existing plank geometry and layout.
export function woodDetail(material: MeshStandardMaterial) {
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vSurface;').replace('#include <begin_vertex>','#include <begin_vertex>\nvSurface=position;')
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vSurface;')
   .replace('#include <color_fragment>','#include <color_fragment>\nfloat grain=sin(vSurface.x*95.+sin(vSurface.z*3.)*2.)*.5+.5;diffuseColor.rgb*=.94+grain*.06;')
 }
 material.customProgramCacheKey=()=> 'pull-wood-v1'
}

export function meadowDetail(material: MeshStandardMaterial) {
 const uniforms={uPathSegments:{value:PATH_SEGMENTS},uLegacyPaths:{value:1},uMeadowSnow:{value:0},uMeadowDetail:{value:1},uMeadowWet:{value:0}}
 material.userData.meadow=uniforms
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms)
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vMeadow;').replace('#include <begin_vertex>','#include <begin_vertex>\nvMeadow=(modelMatrix*vec4(position,1.)).xyz;')
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 vMeadow; uniform float uMeadowSnow,uMeadowDetail,uMeadowWet,uLegacyPaths; uniform vec4 uPathSegments[12];
   float meadowHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float meadowNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(meadowHash(i),meadowHash(i+vec2(1.,0.)),f.x),mix(meadowHash(i+vec2(0.,1.)),meadowHash(i+1.),f.x),f.y);}
  `).replace('#include <color_fragment>',`#include <color_fragment>
   float meadowPatch=meadowNoise(vMeadow.xz*.65);
   float macroPatch=meadowNoise(vMeadow.xz*.065+vec2(meadowNoise(vMeadow.xz*.13),meadowNoise(vMeadow.zx*.17))*2.+vec2(7.,19.));
   float pathDistance=1000.;
   for(int i=0;i<12;i++){vec2 ab=uPathSegments[i].zw-uPathSegments[i].xy,ap=vMeadow.xz-uPathSegments[i].xy;
    pathDistance=min(pathDistance,length(ap-ab*clamp(dot(ap,ab)/dot(ab,ab),0.,1.)));}
   float pathMask=(1.-smoothstep(.48,.95+meadowPatch*.28,pathDistance))*(1.-uMeadowSnow*.93);
   diffuseColor.rgb*=.74+macroPatch*.43;
   float dryMeadow=smoothstep(.45,.73,macroPatch)*(1.-uMeadowSnow);
   diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.13,1.02,.82),dryMeadow*.65);

   float nearGrass=1.-smoothstep(8.,30.,distance(cameraPosition,vMeadow));
   float grassStroke=0.;
   if(uMeadowDetail>.5){vec2 cell=vMeadow.xz*7.;float seed=meadowHash(floor(cell));float stroke=abs(fract(cell.x+sin(cell.y*.8)*.1)-.5);grassStroke=(1.-smoothstep(.035,.09+fwidth(stroke),stroke))*seed*nearGrass;}
   diffuseColor.rgb*=.92+meadowPatch*.12+grassStroke*.035*(1.-uMeadowSnow);
   float riverCenter=6.+sin(vMeadow.z*.039)*14.+sin(vMeadow.z*.081)*3.;
   float bank=abs(vMeadow.x-riverCenter)-(3.4+sin(vMeadow.z*.03)*1.4);
   float soil=(1.-smoothstep(.2,2.1+meadowPatch*.85,bank))*(1.-uMeadowSnow);
   diffuseColor.rgb=mix(diffuseColor.rgb,mix(vec3(.19,.23,.17),vec3(.27,.245,.19),smoothstep(.1,1.,bank))*(1.-uMeadowWet*.2),soil*.86);
   vec3 pathColor=mix(vec3(.25,.205,.14),vec3(.39,.345,.25),meadowPatch)*(1.-uMeadowWet*.25);
   diffuseColor.rgb=mix(diffuseColor.rgb,pathColor,pathMask*.82*uLegacyPaths);

  `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   // Millimetric relief only: collision and foot placement remain unchanged.
   if(uMeadowDetail>.5){
    float h=(meadowNoise(vMeadow.xz*12.)*.0012*nearGrass+meadowPatch*.009)*(1.-uMeadowSnow*.8);
    vec3 dx=dFdx(vViewPosition),dy=dFdy(vViewPosition);
    vec3 rx=cross(dy,normal),ry=cross(normal,dx);float det=dot(dx,rx);
    if(abs(det)>.000001)normal=normalize(abs(det)*normal-sign(det)*(dFdx(h)*rx+dFdy(h)*ry));
   }
  `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   roughnessFactor=clamp(roughnessFactor-(1.-smoothstep(.0,1.15,bank))*.23-(1.-smoothstep(.36,.6,meadowPatch))*uMeadowWet*.13,.23,1.);
  `)
 }
 material.customProgramCacheKey=()=> 'pull-meadow-v4-banks'
}
