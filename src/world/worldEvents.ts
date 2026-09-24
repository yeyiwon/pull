import { useSyncExternalStore } from 'react'
import type { Season } from './realWorld.ts'
import { livingWorld } from './livingWorld.ts'
import { weatherPreview } from './weatherPresentation.ts'

export type WorldEventCategory='WEATHER'|'CELESTIAL'|'SEASONAL'|'MAGICAL'|'FESTIVAL'
export type WorldEventSignificance='LOW'|'MEDIUM'|'HIGH'|'VERY_HIGH'
export type WorldEventId='CLEAR'|'RAIN'|'HEAVY_RAIN'|'SNOW'|'HEAVY_SNOW'|'FOG'|'STRONG_WIND'|'FIREWORKS'|'METEOR_SHOWER'|'DIAMOND_DUST'|'AURORA'|'FIREFLY_NIGHT'|'CHERRY_BLOSSOM_WIND'|'AUTUMN_LEAF_STORM'|'THUNDERSTORM'|'WINTER_ILLUMINATION'
export type WorldEventDefinition={id:WorldEventId;label:string;category:WorldEventCategory;intensity:number;duration:number;seasons:readonly Season[];time:'ANY'|'DAY'|'NIGHT';rarity:number;cooldown:number;location:string|null;significance:WorldEventSignificance;moruAwareness:boolean}
const ALL:readonly Season[]=['spring','summer','autumn','winter']
export const WORLD_EVENTS:readonly WorldEventDefinition[]=[
 {id:'CLEAR',label:'Clear',category:'WEATHER',intensity:0,duration:300,seasons:ALL,time:'ANY',rarity:1,cooldown:0,location:null,significance:'LOW',moruAwareness:false},
 {id:'RAIN',label:'Rain',category:'WEATHER',intensity:.55,duration:150,seasons:ALL,time:'ANY',rarity:.55,cooldown:240,location:null,significance:'LOW',moruAwareness:false},
 {id:'HEAVY_RAIN',label:'Heavy Rain',category:'WEATHER',intensity:1,duration:90,seasons:['spring','summer','autumn'],time:'ANY',rarity:.18,cooldown:600,location:null,significance:'HIGH',moruAwareness:true},
 {id:'SNOW',label:'Snow',category:'WEATHER',intensity:.55,duration:180,seasons:['winter'],time:'ANY',rarity:.65,cooldown:240,location:null,significance:'MEDIUM',moruAwareness:true},
 {id:'HEAVY_SNOW',label:'Heavy Snow',category:'WEATHER',intensity:1,duration:120,seasons:['winter'],time:'ANY',rarity:.28,cooldown:600,location:'AncientTree',significance:'HIGH',moruAwareness:true},
 {id:'FOG',label:'Fog',category:'WEATHER',intensity:.7,duration:120,seasons:ALL,time:'ANY',rarity:.28,cooldown:420,location:'HiddenGarden',significance:'MEDIUM',moruAwareness:false},
 {id:'STRONG_WIND',label:'Strong Wind',category:'WEATHER',intensity:.9,duration:70,seasons:ALL,time:'ANY',rarity:.22,cooldown:360,location:null,significance:'MEDIUM',moruAwareness:true},
 {id:'FIREWORKS',label:'Fireworks',category:'FESTIVAL',intensity:1,duration:55,seasons:ALL,time:'NIGHT',rarity:.025,cooldown:86400,location:'OldBridge',significance:'VERY_HIGH',moruAwareness:true},
 {id:'METEOR_SHOWER',label:'Meteor Shower',category:'CELESTIAL',intensity:1,duration:75,seasons:ALL,time:'NIGHT',rarity:.035,cooldown:43200,location:'MoonShrine',significance:'VERY_HIGH',moruAwareness:true},
 {id:'DIAMOND_DUST',label:'Diamond Dust',category:'MAGICAL',intensity:.75,duration:80,seasons:['winter'],time:'ANY',rarity:.06,cooldown:21600,location:'AncientTree',significance:'HIGH',moruAwareness:true},
 {id:'AURORA',label:'Aurora',category:'CELESTIAL',intensity:.85,duration:120,seasons:['winter'],time:'NIGHT',rarity:.02,cooldown:86400,location:'MoonShrine',significance:'VERY_HIGH',moruAwareness:true},
 {id:'FIREFLY_NIGHT',label:'Firefly Night',category:'MAGICAL',intensity:.7,duration:100,seasons:['spring','summer'],time:'NIGHT',rarity:.12,cooldown:3600,location:'HiddenGarden',significance:'HIGH',moruAwareness:true},
 {id:'CHERRY_BLOSSOM_WIND',label:'Cherry Blossom Wind',category:'SEASONAL',intensity:.75,duration:75,seasons:['spring'],time:'ANY',rarity:.18,cooldown:1800,location:'HiddenGarden',significance:'HIGH',moruAwareness:true},
 {id:'AUTUMN_LEAF_STORM',label:'Autumn Leaf Storm',category:'SEASONAL',intensity:.8,duration:75,seasons:['autumn'],time:'ANY',rarity:.16,cooldown:1800,location:'AncientTree',significance:'HIGH',moruAwareness:true},
 {id:'THUNDERSTORM',label:'Thunderstorm',category:'WEATHER',intensity:1,duration:80,seasons:['spring','summer','autumn'],time:'ANY',rarity:.08,cooldown:3600,location:'home',significance:'HIGH',moruAwareness:true},
 {id:'WINTER_ILLUMINATION',label:'Winter Illumination',category:'SEASONAL',intensity:1,duration:180,seasons:['winter'],time:'NIGHT',rarity:.35,cooldown:900,location:'AncientTree',significance:'HIGH',moruAwareness:true},
]
export const eventDefinition=(id:WorldEventId)=>WORLD_EVENTS.find(event=>event.id===id)!
type Snapshot={mode:'AUTO'|'MANUAL';manual:WorldEventId|null;manuals:readonly WorldEventId[];active:readonly WorldEventDefinition[];elapsed:number;revision:number}
let snapshot:Snapshot={mode:'AUTO',manual:null,manuals:[],active:[],elapsed:0,revision:0},lastSlot=-1
const lastEnded=new Map<WorldEventId,number>()
const listeners=new Set<()=>void>()
function publish(next:Partial<Snapshot>){snapshot={...snapshot,...next,revision:snapshot.revision+1};for(const listener of listeners)listener()}
export const worldEvents={
 subscribe(listener:()=>void){listeners.add(listener);return()=>listeners.delete(listener)},getSnapshot(){return snapshot},
 setManual(id:WorldEventId|null){resetPresentation();if(id===null){publish({mode:'AUTO',manual:null,manuals:[],active:[],elapsed:0});lastSlot=-1}else{const event=eventDefinition(id);publish({mode:'MANUAL',manual:id,manuals:[id],active:[event],elapsed:0});applyPresentation(event)}},
 toggleManual(id:WorldEventId){
  const selected=snapshot.mode==='MANUAL'?[...snapshot.manuals]:[]
  const next=selected.includes(id)?selected.filter(value=>value!==id):[...selected,id]
  resetPresentation();const active=next.map(eventDefinition)
  publish({mode:'MANUAL',manual:next.at(-1)??null,manuals:next,active,elapsed:0})
  for(const event of active)applyPresentation(event)
 },
 setNone(){resetPresentation();publish({mode:'MANUAL',manual:null,manuals:[],active:[],elapsed:0})},
}
export function useWorldEvents(){return useSyncExternalStore(worldEvents.subscribe,worldEvents.getSnapshot,worldEvents.getSnapshot)}
function resetPresentation(){weatherPreview.eventType=null;livingWorld.windOverride=null;livingWorld.eventOverride=null}
function applyPresentation(event:WorldEventDefinition){
 if(event.id==='CLEAR')weatherPreview.eventType='clear'
 if(event.id==='RAIN'||event.id==='HEAVY_RAIN')weatherPreview.eventType='rain'
 if(event.id==='SNOW'||event.id==='HEAVY_SNOW'||event.id==='DIAMOND_DUST'){weatherPreview.eventType='snow';livingWorld.snowMode=event.id==='HEAVY_SNOW'?'heavy':event.id==='DIAMOND_DUST'?'magical':'normal'}
 if(event.id==='FOG')weatherPreview.eventType='fog'
 if(event.id==='STRONG_WIND')livingWorld.windOverride=.88
 if(event.id==='THUNDERSTORM'){weatherPreview.eventType='storm';livingWorld.eventOverride='lightning'}
 const sky={METEOR_SHOWER:'meteorShower',AURORA:'aurora',FIREFLY_NIGHT:'fireflyNight',CHERRY_BLOSSOM_WIND:'petalShower',AUTUMN_LEAF_STORM:'goldenWind',DIAMOND_DUST:'magicalSnow'} as const
 if(event.id in sky)livingWorld.eventOverride=sky[event.id as keyof typeof sky]
}
function autoEvent(season:Season,night:boolean,slot:number,now:number){
 // Stable, sparse schedule: most ten-minute slots intentionally contain no special event.
 const eligible=WORLD_EVENTS.filter(e=>e.id!=='CLEAR'&&e.id!=='WINTER_ILLUMINATION'&&e.id!=='DIAMOND_DUST'&&e.seasons.includes(season)&&(e.time==='ANY'||(e.time==='NIGHT')===night)&&(now-(lastEnded.get(e.id)??-Infinity)>=e.cooldown*1000))
 const seed=Math.abs((slot*1103515245+season.length*12345)|0)%10000/10000
 if(seed>.12)return null
 let cursor=seed/.12,total=eligible.reduce((sum,event)=>sum+event.rarity,0)
 for(const event of eligible){cursor-=event.rarity/total;if(cursor<=0)return event}
 return null
}
export function tickWorldEvents(delta:number,context:{season:Season;night:boolean;now:number}){
 if(snapshot.mode==='MANUAL'){snapshot={...snapshot,elapsed:snapshot.elapsed+delta};return}
 if(snapshot.active.length){
  const elapsed=snapshot.elapsed+Math.max(0,delta),finished=snapshot.active[0]
  if(finished.time==='NIGHT'&&!context.night){lastEnded.set(finished.id,context.now);resetPresentation();publish({active:[],manuals:[],elapsed:0});return}
  if(elapsed<finished.duration){snapshot={...snapshot,elapsed};return}
  lastEnded.set(finished.id,context.now);resetPresentation();publish({active:[],manuals:[],elapsed:0})
 }
 const slot=Math.floor(context.now/600000);if(slot===lastSlot)return;lastSlot=slot
 resetPresentation();const event=autoEvent(context.season,context.night,slot,context.now);publish({active:event?[event]:[],manuals:[],elapsed:0});if(event)applyPresentation(event)
}
export function activeEventIds(){return snapshot.active.map(event=>event.id)}
export function activeEventLocation(){return snapshot.active.find(event=>event.location)?.location??null}
export function eventIntensity(id:WorldEventId){return snapshot.active.some(event=>event.id===id)?eventDefinition(id).intensity:0}
