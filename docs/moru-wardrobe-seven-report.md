# Seven additional Moru styles — local candidate

2026-09-24. Existing ten appearances and all canonical animation resources preserved. No commit, push, deployment, provider call or model optimization performed.

## Import and performance inventory

All fourteen source GLBs were parsed. Each folder has Walking (1.083s) and Running (0.708s), plus a short reference clip. Within each folder their mesh and inverse-bind hashes match. Only Walking's body file was copied byte-for-byte; the existing seventeen shared animation resources remain the runtime vocabulary.

| Display name / id | MB (decimal) | Triangles | Vertices | Textures |
| --- | ---: | ---: | ---: | --- |
| Mode Sportif / mode-sportif | 21.28 | 48,117 | 69,777 | 2K color + 4K packed PBR |
| Literary Chic / literary-chic | 19.93 | 48,524 | 67,582 | 2K color + 4K packed PBR |
| Concert Night / concert-night | 20.86 | 46,559 | 68,439 | 2K color + 4K packed PBR |
| Amusement Park / amusement-park | 26.91 | 49,729 | 66,877 | 2K normal + 2K color + 4K packed PBR |
| Sculpted Mini / sculpted-mini | 20.16 | 46,378 | 67,825 | 2K color + 4K packed PBR |
| Sporty Prep / sporty-prep | 20.53 | 48,485 | 69,904 | 2K color + 4K packed PBR |
| Sunshine / sunshine | 19.23 | 48,565 | 69,079 | 2K color + 4K packed PBR |

Each has one mesh, one skinned mesh, one material, 28 bones and no morph targets. Complete names/hierarchy/rest transforms, material definitions, texture sizes, source hashes, and animation track ranges are in `moru-wardrobe-seven-inventory.json`.

Bone names and parents match Default. Rest/bind transforms differ, so compatibility depends on the existing rest-basis retargeter; raw clip sharing is not claimed. The existing pose measurement evaluated all seventeen clips at thirteen times for each new body, including idle/walk/run/jump/sit/dance/emotes. All 119 new combinations have finite, bounded skinned geometry. Measured ground offsets were added; the previous 153 measurements remain preserved (272 total).

Additional public bytes: 148,899,708. These are lazy selected-body assets, not a 149MB initial download. Existing Character cleanup and selected-body loader cache eviction remain shared. Estimated uncompressed RGBA8 texture+mipmap allocation is approximately 106.7MiB per ordinary style and 128MiB for Amusement Park, excluding geometry/framebuffers/driver overhead. This is an estimate, not an iPhone measurement. Actual iPhone frame rate, memory peaks and long swap-session memory stability remain UNVERIFIED. No remesh or texture reduction was performed.

## Shared systems

Registry additions use the same Character, renderingProfile, retargeter, reaction director, head anchor, blush sprites, VFX and SFX hooks. There are no outfit-specific lighting or reaction branches. Existing IDs/Brain/memory/identity/conversation/position are not replaced. Persistence remains `moruAppearance`; reload restored Sunshine in browser verification. A model swap can return to idle instead of retaining exact dance phase, as in the existing system.

## Browser QA and limits

All seven styles were selected in the running Chrome WebGL World. Their intended styling was visually inspected: black sporty outfit, glasses/academic styling, dark concert trousers, navy outing jacket, light hair/black mini silhouette, striped prep top and pale yellow Sunshine styling. Night face readability and single-body replacement were visible for all seven. Mode Sportif's dance and petal feedback were also observed. Desktop, 390×844 portrait and 844×390 landscape Wardrobe layout were inspected. The new last item is reachable through internal scrolling with header retained.

The send button retains a 44px hit target with a 34px visible disc and 17px icon, centered within the 48px composer; portrait rendering was checked.

Numerical animation validation does NOT prove absence of thigh/cloth/hair intersections. Per-style, full-motion visual QA of every requested walk/run/jump/bench-sit/emote/reaction and precise blush alignment remains incomplete. No outfit-specific clipping correction or source mesh editing was done. Day lighting and real-device mobile performance also remain to be checked. The accessibility tree's WebGL fallback text was initially mistaken for a rendering failure; actual screenshots confirmed working WebGL.

## Validation

- lint: pass
- client and server typecheck: pass
- full tests: 206/206 pass
- asset guard: pass; all admitted character byte sizes/SHA-256 match
- production build: pass
- existing bundle warning: JS 1,428.63kB / gzip 402.77kB exceeds 500kB warning threshold

Local candidate remains available; not production-approved by this report.
