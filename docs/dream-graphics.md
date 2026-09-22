# Dream Graphics Pass

- Procedural lunar sphere shading in sky shader: craters/maria, directional terminator, earthshine, atmospheric halo. Manual phase parameter / dev phase selector; not an astronomical calendar.
- Layered procedural clouds, night silver edges, varied star color/brightness, faint galactic band. DREAM dawn/morning/sunset sky-shaft approximation, not volumetric shadowed god rays.
- Original decorative ring redesigned as two thin incomplete Halo arcs. Collision matches the narrow remaining arcs; center stays traversable.
- Native Three.js EffectComposer / UnrealBloomPass / OutputPass, restrained HDR threshold 1.15, subtle seasonal linear-color tint. No new dependency/texture.
- Analytic contact-depth patches (not SSAO); performance mode hides them. PCF shadows, 1024/2048 quality sizes.
- Water: Fresnel, shallow/deep transmittance, warped procedural riverbed detail, elongated broken lunar highlight, sky/sun/warm-window approximation, rain and character ripples. No screen-space refraction, ray-tracing or full scene reflections claimed.
- Bridge: exact position/orientation/scale/plank coordinates, crossing, terrain and approaches retained. Only shared grain material + wetness/snow color changed. `terrain.ts` unchanged in this pass.
- Wet rocks/ground/roof, subtle meadow grain and wet patches; warm window fill.
- PERFORMANCE / BEAUTIFUL / DREAM; coarse-pointer defaults PERFORMANCE. GPU/resource disposal on changes. No depth-of-field, blur, lens flare, vignette, external HDRI or new asset pack.

Observed in 618×891 desktop in-app browser: all presets ~59–60 FPS. Bridge rainy-night view: DREAM 189 calls/259k triangles, PERFORMANCE 167 calls/254k triangles. BEAUTIFUL meadow 246 calls/267k triangles. These are spot measurements in different views, not iPhone or full-screen benchmarks; shadows, camera and visibility affect calls. Toggle bloom/contact/rays for development comparison.

Audio and graphics tests passed before Full Life character integration. Full final validation must be repeated after character changes.
