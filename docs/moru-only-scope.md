# Moru-only scope

Nuu runtime component and manifest, model deployment copy and 18 SFX deployment copies are preserved outside the repository at `/Users/yeiwon/Developer/pull-archives/nuu-scope-2026-09-22`. The original Full Life ZIP and Audio v0.2 masters remain in Documents. None are Vite public assets now.

Removed scene mounting/loading, dedicated frame callback, mixer, morph/blink/attention controller, proximity/approach/rest timers, collisions/navigation, registry entry, debug controls, peer attention, audio observer and SFX registrations. No Nuu-specific camera behavior existed; CameraRig was left unchanged. Shared skeleton cloning, controller, appearance and collision utilities remain.

Moru GLB, appearance.ts, CameraRig.tsx, locomotion.ts and terrain.ts SHA-256 match the pre-removal snapshot stored in the archive. All 56 Moru source clips remain in the GLB. The companion-directed `look_at_nuu` entry is excluded from the runtime action manifest (55 available entries); the source GLB/metadata is not rewritten.

Structural reduction: one skinned mesh (23,878 triangles), one 66-joint skeleton, one mixer, eight morph targets and one frame callback no longer instantiate. GLB download drops by 21,155,404 bytes; optional SFX deployment drops by 1,067,642 bytes. Nuu audio was lazy before, so this does not imply an equal reduction in initial audio download. Audio selection now contains 124 files / 35,969,432 bytes. Exact GPU/JS memory and FPS improvement require controlled profiling; these byte totals are disk/network assets, not heap measurements.

The previous skin-weight defect in Moru is not changed or claimed fixed by this cleanup. No commit/deployment.

Validation: lint, explicit tsc -b, all 50 tests and production build pass. Neither production audio manifest nor built JavaScript/public filenames contain Nuu references. Development controls expose only MORU; App retains the existing DEV guard. Browser: Moru-only scene, W input, Space jump/landing cue, camera drag, bridge/water/house location previews, winter/night/rain and DREAM render checked. Winter music and water-entry cue observed; no console error in the fresh tab, only existing THREE.Clock warning. The existing JS bundle-size warning remains. Scene diagnostics showed about 60 FPS, 256–366 draw calls depending on view/preset; no matched before/after GPU/heap profile was collected. Physical iPhone and a continuous walk-through route were not tested in this pass.
