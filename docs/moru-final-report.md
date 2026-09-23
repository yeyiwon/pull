# Current update — seasonal retargeting enabled

User subsequently authorized retargeting. All four appearances are now enabled in Menu → Appearance. Earlier compatibility gates below are retained as the original source audit, not current runtime status.

- One shared set of 17 animation-only GLBs. Runtime rest-space quaternion basis conversion and proportional translation adapt the selected body without per-outfit animation files.
- Selected body only is mounted; previous GPU geometry/material/textures are disposed. GLTF loader CPU caches remain; this is not an iPhone memory certification.
- 51 outfit/clip combinations sampled at 13 poses each: finite, max source-space extent below 1.80m. Ground offsets measured per outfit.
- Browser: all three seasonal bodies rendered; Halloween and Winter Bubble Dance visibly verified. Full clothing self-intersection clearance and real-device performance remain unverified.
- Face fill now uses actual head position rather than speech anchor; intensity 14 at 2.4m, no emissive additions. Character still casts shadows but no longer receives shadow-map occlusion, preventing hair/world shadows from hiding the face. Source textures/materials unchanged.
- Bench UI now exposes only sit/stand. Cross-leg toggle removed; standing transition hides controls instead of showing a loading phrase. Stand animation retained.
- lint, client/server typecheck, 194 tests, asset guard and production build pass. Existing >500kB chunk warning remains.
- No API calls, commits, pushes or deployments.

---

# Final Moru local candidate

Canonical source: `Meshy_AI_Moru_Canonical_Remesh_biped_Animation_Short_Breathe_and_Look_Around_withSkin.glb`.

## Source audit

| Appearance | Triangles | Vertices | Source body bytes | Status |
|---|---:|---:|---:|---|
| moru | 48551 | 77087 | 22436092 | COMPATIBLE |
| moru-spring | 48308 | 72297 | 20971604 | RETARGET_REQUIRED |
| moru-winter | 48688 | 63500 | 20186368 | RETARGET_REQUIRED |
| moru-halloween | 47773 | 86207 | 23935340 | RETARGET_REQUIRED |

All sources: 1 skinned mesh/material, 28 joints, no morphs. Base color 2048², roughness/metalness 4096²; about 106.7 MiB RGBA8+mipmap texture memory per selected body before geometry/framebuffers (estimate, not device measurement).

23 supplied GLBs: 17 canonical animation exports + 2 native locomotion exports per seasonal appearance. All main and .001 reference clips are inventoried. Seasonal sources remain untouched outside public; they are not downloaded or GPU-loaded.

## Shared runtime inventory

| Clip | Duration seconds |
|---|---:|
| Bubble_Dance | 8.125 |
| Gentlemans_Bow | 7.333 |
| Happy_jump_f | 9.917 |
| Hop_with_Arms_Raised | 2.417 |
| Long_Breathe_and_Look_Around | 11.333 |
| Love_You_Pop_Dance | 10.083 |
| Not_Your_Mom | 7.083 |
| Running | 0.708 |
| Short_Breathe_and_Look_Around | 7.917 |
| Sit_Cross_Legged | 9.625 |
| Sit_to_Stand_Transition_F | 4.792 |
| Skip_Forward | 2.917 |
| Walking | 1.083 |
| Wave_One_Hand | 4.208 |
| You_Groove | 13.583 |
| air_squat | 1.958 |
| penguin_walk | 2.083 |

17 canonical mesh-free resources, 3,296,148 bytes total, preserving 34 clips including .001 references. One unchanged canonical body: 22,436,092 bytes.

Semantic intent IDs remain unchanged for saved Brain data. The registry maps available intentions to these clips. funnyDance, hipPose, sitFloor and walkRelaxed are unsupported in the supplied set and declined. No SPRINT/LAND/LIE/SLEEP/THINKING/SHY capability is invented.

Bench_Sit_From_Stand is an explicitly derived reverse of Sit_to_Stand_Transition_F; Bench_Rest holds its seated end. This is not claimed as a supplied sit-down clip.

## Compatibility gate

All seasonal variants match bone names/hierarchy but differ in all 28 rest transforms and inverse bind matrices. See moru-final-compatibility.json for per-bone deltas. Common animation reuse and live seasonal switching remain blocked pending compatible exports/retargeting. UI: Menu → Appearance; Default active, three variants disabled with explanation. moruAppearance is a visual-only preference; old Noir/Lumi preference falls back safely to Default.

## Removal

Reference search across src/tests/runtime manifest found no old-body imports/URLs before removing public/moru/new, public/moru/waterlight and their three dedicated modules/scripts. 49 files / 56,028,141 bytes removed. Exact manifest: moru-final-removed-assets.json. Desktop source sets and unrelated legacy archive assets are untouched.

## QA limits

Canonical: all 17 animations evaluated over 13 skinned poses with finite bounds; movement/jump/interrupt regression tests use the actual new skeleton. Browser: Default load and two dances visibly confirmed. Precise sleeve/hair/boot self-intersection clearance is not established by bounds tests. Seasonal common-animation and clothing QA are BLOCKED, not passed. No REAL API call, commit, push or deploy.

## Final validation

- lint, client/server typecheck, 192 full tests, asset guard, production build: PASS.
- Browser: actual Default idle, Jump and two dance frames confirmed; no browser console errors captured.
- Appearance menu width: 390px viewport bounds 35–355px; 1280px viewport bounds 927–1229px. Temporary viewport override reset.
- Seasonal live swap intentionally unavailable; no claim of four-appearance physical QA.
- Existing JS chunk-size warning remains (1,410.06 kB minified / 397.07 kB gzip).
- Moru mind/AI modules and World graphics were not edited in this pass. Existing unrelated working-tree changes remain.
