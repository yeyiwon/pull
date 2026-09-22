# Moru Rescue — local candidate review, NOT approval

Requested separately by the Moru production task while the environment slice is blocked awaiting assets.

URL: `http://127.0.0.1:5175/?moruReview=1` (Vite development only).

- A: `/Users/yeiwon/Desktop/moru.glb`, 57-joint rig, no animation clips. Neutral appearance only.
- B: `/Users/yeiwon/Documents/Codex/2026-09-22/referenced-chatgpt-conversation-this-is-an-2/outputs/MORU_Rescue/candidate/Moru_Rescue.glb`, 57 joints, 56 clips; body with 15 morph targets plus separate `moru_smile_contour` mesh carrying Mouth_Smile.
- Model selector remounts one clone at the same player position and world lighting. Both normalized to 2.8 standing height; compare proportions, not original source unit differences.
- Raw source materials/textures preserved in review. No production `applyCharacterAppearance` overlay; the existing world lights/Dream renderer are shared. This distinguishes source appearance from runtime material enhancement.
- Manual clips plus pose pause/scrub. A has no fake animation. B raw clip previews are distinct from production locomotion retiming/layer blending.
- Space uses existing jump physics and existing buildMoruClips root-motion-stripped jump clone; raw jump dropdown is asset inspection only.
- Root/morph data never edited. Source GLB/blend, production Full Life and original remain in place. Read-only exact-path localhost middleware; no new files under public and no candidate payloads in production dist.
- Query absent: original production Character component is used. Production build eliminates lazy review UI/module; middleware is serve-only and rejects non-loopback clients.

## Confirmed data

EyeLookLeft/Right/Up/Down morph support: 982 vertices, all solely weighted to mixamorigHead (no >.001 secondary weights in this selection). No non-uniform animation scale channel found. This is evidence for repaired skinning in that region, not proof that every expression combination is visually correct.

## Validation limits

Original/Rescue neutral loaded in the same world. Selected head down/tilt and Running preview inspected without shader/runtime errors in sampled views. The inspector is a review instrument, not automatic approval of facial fidelity, foot sliding or all 56 clips. User must choose A or B; neither is designated final. Production material-overlay integration and all expression combinations remain outside this raw-asset comparison.
