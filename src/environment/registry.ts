import { SEMANTICS, AREAS } from '../world/evolution/director.ts'
import type { Semantic, Area } from '../world/evolution/director.ts'
export const ASSET_CATEGORIES = ['house','landmark','tree','rock','vegetation','prop','accessory'] as const
export type AssetCategory = typeof ASSET_CATEGORIES[number]
export type Season = 'spring'|'summer'|'autumn'|'winter'
export type EnvironmentEntry = {
  review?:{status:'CANDIDATE'|'APPROVED';semanticCategory:'HOUSE_HERO'|'TREE_HERO_A'|'TREE_HERO_B'|'VEGETATION_CLUSTER'|'RIVERBANK_CLUSTER'|'DISTANT_MOUNTAIN_A'|'DISTANT_MOUNTAIN_B'|'BENCH'|'LAMPPOST';qualityTier:'HERO'|'NEAR_MID';allowedAreas:string[];scaleClass:'MICRO'|'SMALL'|'HERO'|'FAR';lodRole:'LOD0';autonomousEligible:boolean;densityCost:number;groundOffset:number;triangles:number;vertices:number;bytes:number;preview?:{position:[number,number,number];rotation:[number,number,number];scale:number}[]}

  autonomy?:{approved:true;semantics:Semantic[];areas:Area[];radius:number;height:number;groundOffset:number}
  id:string; category:AssetCategory; url:string; season:Season[]; scaleRange:[number,number]
  placementType:'manual'|'catalog'; placements:{position:[number,number,number];rotation:[number,number,number];scale:number}[]
  lod:{distance:number;url:string}[]; materialResponse:{wetness:boolean;snow:boolean}
}
const seasons=['spring','summer','autumn','winter']
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)
const number=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)
const vector=(v:unknown)=>Array.isArray(v)&&v.length===3&&v.every(number)
const assetURL=(v:unknown)=>typeof v==='string'&&/^\/environment\/[a-zA-Z0-9_./-]+\.glb$/.test(v)&&!v.includes('..')
export function parseEnvironmentRegistry(input:unknown):EnvironmentEntry[]{
  if(!record(input)||input.version!==1||!Array.isArray(input.assets))throw Error('Invalid environment registry version/assets')
  const ids=new Set<string>()
  return input.assets.map((v:unknown)=>{
    if(!record(v)||typeof v.id!=='string'||!v.id||ids.has(v.id))throw Error('Invalid/duplicate asset id')
    ids.add(v.id)
    if(!ASSET_CATEGORIES.includes(v.category as AssetCategory)||!assetURL(v.url))throw Error(`Invalid category/GLB path: ${v.id}`)
    if(!Array.isArray(v.season)||!v.season.length||!v.season.every(s=>seasons.includes(s)))throw Error(`Invalid season: ${v.id}`)
    if(!Array.isArray(v.scaleRange)||v.scaleRange.length!==2||!v.scaleRange.every(number)||v.scaleRange[0]<=0||v.scaleRange[1]<v.scaleRange[0])throw Error(`Invalid scale range: ${v.id}`)
    if(!['manual','catalog'].includes(String(v.placementType))||!Array.isArray(v.placements))throw Error(`Invalid placement: ${v.id}`)
    if(v.category==='accessory'&&v.placementType!=='catalog')throw Error('Accessory attachment requires a separate approved adapter')
    for(const p of v.placements){if(!record(p)||!vector(p.position)||!vector(p.rotation)||!number(p.scale)||p.scale<v.scaleRange[0]||p.scale>v.scaleRange[1])throw Error(`Invalid transform: ${v.id}`)}
    if(!Array.isArray(v.lod))throw Error(`Invalid LOD: ${v.id}`)
    let distance=0
    for(const l of v.lod){if(!record(l)||!number(l.distance)||l.distance<=distance||!assetURL(l.url))throw Error(`Invalid ordered LOD: ${v.id}`);distance=l.distance}
    if(!record(v.materialResponse)||typeof v.materialResponse.wetness!=='boolean'||typeof v.materialResponse.snow!=='boolean')throw Error(`Invalid material response: ${v.id}`)
    if(v.review!==undefined){
      const r=v.review
      if(!record(r)||!['CANDIDATE','APPROVED'].includes(String(r.status))||!['HOUSE_HERO','TREE_HERO_A','TREE_HERO_B','VEGETATION_CLUSTER','RIVERBANK_CLUSTER','DISTANT_MOUNTAIN_A','DISTANT_MOUNTAIN_B','BENCH','LAMPPOST'].includes(String(r.semanticCategory))||!['MICRO','SMALL','HERO','FAR'].includes(String(r.scaleClass))||r.qualityTier===undefined&&r.semanticCategory!=='VEGETATION_CLUSTER'||r.qualityTier!==undefined&&!['HERO','NEAR_MID'].includes(String(r.qualityTier))||r.lodRole!==undefined&&r.lodRole!=='LOD0'||r.autonomousEligible!==undefined&&typeof r.autonomousEligible!=='boolean'||r.allowedAreas!==undefined&&(!Array.isArray(r.allowedAreas)||!r.allowedAreas.every(a=>typeof a==='string'&&a.length>0))||r.preview!==undefined&&(!Array.isArray(r.preview)||r.preview.some(p=>!record(p)||!vector(p.position)||!vector(p.rotation)||!number(p.scale)||p.scale<=0))||!number(r.densityCost)||r.densityCost<=0||!number(r.groundOffset)||!number(r.triangles)||r.triangles<=0||!number(r.vertices)||r.vertices<=0||!number(r.bytes)||r.bytes<=0)throw Error(`Invalid asset review: ${v.id}`)
      if(r.status==='CANDIDATE'&&(v.autonomy!==undefined||v.placementType!=='catalog'||v.placements.length||r.autonomousEligible===true))throw Error('Candidate must remain preview-only')
    }
    if(v.autonomy!==undefined){
      const a=v.autonomy
      if(!record(a)||a.approved!==true||!['rock','vegetation','prop'].includes(String(v.category))||v.placementType!=='catalog'||!Array.isArray(a.semantics)||!a.semantics.length||!a.semantics.every(s=>SEMANTICS.includes(s as Semantic))||!Array.isArray(a.areas)||!a.areas.length||!a.areas.every(s=>AREAS.includes(s as Area))||!number(a.radius)||a.radius<=0||!number(a.height)||a.height<=0||!number(a.groundOffset)||Math.abs(a.groundOffset)>a.height)throw Error(`Invalid reviewed autonomy bounds: ${v.id}`)
    }
    return v as unknown as EnvironmentEntry
  })
}
export function lodAt(distance:number,lod:EnvironmentEntry['lod'],current:number){
  // Ten percent hysteresis prevents repeated loads at a distance boundary.
  let level=current
  while(level<lod.length&&distance>lod[level].distance*1.1)level++
  while(level>0&&distance<lod[level-1].distance*.9)level--
  return level
}
