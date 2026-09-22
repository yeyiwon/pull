# Moru Brain v3 — execution Phases 3–5

## Phase 3: semantic ideas and deterministic authority

`evolution/director.ts` turns a completed Research Journal idea/association into a semantic MICRO proposal. The first version uses a conservative deterministic mapping for the existing snow/reflection/leaves topics; it does not introduce another generative LLM call. It does not execute model text, paths, code or coordinates. The Director chooses reviewed catalog assets, bounded scale, four conservative meadow slots, and enforces season/area, protected geometry, manual placement clearance and a three-object global budget. The house, bridge approaches, river, hero view and existing obstacles are excluded.

Optional Registry `autonomy` metadata is explicit approval: semantic allowlist, areas, bounding radius/height and ground offset. Only catalog vegetation/rock/prop entries qualify. Existing entries without this metadata remain ineligible. No asset is fabricated.

## Phase 4: materialization and history

`history.ts` stores a stable change ID, proposal, provenance, lifetime, status and render acknowledgement. Accepted entries become PENDING, then ACTIVE only after the existing GLB loader mounts them. Missing/failed assets never count as successful creation. Removal and expiry retain tombstones. Saved transforms are re-resolved against the current Registry and Director; they cannot inject URLs or bypass protection. Persistent changes survive season transitions only when the current asset supports that season.

The existing Registry renderer is the only added rendering integration. Current production registry is empty: **actual outcome WAITING_FOR_ASSET; zero new objects**. Mock research may exercise proposals/history but cannot mutate the scene or become a claimed discovery. At most one creation reservation per 24 hours, including on return. History is bounded to 32 records; at capacity it conservatively refuses new proposals instead of deleting provenance.

## Phase 5: bounded elapsed-time continuity

Memory payload v5 migrates v1–4, preserving interests, research budget, visits and world history. Older payloads have no reliable lastSeenAt, so their first migration creates no offline events. Unknown future versions remain untouched.

Offline simulation runs once in the memory session constructor; active memory ticks update lastSeenAt. Under three hours produces no new event. Longer absences can continue a known fascination, revisit an existing REAL-provider association or idea; maximum three records, with elapsed time capped at 30 days. Empty interest state can remain uneventful even after long absence. Short reloads preserve the previous compact record without generating duplicates. Backwards/nonfinite clocks cannot fabricate progress.

All offline records carry ELAPSED_TIME_SIMULATION. There are no invented observation timestamps, weather, research calls or newly asserted facts. Completed model knowledge remains unverified model knowledge. Existing ideas can pass through the normal Director on return; no special offline mutation bypass exists.

Conversation sends only a bounded enum-based continuity projection for relevant questions. It separates waiting proposals, recorded past placements, removal and expiry, and labels offline reflection as simulation. A recorded APPLIED event is not proof that the asset is currently visible. Empty history must not become an invented story. No production journal UI was added.

## Validation

Phase 3 gate: client/server typecheck and 143 tests.
Phase 4 gate: client/server typecheck and 149 tests.
Phase 5 gate: client/server typecheck and 154 tests.
Clean checkout: 152 tests (excludes two existing untracked source-asset tests), lint, client/server typecheck, production build and staged asset guard.
End-to-end fixture covers observation → Mock research → idea → WAITING → history → reload → offline continuation → validated grounded Mock conversation. Approved-asset render acknowledgement, rejection, density, reversal, expiry, persistent season support and removal are deterministic fixture tests.

New REAL OpenAI calls for Phases 3–5: **0**. Existing server-side provider, production research lock and cooldown/budget remain intact. No environment variables, character/audio assets, layout or graphics were changed. No commit/push/deployment.

## Limits

No approved production MICRO GLB exists. Real added-asset appearance/ground alignment still needs validation when reviewed assets are registered; fixtures do not establish art quality. localStorage is device/browser-local, not cross-device or multi-tab transactional storage. There is no background service, web research or actual offline LLM processing. Existing large-bundle warning remains.
