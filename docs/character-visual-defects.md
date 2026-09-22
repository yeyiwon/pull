# Character visual defects — 2026-09-22

## Eye deformation: asset correction required

Reproduce with `node scripts/inspect-eye-skin.mjs`. This loads the actual Full Life skin and morph arrays, removes textures for headless execution, leaves all morph influences at zero, and rotates only the inspected head bone. It does not run CharacterLife or the animation mixer. `eye-skin-audit.json` contains the measurements.

Moru's EyeLookDown support contains 983 vertices (the union of eye-look supports contains 985). They have mixed weights on `mixamorigHead`, `Bone_017`, `Bone_018`, and head descendants `Bone_029/030/031/032`. Head pitch ±0.3 radians changes sampled local pair distances by up to about 65%; yaw ±0.4 by up to 53%; tilt ±0.2 by up to 32%. These are maximum sampled **pair-distance changes**, not a measurement of the whole eye's aspect ratio. This reproduces non-rigid eye deformation without blink, gaze, expression or runtime scale.

Nuu's EyeLookDown support contains 787 vertices. Most influences are head/descendant bones, with a small `Bone_002` contribution. Rotation-only sampled pair-distance changes reach about 1.3%; this is much smaller than Moru's defect, but is not a guarantee that every exported face animation is clean.

Direct GLB accessor inspection found no changing scale animation or non-uniform scale keys in either asset, and no non-uniform rest node scales. Runtime CharacterLife adds quaternion rotations only. Head movement does not itself write scale. The eye morphs are clamped individually and blink attenuates look/wide, but full-strength horizontal + vertical gaze can still combine. That is not necessary to reproduce the reported defect. No runtime weight rewrite, eye shrinking, corrective mesh, or head-motion removal was applied.

### Blender correction

- In `moru_character.blend`, inspect the eye/eyelid vertices identified by EyeLook morph support. Remove unintended neck/upper-torso influences (`Bone_017`, `Bone_018`) from the rigid eye region; audit `Bone_029/030/031/032` against their intended face roles. Assign consistent head-following weights across the eye surface, retaining intentional eyelid/facial deformation groups. Normalize weights. Do not indiscriminately rigid-bind the entire face.
- In `Nuu_Full_Life.blend`, audit stray `Bone_002` influence on the eye region, then verify intended head-descendant groups under `Bone_041`.
- Test pitch/yaw/tilt with all shape keys at zero first. Then test Blink + LookDown, and Curious + tilt. Verify both eyelid closure and eye outline.
- Keep rest/bind transforms, vertex order, shape keys, all 56/48 clips and attachments. Re-export GLB and rerun the audit. No evidence here requires deleting scale tracks or replacing the rig.

## Overexposure adjustment

The Full Life input originals and exported assets retain identical 4K texture bytes and material parameters (see `character-material-audit.json`). Their materials have no emissive contribution. There is no character-specific exposure or key/fill/rim light. The new RoomEnvironment was additional to world hemisphere/directional lighting.

`appearance.ts` now reduces extra environment intensity from 0.62 day / 0.23 night (with an additional 8% DREAM boost) to 0.24 day / 0.10 night, independent of graphics quality. Body roughness uses the original sampled roughness with a 0.48–0.88 presentation range instead of multiplying by 0.86. Eye-mask gloss remains distinct. No base-color multiplier, emissive boost, exposure increase or post-tonemap clipping is introduced. World lights, bloom and bridge composition are unchanged.

A complete original/current/restored neutral-pose comparison and full face-combination visual acceptance remain outstanding. Existing GLB files were not modified. The asset-weight blocker is not marked fixed.

## Verification

- `npm run lint`: pass, no warnings after removing an unused export.
- `npm test`: 48/48 pass. Existing tests do not certify corrected eye geometry.
- `npm run build`: typecheck and production build pass; existing large-bundle warning remains.
- Browser: DAY, SUNSET, NIGHT with DREAM; Moru inside the house at NIGHT. Visible original palette and shading remain. Nuu was visible beside Moru outdoors, but indoor Nuu lighting was not verified.
- No new console error observed after the 23:41 UTC reload; earlier HMR React hook errors remain in historical logs. THREE.Clock deprecation remains.
- Eye pitch/yaw/tilt isolated numerically on real skinned vertices; complete combined-expression visual acceptance is blocked by the original weight defect.
- No commit, deployment, Blender asset change or bridge-layout change.
