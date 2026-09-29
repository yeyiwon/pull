import { useSyncExternalStore } from 'react'

export type RendererMode='V1'|'V2_SLICE'|'V2_FULL'|'V3_FULL'|'V4_COZY_TEST'
let mode:RendererMode='V3_FULL'
const listeners=new Set<()=>void>()
export function setRendererMode(next:RendererMode){if(mode===next)return;mode=next;for(const listener of listeners)listener()}
export function getRendererMode(){return mode}
export function useRendererMode(){return useSyncExternalStore<RendererMode>(listener=>{listeners.add(listener);return()=>listeners.delete(listener)},getRendererMode,()=> 'V3_FULL')}
export function isV3World(next:RendererMode=getRendererMode()){return next==='V3_FULL'||next==='V4_COZY_TEST'}

export const V2_LIGHTING_PRESETS={
 // These two fixtures sit close to pale surfaces. Keep the approved colour,
 // but leave enough headroom for the facade, timber and stone to remain visible.
 HOUSE_WARM:{color:'#ffd9ae',intensity:74,distance:11,decay:2},
 BRIDGE_WARM:{color:'#ffddb6',intensity:144,distance:10,decay:2},
 PATH_WARM:{color:'#ffe4c4',intensity:420,distance:18,decay:2},
 MAGICAL_COOL:{color:'#c7c8ff',intensity:180,distance:12,decay:2},
} as const

export const V2_SLICE_TREE_INDICES=new Set([0,2,3,4,20])
export const V2_SLICE_BUDGET={drawCalls:9,foliageInstances:90,secondaryFoliageInstances:140,grassInstances:560,flowerInstances:72,rockInstances:42,groundDetailInstances:180,estimatedTriangles:68000,textures:0}
export const V2_FULL_BUDGET={drawCalls:9,foliageInstances:460,secondaryFoliageInstances:720,grassInstances:1800,flowerInstances:160,rockInstances:120,groundDetailInstances:480,estimatedTriangles:143000,textures:0}
export const V3_FULL_BUDGET={drawCalls:20,mountainInstances:17,forestInstances:150,reeds:180,fernInstances:180,landmarks:4,estimatedTriangles:126000,textures:0}
export const V4_COZY_BUDGET={drawCalls:18,heroTrees:3,flowerClusters:5,fish:4,ambientLife:3,estimatedTriangles:42000,textures:0}

// Artificial light begins at blue hour and reaches full presence only at night.
export function artificialLightLevel(night:number){const t=Math.max(0,Math.min(1,(night-.08)/.82));return t*t*(3-2*t)}
