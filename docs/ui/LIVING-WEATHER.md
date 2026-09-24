# Living Weather v1 — local candidate

## Data boundary
Existing WeatherContext states remain the source of truth: clear, partlyCloudy, cloudy, rain, snow, fog, storm. No external weather provider is connected; null canonical weather currently resolves to clear. Menu/debug preview lives separately in weatherPresentation.ts and never writes livingWorld.weather. Brain observation receives canonical weather and its normalized profile wind (windSpeed units are not specified by the existing interface). No Brain decision/research feature was added.

## Presentation
Weather profiles control cover, wind, haze and rainfall. Cover eases first; rainfall is gated by cover; wetness follows rainfall and dries slowly. Existing meadow/path/bank/stone/bark material responses consume that wetness. Snow uses gradual accumulation/melt, existing upward-facing surface masks and canopy reduction; no new thick snow meshes. Cloud cover reduces direct light/shadow contrast while preserving sky fill. House porch light gently reinforces refuge during rain/snow. Water retains its original shader and moon path, with softer/darker reflection and reduced ripple amplitude in rain. Rain streaks are thinner, shorter, less opaque, and slightly varied after browser inspection. Vegetation uses existing per-instance phase/tempo with weather-specific wind.

## Verification
- lint, client/server typecheck: passed.
- 161 tests passed, including canonical/preview isolation, staged rain/wetness and snow wind ordering.
- Production build and asset guard passed; existing >500 kB chunk warning remains.
- Browser captures reviewed at 1100 × 750: Clear Day, Rain Day, Rain Sunset, Clear Night, Rain Night, Snow Blue Hour, Snow Night, Cloudy Golden Hour, Clear Morning. Same camera controls were retained; existing autonomous Moru movement/follow can shift framing slightly. Snow/wetness deliberately linger across previews, so later clear captures are not a reset-to-dry comparison.
- Night Rain preserved Moru/house/moon-path readability; Night Snow did not wash the scene white. Arc becomes subdued under overcast rather than remaining a bright marker.
- Final runtime console error sample: none.
- Night Rain development HUD samples: Performance 60 FPS / 404 calls / 549k triangles; Beautiful 60 FPS / 428 calls / 593k; Dream 60 FPS / 429 calls / 611k. These are short desktop samples, not a sustained benchmark or physical mobile measurement.
- Restored Real Time, automatic weather, Beautiful quality and viewport defaults. No REAL API test, commit, push or deployment.

## Remaining limitations
- Rain streaks still repeat within a small instanced field and are not physically simulated drops/splashes.
- Snow is surface shading/canopy suppression, not volumetric accumulation on every asset; transitions can resemble gradual desaturation.
- Water ripple/reflection is procedural; no geometric drop impacts or true environment reflections.
- Existing distant silhouettes and near vegetation remain procedural and visibly simplified. Weather does not solve that asset-quality limitation.
- Day rain haze can flatten distant formations. Shadows use the existing realtime shadow implementation, not physically broad area-light penumbrae.
