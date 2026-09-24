# World Labs × Original Moru — isolated preview

Open `/worldlabs-preview.html` on the existing Vite dev server. Use
`?quality=100k` for the smaller splat. This HTML is not a production build entry,
and the production App/World do not import the preview.

- World: `24a97b29-353e-46ec-ab7f-bb4ca992d14a`, `marble-1.1-plus`.
- Existing generation only; no new generation or paid mesh export.
- Artifacts are in ignored `asset-source/worldlabs-poc/`, outside `public`/build.
- 500k SPZ: 8,056,875 bytes. 100k SPZ: 1,434,925 bytes.
- Collider GLB: 1,084,088 bytes, 40,570 triangles; raw coordinate bounds match SPZ.
- Official metric scale 1.7442190647125244, ground offset 0.8470605611801147;
  apply metric conversion followed by the raw OpenCV → Three.js X-axis half turn.
- Original `public/moru/moru-walk.glb` plus existing Idle/Walk/Run clips;
  geometry, rig, texture, material and source GLBs are untouched.
- Default Moru standing height 1.4m, adjustable 0.9–2.8m for scale review.

## Rendering / movement

Spark 2.2.0 is a dev dependency. Three.js OrbitControls provides drag/wheel.
WASD/arrows and the touch buttons move relative to the camera; Shift runs.
Idle/walk/run cross-fade. The supplied collider uses a Three.js Octree for ground
and forward wall queries; voids, steep steps and walls reject movement.

Broad splats initially coated Moru in foreground color. The preview therefore
renders the splat backdrop, clears depth, draws the supplied collider depth-only,
then renders Moru with that solid occlusion. This is an approximation bounded by
collider accuracy, not an excuse to draw Moru over walls. Collider toggle displays
the actual geometric proxy.

## Verification and remaining boundaries

- Software WebGL loaded both 500k and 100k SPZ and the original character.
- 100k screenshot confirms the character is no longer coated by splat fragments.
- Browser camera-relative W movement changes position and height; tests cover
  transformed ground, void rejection and wall blocking.
- Software WebGL was approximately 1–5 FPS; this is NOT a GPU/iPhone benchmark.
- Existing normal browsers report WebGL unavailable in the agent environment.
- Ground/contact and occlusion across the whole generated world remain visual QA
  tasks. The collider may represent water as a surface and does not label rooms,
  vegetation or water. This is not a full character controller/physics integration.
- The generated water, shadows, foliage and lights are baked splat appearance.
  Existing PULL water/weather/lighting cannot simply relight them. Hybrid dynamic
  water needs explicit surface separation, masking and alignment first.
- Production Brain, conversation, audio, topology and terrain are unchanged.
- No API key is needed by or exposed to this preview.
