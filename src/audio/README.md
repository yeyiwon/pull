# Current seasonal music baseline: v0.5

The 24 seasonal × time slots now use the existing v0.5-v1 renders, **not final OST approval**. Home music, ambience and Moru/world/UI SFX remain v0.2. No Nuu runtime audio and no new audio generation.

- World → `AudioDirector` semantic ID → `musicBaseline.slots` → recording → encoded URL.
- `musicBaseline.ts` is generated from the supplied catalogue/render manifest. Asset replacement does not change world code.
- Source WAV hashes verified; AAC-LC 128 kbps exports under `public/audio/v05`. Source 44.1kHz frame endpoints retained for loop bounds. Runtime decode remains the existing 32kHz context.
- v0.5 transitions: next one-bar boundary, three-second crossfade. Existing weather music gain contains the recommended 0.65; it is not multiplied twice. Home retains its existing metadata/behavior.
- Only current/near-future music is requested; no 24-track preload. Existing decoded-memory budget and voice limits retained.
- Credits and original license notices are shipped at `/audio/v05/credits/CREDITS.md` and adjacent `licenses/`.
- Rebuild: `python3 scripts/build-audio-v05.py /absolute/PULL_Audio_v0.5_v1_Baseline`. Source files never modified. When rebuilding both revisions, run v0.2 first then v0.5. Previous v0.2 outdoor encoded files remain as reversible legacy assets but are not selected by the runtime catalog.
- Validation: all 24 routing slots, actual exported files, transition metadata and existing AudioManager lifecycle tests. Browser spring morning/summer night/Home routing verified. Human listening approval of all tracks and actual iPhone loop/latency remain pending.

---

# Current scope: Moru only

Nuu has been excluded from runtime and production assets. Current selection: 124 files / 35,969,432 bytes. The v0.2 integration notes below describe the earlier two-character checkpoint; Nuu-specific claims are historical. See `docs/moru-only-scope.md`.

# PULL Audio v0.2 runtime

The existing single Web Audio context, five buses, gesture unlock, visibility suspension, event observer and SFX voice lifecycle are retained. `AudioDirector.ts` maps actual season/hour/weather/location into a pure plan; `AudioManager.ts` schedules it. World components pass semantic IDs, never file paths.

## Production pipeline

Run `python scripts/build-audio-v02.py /path/to/PULL_Audio_v0.2` on macOS (built-in afconvert). Masters are read-only. Music/ambience/event cues: AAC-LC in M4A, 128 kbps music / 64 kbps ambience and cues. Short SFX: original small PCM WAV, avoiding encoder priming on foot contacts. No npm dependencies. AAC/M4A targets current Safari/iOS and mainstream browsers; no second codec is shipped. Load/decode errors are visible and retry with backoff, not a silent WAV-library fallback.

`public/audio/audio-production-manifest.json` records selected source paths, SHA-256, production paths, bytes, mapping, family variation and load policy. Generated `catalog.ts` contains runtime metadata only. 142 selected files: 26 BGM, 18 ambience, 90 SFX, 8 rare-event cues; 37,037,074 bytes. No 104 stems, previews, score/source code, legacy themes or unused wardrobe/terrain packs are deployed. The v0.1 deployment copies were moved reversibly to `/tmp/pull-audio-v01-deployment-backup`; the permanent v0.1 and v0.2 source libraries remain untouched in Documents.

## Loading and memory

- Before a trusted gesture: no audio fetch/decode.
- CORE: current master and active environmental loops; after start, jump/land/grass/tap hot families (all their actual variants).
- NEAR-FUTURE: one next-time-slot track in compressed memory only, after 10 seconds. No decode until selected.
- ON-DEMAND: other season/home music, weather loops, character reactions, water/door/UI/event cues.
- AudioContext requests 32 kHz; decoded buffers use the actual context rate. 80 MiB LRU target, with active loops protected; during a crossfade active PCM may temporarily exceed the target (bounded by 2 music + at most 8 ambience sources). Cached-byte diagnostics do not include browser internals or temporary decoder workspace. SFX limited to 8 including pending, footsteps to 2, event music to 1. Ambience decoding is sequential. Optional prefetch retains only one compressed track. Ended/faded nodes disconnect. Disposal aborts loads and closes the context; HMR also disposes the old singleton.

## Music and transitions

24 season/time + 2 Home selections use manifest hour boundaries. Same ID does not restart on weather, location mix updates, mute or visibility resume. Destination starts at the source's next 8-bar boundary; source-specific 2-bar crossfade uses equal-power curves. A pending destination is cancelled if the world changes before its start. An in-progress fade completes before the latest request transitions. Short house visits need not restart music. The user may hear the prior track for up to one phrase before a requested transition.

Master mix only on desktop and mobile. Weather uses manifest musicGain/lowpassHz, plus ambience; melody/rhythm cannot independently change in this mode. The source stem-role metadata remains in the production manifest for a future opt-in mode; there is no falsely labelled stem control. `seasonProgress` is accepted by the semantic input but does not randomly switch the current seasonal choice. The same phrase fade handles season boundaries. Metadata-driven random season blending and ambience-only rest scheduling are not enabled in v0.2 runtime.

## Environment and cues

- Seasonal ambience follows manifest season/time rules. Winter never loads summer insects. River proximity changes water gain. Indoors, outdoor layers fade down and low-pass to 1.1 kHz; room tone/window rain bypass that filter. No fireplace sound because no fireplace interaction exists.
- Grass/wood/snow/shallow-water footsteps use actual grounded movement distance, not key state or new animation markers. Bridge/home remain wood. Stone/wet stone/dirt/leaves are not guessed from the whole terrain.
- Real jump/land events; water landing splash, entry/exit; actual door threshold and indoor-entry events; existing short speech reactions and semantic expression changes; real Moru stretch/Wave and existing Nuu happy/curious behavior. Family metadata controls volume, ±linear volume/pitch variation, cooldown and concurrency; no-immediate-repeat uses the last played variant.
- Actual sky/weather onsets choose one rare musical overlay (not both overlay and loud world SFX). Current BGM continues. 30-second event cooldown. Discovery/wardrobe/handle/ripple cues without actual events are not fabricated.
- Existing Wave/Dance buttons use the v0.2 tap family; no blanket click sound.

## Gain and validation limits

Manifest music/weather gain is further staged at 0.65, master 0.8. A gentle peak compressor provides a final safety stage. The debug peak is periodically sampled, not an oversampled true-peak/LUFS certification. Human listening and physical iPhone/Safari verification are still required; PCM size and browser playback diagnostics are not a subjective listening test.

Use existing World preview for season/hour/weather/visits and Audio preview for current/target music, phrase countdown, sources, downloaded bytes, decoded cache size, sampled peak and errors. Tests cover source selection, 24 mappings, indoor/weather rules, no-repeat, surfaces, event independence, lazy unlock, scheduling cancellation, resume, voice/cache bounds and teardown.

## Verified in this pass

- `lint`, `tsc -b`, all 49 tests and production build pass. Large JS bundle warning remains unrelated to audio file encoding.
- Production folder and build each contain exactly the manifest's 142 audio files plus its JSON; 31,776,088 bytes compressed + 5,260,986 bytes short PCM. Source files remain present; no WAV masters were modified.
- AAC container inspection confirms valid-frame counts and priming metadata (e.g. spring morning 2,886,545 frames; winter night 4,233,600 frames). This is not a guarantee of imperceptible loop seams on every device.
- Browser initial autumn playback observed about 1.78 MiB core download, about 2.64 MiB with next compressed track, and 33.1 MiB decoded cache. Multiple preview transitions observed roughly 65–77 MiB cache; not the whole library. Reported peak around 0.18 in tested scenes; periodic sampling can miss peaks.
- Separate browser validation confirmed Spring Morning birds/breeze, Summer Night insects, Autumn Sunset wind/leaves, Rainy Autumn Night rain with same seasonal night BGM, Space jump cue, landing/event cue counts, shallow-water entry and Nuu curious reaction. Full physical-device listening, foot-contact visual synchrony and continuous walking/blocked-wall browser input remain unverified; movement-distance and surface rules are unit-tested.
- Final independent tab: Home Night played with room tone/window rain and outside filter ~1103 Hz; after exit Winter Night played with quiet air/subtle wind/crystalline and no summer insects. Observed `house_door_close_02`, `water_enter_water_01`, and `ui_tap_01`. Final sampled peak 0.180 and decoded cache 76.3 MiB after six scenarios. Only existing THREE.Clock deprecation warning; no error in that fresh tab.
- These visits used the existing developer location preview, not an end-to-end walk through the door. No dedicated illumination interaction was invented; the winter-night scene/ambience was checked, while its optional illumination SFX remains unbound.
