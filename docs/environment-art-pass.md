# Environment art pass — 2026-09-22

## Scope and status

Environment-only procedural art improvement. This is **not a finished animation-film asset pack**. No Moru asset/rig/appearance edits, new gameplay, Nuu, wardrobe, Brain changes, dependencies, commit or deployment.

The approved `worldLayout.ts`, `terrain.ts`, `CameraRig.tsx`, `Character.tsx`, `appearance.ts` and Moru GLB matched their pre-pass SHA-256. Bridge crossing, transform, plank top height and approach remain unchanged. Home shell, door controller and interior collision remain authoritative.

## Changed art

- Grove: tapered curved trunk/branch/root meshes, asymmetric layered crowns with negative space; shared instanced foliage and curved grass; deciduous winter crown reduction. Seasonal palette/wind/weather remains connected.
- Home: instanced overlapping slate tiles, fascia/ridge, recessed window framing/sill and curtain strips, foundation courses, chimney cap, vine and entry lantern. Existing automatic door and cutaway remain.
- Former geometric crystals: low weathered stone groups with small inset mineral accents at the same placements.
- Landmark: segmented, chamfer-section carved arc geometry at the existing center/orientation/opening, with a root-like accent. Still a procedural stand-in for an authored hero landmark.
- River: clustered weathered bank stones and curved grass with clearance around the locked bridge approaches; soil/grass blend, existing water shader/reflections retained.
- Bridge: rounded plank edges using the same centers, rotations and dimensions; two sub-deck curved stringers. No approach or layout changes.
- Rocks: seeded asymmetric profiles, flattened lower surfaces, subtle strata. Far ridge crests have broader irregular folds.
- Materials: low-frequency color breakup, rain darkening/roughness, upward-facing snow using transformed world normals, restrained foliage wind. No extra bloom/exposure used to hide geometry.

## Required separately authored GLB assets

These remain procedural placeholders; do not label them final premium art:

| Priority | Asset | Production brief / constraints |
| --- | --- | --- |
| 1 | Moru Home exterior and furniture | Authored roof silhouette, coherent timber joinery, sculpted plaster/stone, real glass/window reveals, curated furniture. House footprint 8×7, existing door opening at house-local x=1.8,z=3.5,width=2.3; floor y=0. Keep door separate with correct hinge pivot; roof/walls separately addressable for cutaway. No collision redesign. |
| 2 | Three seasonal tree families | Cherry branching/blossom clusters, ginkgo fan-leaf identity, evergreen accents. Root pivot y=0; preserve existing grove placements and clear paths. Seasonal removable canopy and upward snow surfaces; near/mid LODs. Current broad clusters are not individually authored leaves. |
| 3 | Ancient halo | Designed eroded voussoirs, carved seams, roots/moss and embedded glass; preserve current halo transform and open passage. Current curved stone band lacks authored carving and narrative detail. |
| 4 | Giant flowers and floating islands | Sculpted petal layering/stamens and cliff/root/soil profiles. Existing flowers and island silhouettes remain stand-ins. Preserve placements and visual hierarchy. |
| 5 | Reusable rock/bank and bridge detail kit | Several sculpted contact-flat rock families, roots, natural soil edges and underside joints. Match current bridge envelope exactly; no relocation or narrowing of crossing. |

No external assets were downloaded. Suggested production budgets must be established from mobile profiling rather than assuming desktop performance transfers.

## Replacement interface

`Environment` accepts optional `EnvironmentArtSlots` from `artSlots.ts`:

- `homeDetail`: house-local decorative detail, mounted inside the existing home group. Does not own shell/door/collision. A complete exterior replacement needs a deliberate shell/cutaway adapter, not a blind GLB swap.
- `grove`: world-space art replacing FantasyGrove; preserve `TREES` placements and footprints.
- `landmark`: world-space art replacing WorldHalo; use `RING` and `HALO_ARCS` contract.

Slots accept a React node, so an eventual GLB component can supply cached loading and material ownership appropriate to that asset. No nonexistent URL is preloaded and no empty loader is running now.

## Verification

- Lint: no new warnings after resource initialization fixes.
- `tsc -b` + production build: pass. Existing bundle-size warning remains.
- 52 tests pass, including geometry finite normals/index validity and repeatable flattened rock base; existing bridge/layout/collision tests pass.
- Browser visual checks: DAY, SUNSET, NIGHT + RAIN, WINTER + snow, DREAM. Home entrance/automatic door, bridge preview, indoor cutaway and shader compilation inspected. PERFORMANCE settled back to 60 FPS after the switch.
- Desktop diagnostics observed approximately 60 FPS in settled sampled scenes, ~0.44–0.54 million rendered triangles. These are scene diagnostics, not a controlled before/after GPU benchmark. Quality switching briefly stuttered.
- Earlier hot-reload hook errors disappeared on clean reload; final clean runtime had only the existing THREE.Clock warning at inspection.
- Physical iPhone not tested. Full continuous locomotion/audio regression and all camera angles are not certified by these visual samples.

## Remaining art limits

House proportions/interior props, giant flowers, floating islands and halo remain recognizably procedural. No claim of film-quality completion. Ground is still the original stable collision surface; this pass adds bank/material integration, not new terrain physics. Water remains the existing approximate reflection/refraction shader, not scene-wide reflected geometry. New leaf wind is subtle and does not have a separately animated shadow-depth shader.
