export type GardenPlant='starbell'|'moondrop'|'cloverlight'
export type GardenStage='seed'|'sprout'|'young'|'bloom'
export type GardenPlanting={spotId:string;kind:GardenPlant;plantedAt:number;wateredAt:number;collectedAt:number|null}
export type GardenDecoration={id:string;type:'flower';spotId:string;variant:GardenPlant;createdAt:number}
export type GardenState={version:1;updatedAt:number;discovered:GardenPlant[];seeds:Record<GardenPlant,number>;inventory:Record<GardenPlant,number>;plants:GardenPlanting[];decorations:GardenDecoration[]}

export const GARDEN_KEY='pull.world.garden.v1'
export const PLANTS:{id:GardenPlant;name:string;preferred:'spring'|'summer'|'autumn'|'winter'}[]=[
 {id:'starbell',name:'별방울',preferred:'spring'},
 {id:'moondrop',name:'달이슬',preferred:'summer'},
 {id:'cloverlight',name:'클로버빛',preferred:'autumn'},
]
const HOUR=3_600_000
export const GROWTH_MS=18*HOUR
export const WATERED_MS=24*HOUR
const emptyCounts=()=>({starbell:0,moondrop:0,cloverlight:0})
export const emptyGarden=(now=Date.now()):GardenState=>({version:1,updatedAt:now,discovered:['starbell'],seeds:{...emptyCounts(),starbell:2},inventory:emptyCounts(),plants:[],decorations:[]})
const kinds=new Set<GardenPlant>(PLANTS.map(p=>p.id))
export function readGarden(raw:string|null,now=Date.now()):GardenState{
 const fresh=emptyGarden(now)
 try{const value=JSON.parse(raw??'null') as Partial<GardenState>;if(value.version!==1)return fresh
  const counts=(input:unknown)=>Object.fromEntries(PLANTS.map(({id})=>[id,Math.max(0,Math.floor(Number((input as Record<string,unknown>|undefined)?.[id])||0))])) as Record<GardenPlant,number>
  return {...fresh,updatedAt:Number.isFinite(value.updatedAt)?Math.min(now,value.updatedAt!):now,discovered:Array.isArray(value.discovered)?value.discovered.filter((v):v is GardenPlant=>kinds.has(v as GardenPlant)):fresh.discovered,seeds:counts(value.seeds),inventory:counts(value.inventory),plants:Array.isArray(value.plants)?value.plants.filter(p=>p&&/^garden-[1-6]$/.test(p.spotId)&&kinds.has(p.kind)).slice(0,6):[],decorations:Array.isArray(value.decorations)?value.decorations.filter(d=>d&&/^decor-[1-9]|decor-10$/.test(d.spotId)&&kinds.has(d.variant)).slice(0,10):[]}
 }catch{return fresh}
}
export function growthProgress(plant:GardenPlanting,now=Date.now(),season?:string){
 const wateredBoost=plant.wateredAt>=plant.plantedAt?1:.42,seasonBoost=PLANTS.find(p=>p.id===plant.kind)?.preferred===season?1.15:1
 return Math.max(0,now-plant.plantedAt)/GROWTH_MS*wateredBoost*seasonBoost
}
export function growthRemainingMs(plant:GardenPlanting,now=Date.now(),season?:string){
 const wateredBoost=plant.wateredAt>=plant.plantedAt?1:.42,seasonBoost=PLANTS.find(p=>p.id===plant.kind)?.preferred===season?1.15:1
 return Math.max(0,GROWTH_MS/(wateredBoost*seasonBoost)-Math.max(0,now-plant.plantedAt))
}
export function growthStage(plant:GardenPlanting,now=Date.now(),season?:string):GardenStage{
 const progress=growthProgress(plant,now,season)
 return progress>=1?'bloom':progress>=.55?'young':progress>=.18?'sprout':'seed'
}
type GardenSelection={kind:'garden'|'decor';spotId:string}|null
let storage:Storage|null=null,state=emptyGarden(),selection:GardenSelection=null
let movingFrom:string|null=null
const listeners=new Set<()=>void>()
try{storage=localStorage;state=readGarden(storage.getItem(GARDEN_KEY))}catch{/* persistence is optional */}
function emit(){state={...state,updatedAt:Date.now()};try{storage?.setItem(GARDEN_KEY,JSON.stringify(state))}catch{/* optional */}listeners.forEach(fn=>fn())}
function plant(spotId:string,kind:GardenPlant){if(state.plants.some(p=>p.spotId===spotId)||state.seeds[kind]<1)return false;state={...state,seeds:{...state.seeds,[kind]:state.seeds[kind]-1},plants:[...state.plants,{spotId,kind,plantedAt:Date.now(),wateredAt:0,collectedAt:null}]};emit();return true}
function water(spotId:string){const at=Date.now();state={...state,plants:state.plants.map(p=>p.spotId===spotId?{...p,wateredAt:at}:p)};emit()}
function waterAll(){const at=Date.now();state={...state,plants:state.plants.map(p=>({...p,wateredAt:at}))};emit()}
function collect(spotId:string){const found=state.plants.find(p=>p.spotId===spotId);if(!found||growthStage(found,Date.now())!=='bloom'||found.collectedAt)return false;const unlock=found.kind==='moondrop'&&!state.discovered.includes('cloverlight');state={...state,discovered:unlock?[...state.discovered,'cloverlight']:state.discovered,seeds:{...state.seeds,[found.kind]:state.seeds[found.kind]+1,...(unlock?{cloverlight:state.seeds.cloverlight+1}:{})},inventory:{...state.inventory,[found.kind]:state.inventory[found.kind]+1},plants:state.plants.filter(p=>p!==found)};emit();return true}
export function soilMoisture(plant:GardenPlanting|undefined,now=Date.now()){if(!plant||plant.wateredAt<plant.plantedAt)return 0;return Math.max(0,Math.min(1,1-(now-plant.wateredAt)/WATERED_MS))}
function place(spotId:string,variant:GardenPlant){if(state.decorations.some(d=>d.spotId===spotId))return false
 if(movingFrom){state={...state,decorations:state.decorations.map(d=>d.spotId===movingFrom?{...d,spotId}:d)};movingFrom=null;emit();return true}
 if(state.inventory[variant]<1)return false;state={...state,inventory:{...state.inventory,[variant]:state.inventory[variant]-1},decorations:[...state.decorations,{id:crypto.randomUUID(),type:'flower',spotId,variant,createdAt:Date.now()}]};emit();return true}
function remove(spotId:string){const found=state.decorations.find(d=>d.spotId===spotId);if(!found)return;state={...state,inventory:{...state.inventory,[found.variant]:state.inventory[found.variant]+1},decorations:state.decorations.filter(d=>d!==found)};emit()}
function discover(kind:GardenPlant){if(state.discovered.includes(kind))return;state={...state,discovered:[...state.discovered,kind],seeds:{...state.seeds,[kind]:state.seeds[kind]+1}};emit()}
function advance(ms:number){state={...state,plants:state.plants.map(p=>({...p,plantedAt:p.plantedAt-ms,wateredAt:p.wateredAt?p.wateredAt-ms:0}))};emit()}
export const gardenStore={subscribe(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn)}},getSnapshot:()=>state,getSelection:()=>selection,getMoving:()=>movingFrom,select(next:GardenSelection){selection=next;state={...state};listeners.forEach(fn=>fn())},plant,water,waterAll,collect,place,remove,beginMove(spotId:string){movingFrom=spotId;state={...state};listeners.forEach(fn=>fn())},cancelMove(){movingFrom=null;state={...state};listeners.forEach(fn=>fn())},discover,advance,grantSeed(kind:GardenPlant,count=1){state={...state,discovered:state.discovered.includes(kind)?state.discovered:[...state.discovered,kind],seeds:{...state.seeds,[kind]:state.seeds[kind]+Math.max(0,Math.floor(count))}};emit()},giveSeeds(){state={...state,discovered:PLANTS.map(p=>p.id),seeds:{starbell:3,moondrop:3,cloverlight:3}};emit()},clear(){movingFrom=null;selection=null;state=emptyGarden();emit()}}
