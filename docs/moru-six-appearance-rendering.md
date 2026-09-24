# Moru six appearances — local candidate, 2026-09-24

## Source and compatibility

All four supplied GLBs were inspected; full inventory: `moru-summer-autumn-inventory.json`.
Runtime bodies are byte-identical copies of each Walking source (not regenerated).

| Appearance | Source filename | Runtime path | Bytes | Triangles | Vertices |
|---|---|---|---:|---:|---:|
| Summer | Meshy_AI_Moru_Summer_Remesh_biped_Animation_Walking_withSkin.glb | public/moru/final/appearances/summer.glb | 21,589,976 | 48,340 | 76,208 |
| Autumn | Meshy_AI_Moru_Autumn_Remesh_biped_Animation_Walking_withSkin.glb | public/moru/final/appearances/autumn.glb | 20,130,152 | 48,621 | 65,400 |

Each has one skinned mesh/material, 28 joints, no morph targets, 2048² base color and 4096² packed metallic/roughness texture. Running sources contain the same body and were not duplicated into public. Bone names/hierarchy match canonical; rest transforms/inverse binds differ, so existing rest-space retargeting is required. Seventeen canonical semantic clips are shared, with measured per-appearance ground offsets. Five alternate appearances × 17 clips × 13 sampled poses remain finite without exploded bounds (`moru-season-retarget-qa.json`). This numerical check is not a mesh-intersection proof.

## Rendering investigation

Installed R3F renderer uses sRGB output, ACESFilmic tone mapping, default exposure 1. GLTFLoader correctly marks base-color textures sRGB. Source uses MeshStandardMaterial; there is no normal map/AO map/emissive map. Packed blue metalness is close to zero, not a uniformly metallic character. Material factors are retained, with roughness factor multiplied by 1.12.

Existing World directional/hemisphere lighting had no environment map. Its strong directionality and dark lower hemisphere left silver hair/eyes underfilled. No source texture rebake, color-space workaround, global exposure boost or unlit conversion was applied.

The common character profile adds a bounded, neutral 128px PMREM environment, intensity 1.3 day / .75 night, and a shadowless camera-facing soft point fill (4 day / 5 night at 2.8 distance). Source color, textures, emissive, metalness and geometry are unchanged. Cast shadows remain enabled; existing receiveShadow=false remains. Because each body is a single baked material/mesh, there is no separate face/hair material control. World rendering is unchanged.

During implementation, render-created PMREM disposal under effect replay caused inconsistent brightness. PMREM creation and disposal now belong to effect setup/cleanup, with material bindings refreshed on every setup. Lights/materials remain PBR resources updated through refs.

## UI, state and resources

Appearance order: Default / Spring / Summer / Autumn / Winter / Halloween. Existing menu, persisted selection, scrolling and loading indicator are reused. Only selected body mounts. Identity, Brain, memory, conversation and World state are untouched. Animation files are shared rather than copied per outfit.

Old GPU geometry/material/textures and PMREM are disposed on unmount. Previously visited GLTF loader entries remain CPU-cached; this is a remaining memory risk, not an iPhone performance guarantee. One body's uncompressed 2K + 4K RGBA textures alone are roughly 80 MiB before mipmaps (~107 MiB with them). The two new downloads total 41,720,128 bytes. No shadow map was added for fill; no runtime scene-reflection pass was added.

## Verification and limits

- Actual WebGL: all six appearances loaded and switched; Day, Sunset, Night comparisons performed. Silver/lavender hair and dark costume colors remain distinguishable after correction; eyes are brighter than the underfilled initial frames. Not a calibrated match to Meshy lighting.
- Summer representative dance, greeting/jump selection and Autumn dance were exercised through existing action UI. All 17 clips on both new rigs were also sampled using Three.js skinning/mixers offline.
- Complete continuous visual inspection of walk/run/bench sit and every clothing/hair/limb intersection remains UNVERIFIED. Browser UI state changed during the final checks; do not treat numerical finite-pose results as full physical QA.
- Actual iPhone FPS/peak memory: UNVERIFIED.
- Lint: pass, no warning after documented Three.js mutable-resource exception.
- Client and server typecheck: pass.
- Full tests: 196/196 pass.
- Asset guard and production build: pass.
- Existing bundle warning: JS 1,414.49 kB (gzip 398.50 kB), above 500 kB warning threshold. Build succeeds.
- No API calls, commit, push or deployment. Local candidate remains on localhost:5175.
