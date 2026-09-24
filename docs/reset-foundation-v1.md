# Reset Foundation v1 — local candidate

Source: `3d09281af3b18deb080f21787262362b28e4c723` (2026-09-22 18:41:59 +0900), the parent of the first bulk environment GLB commit `22a6e20`. Its environment registry was empty; the following commit introduced six environment GLBs. No whole-project reset was used.

The existing recovery commit is `c36e87145c574877b6bac6565da5e2464ea65221`. No additional backup commit was created. Main remains at `22a6e20`; no push/deployment.

## Selective restoration

Restored Environment, MoruHome, HomeCraft, FantasyGrove, procedural HeroMeadow, heroLayout paths, Waterway, RiverbankArt, WorldAccents, SeasonalDetails, environmentShaders, worldLayout and collision/terrain from the source. HeroMeadow is generated/instanced vegetation, despite its historical name. HOME.scale=1 adapts the original house to the current coordinate helpers. The current celestial Arc remains non-colliding. The lake-width helper remains only for archived candidate-layout code/tests; live terrain uses the original channel.

Removed live RegisteredEnvironment/EnvironmentAsset mounts, Hero mode initialization, Hero preview UI/shortcut and Hero camera adjustment. Runtime Registry is empty; Brain proposals can remain WAITING_FOR_ASSET. Existing WorldHistory is not erased and former GLB placements are not rendered. Generic authoring/review code is retained but not imported by the runtime scene.

Environment GLB files remain untouched locally and in the existing recovery history. They are excluded from the production public-file allowlist. Moru body and all 15 animation clips remain included. Build output contains no environment GLB.

## Fixes

The porch slab's upper face was Y=0, coplanar with terrain. It now ends at Y=.04; the house floor ends at Y=.03. The later native-house visual is no longer mounted. This removes the identified depth conflict without bloom/exposure changes.

The Action flex hierarchy now has bounded width and min-width:0; the dance row scrolls inside the panel and special actions wrap. Existing action behavior remains unchanged.

## Verification

Lint, client/server typecheck, 179 tests, asset check and production build pass. The existing large-JS-chunk advisory remains. Protected 67 Moru/Brain/Conversation/API files match pre-change SHA-256 values. No REAL API was invoked and no environment secrets were read or changed.

Chrome software WebGL: Moru body + 15 clips requested, zero environment GLB requests, no page errors or HTTP failures. Representative frame: DPR1, 356 draw calls, 546936 submitted triangles including render passes. This is not an iPhone FPS measurement. Mobile profile remains PERFORMANCE (DPR1, shadow1024, reduced vegetation/particles, no bloom). Desktop1280, portrait390 and landscape844 action bounds were checked; fresh portrait has layout/visual viewport390 and an internally clipped horizontal dance strip.

Public allowlist: 246493302 → 84100502 bytes, saving 162392800 bytes (65.9%). Final dist ~85.5MB. Local archived source assets remain in public but are not loaded or shipped. Browser screenshots are in /tmp/pull-reset-world.png and /tmp/pull-reset-mobile-fresh.png.

## Deployment readiness

Existing API route still uses createConversationHandler(process.env). Before a separately authorized production activation, verify server-side OPENAI_API_KEY, MORU_PROVIDER=REAL, MORU_OPENAI_MODEL and optional MORU_OPENAI_REASONING_EFFORT in Vercel Production. Actual production variable configuration was not inspected or changed. No hardcoded model/key and no client secret were introduced.

Outstanding: physical iPhone memory/FPS verification and moving-camera confirmation of the reported flicker. Static WebGL frames and geometric separation were verified; sustained on-device stability is not claimed.
