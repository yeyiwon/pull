# Moru Brain v3 — Phase 1

Passive local interest data only. No research, network calls, world mutations, autonomous actions or changes to conversation context.

- `interests.ts`: canonical topic IDs (`snow`, `reflection`, `leaves`) deduplicate differently phrased questions. Queue cap: 3. Initial bounded salience scores: .9/.8/.55. Repeated ticks do not accumulate interest weight.
- Sources: WORLD_OBSERVATION / SELF_ASSOCIATION / USER_CONVERSATION / PAST_MEMORY. `offer` is the local structured candidate boundary. Only world observation seeds are wired in this phase; conversation text and past memory are not automatically mined or sent anywhere.
- Snow weather, night near water, and autumn season produce questions. Autumn is not proof of observed foliage; night is not proof of a moon/reflection. Stored facts describe the actual available observation fields only.
- Fascination: persisted real-time 24-hour minimum. On an active observation after expiry, prefer a different open topic observed that world day, ordered by salience. Without another candidate, retain/renew the current one. Offline time triggers no simulated research. No random or per-tick switching.
- Journal: topic/question/observations/facts/inferences/unknowns/ideas/status. FACT / INFERENCE / UNKNOWN / IDEA have separate typed records. Questions stay UNKNOWN, inference and idea arrays initially empty. No fabricated research results. Each list is capped at 12; the current closed topic catalog limits journals to 3.
- Persistence: payload v2 under the existing `pull.moru.memory.v1` key. v1 migrates with an empty interest model and preserves visits, interaction counters and events. A future payload version is never overwritten by this client. Corrupt data is sanitized; denied storage falls back to session memory. Interest mutations save immediately; identical ticks do not write.
- Lifecycle: injected into the existing mind at its existing creation site in SpeechBubble; observation runs on the existing semantic tick, even during movement. No extra listener/timer. It cannot dispatch an action and is excluded from conversation snapshots/API payloads.
- Development Brain panel exposes only diagnostics. Production UI, character rendering, World, audio and REAL provider are unchanged.

Tests use injected clocks and storage; no real API requests are needed. Persistence is browser/origin-local, not account/device sync.
