# Lakeside dressing candidate

User reference: IMG_5971.dng, supplied 2026-09-23. Image and its prompt are an art reference, not a production background texture.

## Composition

Close flowers/shrubs and benches beside the broad promenade; spreading canopy overhead; intentional openings across the lake; overlapping mountains beyond. Warm ivory lamps with lavender spring fill. Season-specific foliage and wind-carried petals rather than uniform particles falling from the sky.

The reference's village, waterfalls, masonry, and ornate architecture are future asset requirements, not implemented by this dressing pass. Lake/path geometry, Moru, Brain, water, and audio remain unchanged.

## Current candidate

- 107 shared-geometry filler trees, including 77 blossom canopies in Spring; four shared Hero Tree A GLB instances.
- 122 authored meadow/shoreline planting regions; path, house and bridge exclusion checks.
- 24 existing lamppost GLB instances at runtime scale 2.2, four selectively active lights.
- Four differently positioned/scaled Mountain A instances; rejected Mountain B is not used.
- Eight existing Meadow GLB instances for near detail; instanced grasses, ferns, flowers, stones.
- Spring forsythia/dandelion silhouettes, autumn ginkgo/maple leaves, winter snow and limited tree illumination.
- Petals originate around trees and drift sideways; spring blossom selection is deterministic.

## Limits requiring actual assets

The layout-v3 candidate now uses NativeHouseShell with separate hinged door and actual wall openings, a larger two-floor shell, and an asymmetric closed service wing. The baked Hero House GLB remains archived/available to the earlier candidate and is hidden in layout-v3. Door state now explicitly tracks CLOSED / OPENING / OPEN / CLOSING. Door traversal tests pass at the enlarged scale. Upper floor and service wing navigation are not implemented.

Winter adds one 9m evergreen with instanced foliage, warm bulbs, ornaments and translucent ice decorations. One local light is used rather than individual lights for every bulb. Final visual quality still requires user review.

Petal/leaf motion currently remains a bounded parametric drift; a full spawn/velocity/ground-termination lifecycle is still outstanding from the broader cinematic spec.

No animated animal GLB exists in the current public assets (bird audio is not a model). Do not fabricate animals from placeholder primitives.

Filler trees remain procedural; they do not match the reference's sculpted hero canopy/stonework quality. Software WebGL screenshots do not establish iPhone FPS.

No commit, push, or deployment is authorized at completion of this pass.

## Validation (2026-09-23)

Lint, client/server typecheck, 177 tests, asset guard and production build passed. Build retains the existing large-chunk warning. Asset guard validates staged/history scope; no assets were staged.
