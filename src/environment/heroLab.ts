// Shipped layout baseline; development controls remain local and never enter WorldHistory.
import { setWorldReconstructionV3 } from '../world/worldLayoutMode.ts'
export const HERO_IDS=['pull-house-hero','pull-tree-hero-a','pull-tree-hero-b','moru-meadow-cluster','pull-riverbank-cluster-a','pull-mountain-a','pull-mountain-b'] as const
export type HeroId=typeof HERO_IDS[number]
export type HeroSelection=HeroId|'all'|'layout-v2'|'layout-v3'
const LAYOUT_IDS:readonly HeroId[]=['pull-house-hero','pull-tree-hero-a','moru-meadow-cluster','pull-riverbank-cluster-a','pull-mountain-a']
let selected:HeroSelection='all',enabled=false,revision=0
setWorldReconstructionV3(false)
let lakeside:'pull-bench-a'|'pull-lamppost-a'|null=null
const listeners=new Set<()=>void>()
function publish(){setWorldReconstructionV3(Boolean(enabled&&selected==='layout-v3'));revision++;for(const listener of listeners)listener()}
export const heroLab={
 subscribe(listener:()=>void){listeners.add(listener);return()=>listeners.delete(listener)},
 snapshot:()=>revision,
 active:()=>enabled?selected:null,
 activeIds:():readonly HeroId[]=>enabled?(selected==='all'?HERO_IDS:selected==='layout-v2'||selected==='layout-v3'?LAYOUT_IDS:[selected]):[],
 houseActive:()=>enabled&&(selected==='all'||selected==='layout-v2'||selected==='layout-v3'||selected==='pull-house-hero'),
 layoutV2:()=>enabled&&selected==='layout-v2',
 layoutV3:()=>Boolean(enabled&&selected==='layout-v3'),
 selected:()=>selected,
 enabled:()=>enabled,
 lakeside:()=>import.meta.env.DEV?lakeside:null,
 selectLakeside(id:'pull-bench-a'|'pull-lamppost-a'|null){if(!import.meta.env.DEV)return;lakeside=id;if(id)enabled=false;publish()},
 toggle(){if(!import.meta.env.DEV)return;enabled=!enabled;publish()},
 setEnabled(value:boolean){if(!import.meta.env.DEV||enabled===value)return;enabled=value;publish()},
 select(id:HeroSelection){if(!import.meta.env.DEV)return;selected=id;enabled=true;publish()},
}
