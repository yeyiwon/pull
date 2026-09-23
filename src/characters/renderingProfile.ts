import { MeshStandardMaterial, PMREMGenerator, SRGBColorSpace, Scene, Mesh, SphereGeometry, ShaderMaterial, BackSide } from 'three'
import type { Texture, WebGLRenderer, Object3D, Material } from 'three'

// Shared across outfits: neutral broad light supplements the world's directional key.
// Materials stay PBR and texture-driven; this is not an emissive/unlit face override.
export const MORU_RENDERING_PROFILE = {
 environmentDay: 1.3, environmentNight: .75,
 fillDay: 4, fillNight: 5, fillDistance: 2.8,
 roughnessFactor: 1.12, pmremSize: 128,
} as const
export function createMoruEnvironment(renderer:WebGLRenderer){
 const room=new Scene(),geometry=new SphereGeometry(8,16,12)
 // Bounded neutral radiance, with no luminous studio panels that can bloom on silver hair.
 const material=new ShaderMaterial({side:BackSide,vertexShader:'varying float h;void main(){h=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying float h;void main(){gl_FragColor=vec4(mix(vec3(.30,.29,.32),vec3(.85,.86,.90),smoothstep(-.8,.9,h)),1.);}'})
 room.add(new Mesh(geometry,material))
 const generator=new PMREMGenerator(renderer)
 const target=generator.fromScene(room,.04,.1,100,{size:MORU_RENDERING_PROFILE.pmremSize})
 geometry.dispose();material.dispose();generator.dispose()
 return target
}
export function applyMoruMaterial(source:MeshStandardMaterial,environment:Texture|null){
 const material=source.clone()
 if(material.map&&material.map.colorSpace!==SRGBColorSpace)throw new Error('Moru base color must be sRGB')
 material.envMap=environment
 material.envMapIntensity=MORU_RENDERING_PROFILE.environmentDay
 // Preserve packed roughness variation while slightly broadening tight highlights.
 material.roughness=source.roughness*MORU_RENDERING_PROFILE.roughnessFactor
 return material
}

// No appearance ID is accepted: registering a new outfit cannot bypass this path.
// SkeletonUtils clones nodes, but not geometry/materials/textures. Give the
// mounted character its own GPU resources before its cleanup disposes them.
export function prepareMoruRendering(scene:Object3D){
 const materials=new Map<Material,Material>(),textures=new Map<Texture,Texture>()
 const adapt=(source:Material)=>{
  const existing=materials.get(source);if(existing)return existing
  const result=source instanceof MeshStandardMaterial?applyMoruMaterial(source,null):source.clone()
  for(const [key,value] of Object.entries(result)){
   if(value&&typeof value==='object'&&value.isTexture){
    const texture=value as Texture
    if(!textures.has(texture))textures.set(texture,texture.clone())
    Reflect.set(result,key,textures.get(texture))
   }
  }
  materials.set(source,result);return result
 }
 scene.traverse(object=>{
  if(!(object instanceof Mesh))return
  object.castShadow=true;object.receiveShadow=false;object.frustumCulled=false
  object.geometry=object.geometry.clone()
  object.material=Array.isArray(object.material)?object.material.map(adapt):adapt(object.material)
 })
 return [...materials.values()].filter((material):material is MeshStandardMaterial=>material instanceof MeshStandardMaterial)
}
