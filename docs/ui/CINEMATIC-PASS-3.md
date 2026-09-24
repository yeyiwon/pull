# Cinematic Direction — Pass 3 local candidate

## Applied
- Camera presentation helper distinguishes portrait, desktop and wide landscape framing. Seven-second input grace and six-second ramp; bounded 2.5–7cm look-target drift, no autonomous yaw/orbit. Movement, touch, orbit, conversation, menus, airborne, interior and reduced-motion preference suppress drift. Body facing supplies only a tiny presentation offset; no Brain attention state is changed.
- Removed global-origin rotation of all tree crowns. Per-instance leaf phase/tempo and gust replace synchronized sway. Distant island motion is slower/smaller, plant phases vary. Existing grass/cloud/water animation rates remain independent.
- Larger cloud formation sampling, portrait-visible partial Arc with cloud occlusion. Future Arc awakening and distant light uniforms default to zero; existing aurora/meteor/giant moon/celestial-rain hooks reused. No new scheduling or gameplay.
- Rain lowers direct-light/shadow contrast and strengthens relative fill; Night shadow contrast reduced without removing shadows. Porch lighting responds to night/rain, keeping existing light position and house layout.
- Menu remains thin glass; composer is more transparent with 3px blur; Moru context is floating typography/icons without a card or scrim tint. DEV Shift+H hides overlays for frame review; never changes World state.

## Verification
UI-free frame review at 1280×800, 390×844 and 844×390 for Day, Sunset, Night, Rain and Winter. Manual orbit, short W movement and Space jump checked; UI controls restored. No console errors in inspected tab. lint, client/server types, 157 tests, build and asset guard passed. Existing bundle-size warning remains. Real iPhone GPU/thermal performance not tested; no controlled FPS improvement claim. No REAL conversation/API tests.

## Preserved
Brain v3/research, GLBs, animations, audio assets, bridge placement and topology were not edited in this pass. Working tree contains pre-existing Pass 2 changes; do not confuse their diff from HEAD with Pass 3 changes. No commit/push/deployment.

## Quality gate / next replacement priorities
The candidate improves direction but does NOT pass the final animated-film art bar.
1. Home shell/roof/window facade remains assembled planar geometry; replace with a reviewed hero-house detail asset, retaining existing hollow interior/door adapter.
2. Hero vegetation: lumpy crown clusters, oversized simple flower stems and flat grass blades; replace with authored branch/canopy/petal/grass families.
3. Distant mountains/floating landforms: repeated rounded rock profiles and insufficient erosion/silhouette character; replace with authored background forms within current anchors.
4. Ground/path/bank: broad flat horizons and overly uniform transitions; replace visual dressing/material layers without changing river/terrain collision or bridge approaches.
5. Water surface: regular bands and insufficient localized bank/depth/reflection detail; improve optical/material treatment without changing river topology.
