# moru-meadow-cluster — CANDIDATE, not approved

## Source inspection
- GLB 2.0, 34,656,840 bytes; SHA-256 `6765c1fee411127e669d62ae2a8ce9b68c2c771b16c693b716710e8cd548e281` (unchanged after QA).
- One node/mesh `output_unwrapped`, one triangle primitive, 113,662 exported vertices, **51,717 triangles**. Original authoring polygon/quad count is not retained by this triangle GLB.
- Bounds: min (-0.878737, -0.564063, -0.850668), max (0.895808, 0.592500, 0.858919).
- One double-sided BakedMaterial; embedded 4096×4096 base-color PNG and 4096×4096 metallic/roughness PNG. No normal map. Original geometry/UV/textures/materials preserved. GLTFLoader applies standard base-color sRGB and data-map handling.
- Two uncompressed RGBA8 4K textures with full mip chains would need approximately 171 MiB GPU texture storage (estimate, not measured GPU allocation).

## Registration and preview
- Registry review.status CANDIDATE, vegetation / VEGETATION_CLUSTER / MICRO, spring/summer/autumn, catalog only, no placements and no autonomy permission.
- densityCost 1 is provisional and is not an approval or Director budget change.
- Parser rejects CANDIDATE manual placement, non-empty placement lists or autonomy metadata.
- Development-only `?environmentPreview=moru-meadow-cluster` renders one temporary preview at x=2,z=1 beside Moru. It does not call consider/rendered or write WorldHistory. Production ignores this query.
- Scale .45 tested (0.799 × 0.520 × 0.769 world units), then .65 (1.153 × 0.752 × 1.111). Y offset = 0.366641 at .65 makes the source minimum touch y=0. No geometry/pivot re-export.

## Visual gate: NOT PASSED
- Reviewed Spring Day, Summer Sunset, Autumn Night and Night Rain, plus 390×844 portrait and 844×390 landscape.
- No obvious floating gap at the preview ground point; low bush scale is plausible beside Moru. No strong plastic highlight was observed.
- **Flowers are not reliably distinguishable at the normal third-person/mobile viewing distance, even at .65.** The asset reads as a dense dark shrub, particularly at night/rain. The base-color atlas contains predominantly green areas with only tiny pastel flower regions. This is not evidence of missing textures, nor proof that geometry alone is defective; silhouette/color allocation plus current world lighting/distance need further asset QA.
- Fine leaf breakup becomes noisy at this distance. Close-up individual blade shape and all view angles have not been fully validated.
- Approval cannot be justified from a successful load or triangle count. Recommend a clearer flower-to-foliage ratio and larger readable flower heads/simpler grouped silhouette in the asset, followed by the same in-world QA. Do not brighten the whole World or invent emissive flowers to force approval.

## Result
No cognition chain, REAL API test, autonomous placement, WorldHistory creation, placement persistence or conversation ownership claim was performed because asset approval failed. The mock research path is also deliberately simulation-only in existing history code; it was not bypassed.
Preview removal was verified by navigating to the normal URL: the cluster disappears and the original scene remains. This verifies preview cleanup, not autonomous-history rollback.

## Validation
Lint, client/server typecheck, 162 tests, production build passed; existing large-bundle warning remains. Asset guard passed for staged/outgoing history only. The new 34.7MB untracked GLB is NOT covered by that guard's pass; it would exceed its current 5MB limit if staged. No exception added and nothing staged.
No observed browser console errors. No commit, push or deployment. Original file remains unmodified and untracked.
