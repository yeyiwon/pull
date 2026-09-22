# PULL integrated development checkpoint

2026-09-22. Development baseline, not final visual/audio approval.

- Production Moru remains the existing Full Life asset. Rescue is unapproved and served only by the local `?moruReview=1` inspector. User choice A/B is pending; this checkpoint does not promote either candidate or discard sources.
- Nuu remains archived and absent from runtime/model/audio registration.
- Audio v0.5: 24 seasonal/time masters imported with hashes checked, semantic IDs retained, next-bar/3-second transitions; Home/ambience/SFX retained from v0.2. No music generated. Active catalog 124 assets, 37,253,132 bytes; no bulk 24-track preload. Legacy outdoor v0.2 exports are retained but not selected.
- Environment remains a clearly labelled procedural baseline. Production visual slice is NOT achieved; see environment-slice/PRODUCTION-BRIEF.md for the 8 missing authored asset contracts and quality gate. Existing Dream pipeline and locked bridge layout unchanged.

## Validation

Lint, TypeScript through production build, and 55 tests pass. Existing bundle-size and THREE.Clock deprecation warnings remain.

Browser normal World: spring_morning → summer_night → home_night → winter_night routing settled successfully; Home outside low-pass ~1100 Hz; observed crossfade scheduling, current music and bounded lazy cache. Jump/land audio cues, brief keyboard movement, camera drag, house/interior/bridge/shallow-water previews and winter weather/Dream rendering checked. No console errors in this clean session. This is not a full continuous traversal or human listening approval of every track.

Winter NIGHT/DREAM at 1280×720 showed roughly 35–37 FPS (~27–29 ms; ~441 calls / 582k rendered triangles) in the current multi-tab desktop session. Earlier smaller/simpler sampled views were 60 FPS. Do not claim uniform 60 FPS or physical iPhone validation. Performance optimization remains a later pass; PERFORMANCE was also sampled at about 45 FPS in the shallow-water view, so fallback is not a certified 60 FPS guarantee.

Secrets-pattern scan found no private key/API-token matches in the inspected project text. .env/local deployment artifacts remain ignored. No remote push/deployment authorized or performed for this checkpoint.
