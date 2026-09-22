// Only set a URL after the matching GLB passes the production brief and visual review.
// Null is intentional: missing art must not create 404s or masquerade as finished work.
export type ArtSlot = 'homeDetail' | 'grove' | 'landmark' | 'riverbank'
export const environmentAssets: Record<ArtSlot, {url: string | null; space: 'house-local' | 'world'; specification: string}> = {
  homeDetail: {url:null,space:'house-local',specification:'Roof/window/trim detail only; retain the hollow shell, animated door and interior until a complete Home adapter is approved.'},
  grove: {url:null,space:'world',specification:'Authored grove matching the five tree anchors in worldLayout.ts; preserve collision footprints.'},
  landmark: {url:null,space:'world',specification:'Ancient carved PULL motif at the existing RING anchor, with moss and restrained glass inlays.'},
  riverbank: {url:null,space:'world',specification:'Bank/bed dressing outside the locked bridge approaches and existing shallow-water movement surface.'},
}
