# Visual & UX Renaissance — local candidate

Brain baseline: `3d09281` (`feat: add autonomous Moru world cognition`). Brain v3 is feature-frozen. UI/visual changes remain uncommitted; no push/deployment or REAL API test was performed.

## Implemented

- A single overlay coordinator: World, Moru, Music, Memories, Display, Controls. Development controls live inside Studio and are absent in production.
- Small header and Moru entry replace scattered permanent panels. Moru tap opens the same action entry. Actions close the sheet so their animation is visible.
- Music keeps the existing engine mounted, exposes actual track, mute and volume through a portal. No audio files or scheduling logic changed.
- Thin conversation input preserves the existing provider/session. Panels and composer exclude one another; movement is cleared on panel entry. Focus trap, Escape, focus restoration, safe areas and reduced-motion styling are included.
- Portrait/landscape sheets, quieter touch controls; keyboard-sized viewport tested without sending a conversation.
- Camera framing, muted sunset colors, subtle celestial arc/cloud lighting, atmospheric landmark material, house material/entrance-light response, ground/riverbank variation and analytical cloud water reflection.
- Bridge placement, house footprint/interior, collision, Original Meshy assets, Brain/research/memory and audio engine remain unchanged.

## Verification

- Lint, client and server typecheck: passed.
- Tests: 154/154 passed.
- Production build and runtime asset guard: passed.
- Build: JS 1,382.28 kB (gzip 388.57 kB), CSS 23.49 kB (gzip 6.10 kB). Existing large-chunk warning remains.
- Browser: 1280×800, 390-wide portrait, 844×390 landscape and 390×470 keyboard-like viewport inspected. Menu, music, action category/Dance, movement/jump, camera orbit, composer draft/close and Day/Sunset/Night/Rain/Winter inspected.
- Real API calls: zero. Conversation submit was deliberately not exercised; provider regressions are covered by existing tests.
- Browser errors: none in final tab; existing THREE.Clock deprecation warnings remain.
- Representative UI diagnostic samples: Beautiful 41 FPS / 24.2 ms / 405 calls / 602k triangles; Dream 40 FPS / 25.2 ms / 405 calls / 623k triangles; Performance 43 FPS / 23.0 ms / 396 calls / 535k triangles. These are separate dev-browser samples, not a controlled before/after benchmark. Scene/time differed; 60 FPS is not established.
- Real iPhone keyboard, thermal performance, native touch feel and full physical house/bridge/water traversal were not re-certified in this pass.

## Art quality gate / required assets

This is a UI and rendering candidate, not completed animation-film asset quality. Existing procedural forms remain visible. Additional shader work is not a substitute for these assets:

| Asset | Required work | Integration constraint |
| --- | --- | --- |
| Hero home | Designed silhouette, roof thickness/eaves, recessed windows, trim, foundation, authored PBR surfaces | Match current footprint, door pivot/opening and interior navigation |
| Hero tree | Sculpted trunk/branches and authored foliage clusters, varied silhouette | Preserve current layout; production LODs |
| Riverbank/rocks | Designed irregular bank segments, varied rock set, soil/stone transition materials | Preserve river path, bridge crossing and collision plane |
| Landmark | Authored asymmetrical monumental geometry with secondary detail | Keep protected layout; approve visual before replacement |
| Foreground vegetation | Authored leaves/petals with clean normals and season material variants | Existing instancing/density budget and wind-compatible pivots |

No placeholder assets were newly invented to claim these quality gates. Memories is an honest empty presentation state; it does not add memory/Brain features. Dynamic joystick relocation and native-device refinements remain outside this candidate.

## Follow-up: house presence and menu feedback

The previous footprint-preservation statement describes the initial pass. Following explicit feedback that the home was too small, the house now scales 1.3× (10.4×9.1 world footprint), anchored at the original porch/path endpoint. Bridge coordinates and crossing are unchanged. Home coordinate transforms, wall/furniture collision, interior checks, precipitation shelter, contact patches and adjacent plant exclusion follow this scale. The original straight landmark test crossed the enlarged west wall; it now verifies a real west-side route, without disabling collision. Entry/exit tests remain unchanged and pass. A new test verifies the original porch anchor, dry floor, coordinate round trips and bridge constants.

Roof/plaster/window response and riverbank stone variation were adjusted. Runtime inside-home preview exposed opaque door/window-trim occlusion; those now follow the existing cutaway and the character is visible. Full production hero geometry remains unavailable (environment registry empty); this remains an interim scale/composition/material pass.

Latest full suite: 155 tests passed; lint, client/server types, build and asset check passed before the final material-only cutaway fix, which was separately checked with lint/client types/build and a browser screenshot. No commit/push/deploy.
