# Visual Foundation 2

Scope: no gameplay, collision, camera, Moru geometry, bridge transform or water shader changes. House lighting, contact-depth pass, water Fresnel/moon reflection/wetness and bloom remain intact.

## Rendering

- Camera-centred sky dome, horizon scattering, two drifting cloud decks, celestial density-gradient lighting and cloud extinction of stars/moon. Existing procedural craters/phase retained, moon edge antialiased. Star size/brightness varies independently, restrained scintillation.
- Lower hemisphere fill, season-tinted ground bounce, rain attenuation of directional light. Existing directional celestial alignment and local house lights retained.
- Fog begins at 38 / haze instead of 75 / haze; distant contrast/saturation converges towards time-dependent air color. No global exposure increase.
- Existing path/riverbank/grass masks plus microscopic normal relief. This is visual relief only, not actual elevation/collision changes.
- Instanced grass/fern/flower registry with seasonal density, smoothly thinning near/mid/far shader tiers and anchored wind. Quality preset still caps total instances. GPU distance thinning reduces visible coverage, not submitted vertex count.

## Data-only GLB registration

Put reviewed GLBs under public/environment/. Edit public/environment/registry.json and reload/redeploy; no TypeScript edit required. Empty registry intentionally generates no placeholders. Existing scene art slots and fallback geometry remain unchanged. New entries are explicit dressing placements, never automatic replacements of collision/house door/bridge layout.

Example (replace URLs with files that actually exist):

```json
{
  "version": 1,
  "assets": [{
    "id": "hero-tree-01",
    "category": "tree",
    "url": "/environment/hero-tree-01.glb",
    "season": ["spring", "summer", "autumn", "winter"],
    "scaleRange": [0.8, 1.2],
    "placementType": "manual",
    "placements": [{"position": [-18, 0, -24], "rotation": [0, 0.4, 0], "scale": 1}],
    "lod": [{"distance": 35, "url": "/environment/hero-tree-01-low.glb"}],
    "materialResponse": {"wetness": true, "snow": true}
  }]
}
```

Categories: house / landmark / tree / rock / vegetation / prop / accessory. Rotation is radians; coordinates are world-space; scale is uniform. LOD distances must increase. Ten-percent hysteresis; only selected LOD loads, cached across instances. Transitions retain previously loaded content while the next LOD suspends. Asset failure is isolated and logged; invalid registry fails closed with a warning. Cached source textures and geometry are never mutated/disposed by an instance. Weather opt-in clones materials, preserving maps; snow is upward-facing tint and wetness changes roughness, not new geometry.

`catalog` entries do not render. Accessories must use catalog: attachment behavior is outside this task. House entries add static dressing only; a navigable replacement needs an explicitly reviewed adapter. Existing geometry is not automatically removed. Animated/skinned environment exports are outside this static scenery loader's contract. No authored production environment GLBs were available to visually certify this loader against actual delivered art.

## Quality limits

Performance omits fine cloud octave and terrain normal relief; existing postprocessing fallback unchanged. Beautiful/Dream retain normal detail, richer clouds and existing contact/bloom settings. Full authored house/tree/landmark quality still requires the assets specified in PRODUCTION-BRIEF.md. This pass establishes rendering/registration foundations, not completed hero art.

## Verification — 2026-09-22

Lint and TypeScript passed; 70 tests passed; production build passed (existing >500 kB bundle warning). Protected hashes match for every Original Meshy source GLB, Character, locomotion, CameraRig, terrain, worldLayout, Waterway and MoruHome. A pre-existing scope test now ignores exactly Finder's .DS_Store; it still rejects unexpected character entries.

Same 1280×720 IAB viewport, spawn camera, DREAM preset, sequential preview modes. The following are visible one-second diagnostic samples, not an isolated benchmark. Build activity overlapped some samples; seasonal effects, wind and persisted wetness also vary. Do not interpret the Rain result as a proven performance gain.

| Condition | Before FPS | After FPS |
|---|---:|---:|
| Day | 60 | 51–56 |
| Sunset | 59 | 47 |
| Night | 60 | 49–59 |
| Rain (Day) | 47–50 | 55 |
| Winter (Day, following rain) | 59 | 55 |

After build activity ended, Night was sampled again at 59 FPS. Day submitted triangles remain 626k / 417 calls. Winter Performance fallback rendered at 60 FPS, 391 calls / 553k triangles. A sustained iPhone benchmark remains unverified; DREAM has measurable added rendering cost and is not certified at a locked 60 FPS.

All five modes were visually inspected: clouds replace the flatter sky overlay; moon occlusion and more varied stars appear at night; rain produces deeper air perspective; winter thins meadow plants while retaining seasonal snow. No newly observed shader errors after fixing a temporary GLSL variable-name collision during implementation. Asset registry is empty by design: actual authored-GLB visual/LOD certification awaits delivered assets.
