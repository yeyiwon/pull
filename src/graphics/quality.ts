import { useSyncExternalStore } from 'react'
export const QUALITY = {
  PERFORMANCE: { vegetation: .3, dpr: 1, shadow: 1024, bloom: 0, particles: .45, water: 0, contact: false, rays: false },
  BEAUTIFUL: { vegetation: .65, dpr: 1.35, shadow: 2048, bloom: .17, particles: .75, water: 1, contact: true, rays: false },
  DREAM: { vegetation: 1, dpr: 1.5, shadow: 2048, bloom: .24, particles: 1, water: 2, contact: true, rays: true },
} as const
export type Quality = keyof typeof QUALITY
let selected: Quality = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches ? 'PERFORMANCE' : 'BEAUTIFUL'
const listeners = new Set<() => void>()
export function setQuality(value: Quality) { selected = value; for (const listener of listeners) listener() }
export function getQuality() { return selected }
export function useQuality() { return useSyncExternalStore<Quality>(callback => { listeners.add(callback); return () => listeners.delete(callback) }, getQuality, () => 'BEAUTIFUL') }
export const graphicsState = { fps: 0, frameMs: 0, calls: 0, triangles: 0, moonPhase: .8, bloom: true, contact: true, rays: true }
