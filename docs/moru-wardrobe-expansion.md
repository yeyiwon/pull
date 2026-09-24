# Moru Wardrobe / shared presentation — local candidate

2026-09-24. No commit, push, deployment, source deletion, asset remesh, or test-triggered REAL API request.

## Registry and models

`src/characters/wardrobe.ts` owns ID, category, display name, URL and compatibility status. Selection and asset URL lookup derive from it. Categories: Default, Seasonal, Event, Style. Existing six entries remain, plus:

| Name / ID | Selected source folder | Bytes | Triangles | Vertices |
|---|---|---:|---:|---:|
| All Black / all-black | moru-all-black | 20,283,508 | 48,486 | 68,754 |
| Off Duty / off-duty | moru-off-duty | 20,265,512 | 48,624 | 68,191 |
| Midnight Training / midnight-training | moru-trainin | 21,837,080 | 48,512 | 76,297 |
| Pearl Ballet / pearl-ballet | moru-ballet-rem | 19,699,640 | 48,166 | 70,420 |

All eight supplied GLBs were inspected. Each folder contains Walking and Running exports with identical mesh attributes, skin and rest hierarchy within the pair. Each has one mesh, one skinned mesh, one PBR material, 28 joints, no morph targets, a 2048² base-color texture and 4096² packed metal/roughness texture. Actual clips: Walking (~1.083s), Running (~0.708s), plus their short `.001` reference clips (~0.083s). The Walking export is copied byte-for-byte into `public/moru/final/appearances/<id>.glb`; Running full-body duplicates stay in the supplied source folder. No original file was moved or removed.

Detailed bone names, parents, rest transforms, accessor ranges/root-motion tracks, texture metadata, hashes and clips for all eight files: `moru-wardrobe-inventory.json`.

## Compatibility and continuity

Joint names and hierarchy match Default. Rest/bind transforms differ: these are **compatible through the existing rest-basis retargeter**, not direct raw clip copies. The same 17 canonical animation-only resources are reused. No new per-outfit animation GLBs were generated. Measured offsets cover all nine alternate looks × 17 clips = 153 pairs, with 13 skinned samples per pair; all finite/bounded (new-look maximum extents ~1.77–1.80 source units). This includes locomotion, jump, sit, stand, dances and gestures.

Character swaps remount only the body. Position/rotation/player, Brain, memory, conversation and world remain outside that subtree. Unsafe active gestures may return to idle; no guarantee of continuous dance phase across a swap. Unbinding the old performer now preserves pending speech and semantic history. Selection persists only under the existing `moruAppearance` preference key. Seated swaps remain disabled.

## One rendering path, including future outfits

Every loaded scene passes through `prepareMoruRendering(scene)` in `renderingProfile.ts`. It accepts **no outfit ID** and has no list of special appearances. All current standard PBR materials receive the same approved neutral PMREM environment, day/night fill/intensity and roughness policy. Base color, texture color space, original hair/eye palette, emissive and metalness are preserved. No source GLB or texture was baked/edited.

The regression test creates an unknown future scene outside the registry and proves it receives the same profile while leaving cached source resources unchanged. Material sharing within a model is preserved. Geometry/material/texture handles belong to the mounted character, which disposes them and its skeleton/mixer on unmount. The small environment render target is disposed separately. The World-level cache eviction runs outside Suspense, so an abandoned loading outfit is evicted too; StrictMode replay retains the currently selected entry. Shared animation resources are not evicted/disposed by outfit switching.

## Shared expressive feedback

`feedback.ts` defines semantic reaction states and SUBTLE / NORMAL / CELEBRATION intensity. Existing reaction emotion/emote and semantic action IDs supply input; no new inference or LLM request. One shared `MoruFeedback` renderer is outside the remounted body subtree.

- Ordinary reactions: a small bounded response; supported happy/affection/playful/curious responses can request an existing gesture when idle, without interrupting movement.
- Blush: two soft low-opacity world-space overlays near the shared head anchor, gated by facing direction and smoothly faded. No facial rig or texture mutation.
- Dance: duration from the animation registry; beginning pulse, one mid-clip accent and ending cue. 12 petals for Bubble Dance, maximum 24 for larger sequences; one pooled instanced mesh, no per-burst geometry allocation. Movement/action interruption clears the sequence. A short, local non-shadow light pulse affects only the nearby area.
- SFX: dance hooks reuse existing `moru_happy` / `moru_affection` families; reaction hooks use existing happy/surprise/affection families. Nine matching source cues exist. Dedicated `petal` and `sparkle` assets do not exist and are marked `ASSET_MISSING`. No sound synthesis/API call. Removed filename-regex gesture sound routing; feedback uses semantic IDs.
- Existing development Character Inspector has Happy/Surprise/Affection previews that exercise the presentation path without calling a provider or writing conversation history.

## QA evidence and limits

Browser WebGL evidence: all four new outfits rendered in the current World. Pearl Ballet Bubble Dance, All Black Love Dance, Off Duty Groove, Midnight Training playful gesture and local reaction previews rendered. Default surprise/listen, Summer happy, Winter affection/wave also rendered through the shared path. No captured browser console errors. Existing ten body-file size/SHA-256 entries match the reviewed inventory; the original six are unchanged.

Wardrobe categories/internal scrolling checked at 390×844 (panel x=12..378) and 844×390 (panel x=484..824, y=12..378), plus desktop. Temporary viewport overrides were reset; local server and Pearl Ballet selection remain available.

**Not a complete animation-clipping approval:** numerical pose sampling does not prove no sleeve/thigh/skirt/hair intersections or foot sliding. Full-frame, every-new-look Walk/Run/Jump/Sit visual inspection is still UNVERIFIED. The screenshots did not reveal an exploding rig or detached mesh, but cannot establish all-frame physical correctness. Blush is intentionally subtle; exact cheek registration throughout every head rotation and every look remains a visual tuning item. SFX hooks/assets were checked; a separate auditory mix review was not performed.

Desktop diagnostics during representative Midnight Training idle/reaction viewing: roughly 52–60 FPS, ~405–406 calls, ~965k total scene triangles at 1280×800 Beautiful. A model-swap sample dropped to ~29 FPS; these are observed samples, not a controlled benchmark or iPhone estimate. All new bodies are ~48k triangles, similar to Default (~48.6k).

Added runtime source size: 82,085,740 bytes (~78.3 MiB), loaded on selection, not all on startup. Assuming ordinary RGBA8+mipmaps, each model's two source textures alone imply ~106.7 MiB GPU texture storage; exact browser format varies. New/old CPU decoding can briefly overlap during a switch. Actual iPhone peak memory, decoded bitmap reclamation and long swapping sessions remain UNVERIFIED. No quality-reducing remesh or texture resize was silently applied.

## Validation

- lint: PASS
- client typecheck: PASS
- server typecheck: PASS
- full tests: 201/201 PASS
- asset check: PASS
- production build: PASS
- JS output: 1,423.45 kB, gzip 401.30 kB; existing >500kB chunk warning remains. Vite also reported prepare-out-dir timing, not a build failure.

Tests include future-model shared profile/resource isolation, retargeted pose records, persistent appearance selection, pending-speech preservation across body unbind/rebind, bounded semantic effects, interruption and dance cue cleanup. Existing Brain/conversation regression tests remain green. No Brain/identity/memory/server architecture, environment, source assets or secret configuration was changed in this pass.
