# Platinum Noir / Black Glasses — local integration

2026-09-24. Additive wardrobe entries; existing seventeen appearances untouched. No Brain, identity, memory, provider, World, music, animation vocabulary or shared rendering changes. No commit/push/deploy or real API calls.

The supplied paths had moved: actual source folders are `Desktop/moru/moru-platinum-noir` and `Desktop/moru/moru-black-glasses`. All four GLBs were inspected. Each folder's Walking and Running exports have identical mesh and inverse-bind hashes. The Walking file was copied byte-for-byte as the selected body; existing seventeen shared clips supply runtime animation.

| Display / ID | Bytes | Triangles | Vertices | Material / textures |
| --- | ---: | ---: | ---: | --- |
| Platinum Noir / platinum-noir | 19,384,636 | 47,170 | 65,265 | 1 / 2048² color + 4096² packed PBR |
| Black Glasses / black-glasses | 19,242,052 | 48,298 | 65,972 | 1 / 2048² color + 4096² packed PBR |

Both: one mesh, one skinned mesh, 28 bones, no morph targets. Bone names/parents match Default; rest/bind transforms differ and use the existing retargeter, not unmodified raw clip binding. Source clips are Walking 1.083s / Running 0.708s plus short reference clips. Full material, bone/rest, texture and track metadata: `moru-wardrobe-noir-inventory.json`.

34 new body/clip combinations were evaluated as actual skinned poses at thirteen times per clip, covering the full shared vocabulary including idle, walk, run, jump, sit, dance and emotes. All finite and bounded; maximum source-space extents 1.837 (Platinum Noir), 1.813 (Black Glasses). Ground measurements added without changing previous 272 rows; 306 total.

Both use the existing shared rendering profile and head-based reaction/blush/VFX/SFX path automatically, with no ID-specific lighting overrides. Browser WebGL inspection confirmed Platinum Noir's pale long hair/black styling and Black Glasses' dark hair, glasses, white top and denim. Both faces remained readable at night. Platinum Noir love dance showed heart effects; Black Glasses bubble dance showed petals. Black Glasses affection preview displayed typed speech and blush without an API request. Mobile 390px Wardrobe showed both additions with internal scrolling and fixed header.

Resource management remains selected-body lazy loading, GPU cleanup and old loader-cache eviction; no duplicated animation downloads. Added disk/build assets total 38,626,688 bytes. Estimated RGBA8 texture+mipmap footprint is ~106.7MiB per selected model, excluding other GPU resources. This is not a measured mobile memory figure. No texture reduction/remesh was performed.

Validation: lint, client/server typecheck, 206 tests, asset guard and production build passed. JS build 1,429.78kB / gzip 403.09kB; existing >500kB warning remains.

Limits: numerical pose bounds are not a clipping guarantee. Full per-frame walk/run/jump/bench-sit clipping inspection, Platinum Noir blush alignment, Day lighting, long-session swap memory profiling and actual iPhone FPS remain UNVERIFIED. Studio's single Black Glasses sample showed 25 FPS / 247 calls / 884k scene triangles; this was not a controlled benchmark and cannot be attributed to the new model alone.
