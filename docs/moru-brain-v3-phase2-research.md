# Execution Phase 2 — Autonomous Research

This execution phase overrides the master's numbered phase map. No Idea Engine for creation, proposal/director, registry placement, World mutation, offline simulation or web research is installed.

## Flow

Existing 1Hz observation → current fascination + matching open journal → research eligibility → independent MoruResearchProvider → validated result → durable journal progression.

`src/research/model.ts` contains structured result/context and provider contract; `controller.ts` owns eligibility, continuation, abort and budgets; `provider.ts` is the browser transport. `server/moruResearch.ts` is a separate server-side handler, mounted locally and exposed through `api/moru-research.ts`. Conversation and research use separate instructions and request schemas.

Research state is PENDING / RESEARCHING / COMPLETE / UNRESOLVED. The last result's bounded unknowns/inferences seed a later inquiry into the same topic. Associations are data, not automatic new topics or world actions. One result per topic is retained; this is a bounded journal, not an unlimited transcript.

## Epistemic boundary

The four result arrays are FACT / INFERENCE / UNKNOWN / IDEA categories. `research.result.facts` are **unverified MODEL_KNOWLEDGE claims**, not source-backed or observed World facts. Confidence is only LIKELY / UNCERTAIN / UNKNOWN; needsExternalResearch records missing verification/current evidence. Existing journal.facts remains actual local observation evidence. MOCK results contain no factual claims, retain UNKNOWN and never appear as a real discovery in Conversation. Model knowledge is not web research.

## Budget and concurrency

- One attempt per page session (shared across StrictMode remounts); two attempts per UTC day persisted with the existing memory.
- Global 30-minute cooldown, per-topic 24-hour cooldown after an attempt, including failure.
- Failure blocks further attempts in that page session; no automatic retry loop.
- Movement, active action or direct conversation interrupts pending research; stale completion cannot overwrite the journal. Idle ticks only check eligibility, never poll a provider.
- Session count includes MOCK and REAL operations conservatively. No new billable call is needed for ambient speech.
- Server REAL handler permits one attempt per process lifetime. This is **not a durable distributed quota**. Production REAL research is therefore disabled in code until authenticated/durable limits exist.

## Activation / privacy

`MORU_RESEARCH_PROVIDER=REAL` is a separate server-side local-development opt-in. It is NOT inherited from MORU_PROVIDER=REAL. Default is MOCK. Existing MORU_OPENAI_MODEL and MORU_OPENAI_REASONING_EFFORT are reused, with no hardcoded model. No environment file was changed for this phase. The one authorized real test uses an isolated local handler/controller with a one-shot settings override; it does not enable ongoing research or production REAL mode.

Outbound research fields are only topic, question, up to three allowlisted semantic World observations and up to two prior inferences/unknowns. No user conversation/history, personal memory, files, browser state or arbitrary World objects. No tools/search/URLs are used. Error logging uses existing sanitized development diagnostics with callType and selectedProvider, never raw prompts/secrets/provider messages. Failed research remains unresolved rather than silently replacing it with a successful Mock result.

## Persistence / conversation

Memory payload v3 migrates v1/v2, preserving visits, interactions and interests. Persisted RESEARCHING is restored as UNRESOLVED (interrupted), not completed. Daily allowance and cooldown survive reload; future versions are not overwritten. Storage is per browser/origin, no cross-device sync or guaranteed hostile multi-tab quota.

Conversation includes currentFascination / activeResearch / one recentDiscovery only for relevant user questions. Real discoveries retain MODEL_KNOWLEDGE and confidence labels. Existing conversation allowlists and structured schema remain unchanged; full journals and associations are not sent. Interest data does not automatically generate a spoken research report.

No UI was added: the existing development Research Journal JSON exposes progression/results. User controls, World, audio and graphics are unchanged.

## Verification (2026-09-22)

- Working-tree suite: 139 passed; clean checkout: 137 passed (two unrelated untracked asset-source tests excluded). Includes emitted Conversation + Research API handler execution without network access.
- Lint, client/server typechecks, clean production build and changed-file asset guard passed. Existing large client chunk warning remains.
- Browser fresh-origin Mock lifecycle reached COMPLETE and stored UNKNOWN + association data. Earlier development-origin UNRESOLVED attempts/cooldowns were preserved, not reset to force another call.
- Exactly one isolated REAL request used the observed autumn/SUNSET/clear/field seed and leaves fascination. Model gpt-5.6-luna, reasoning none, HTTP 200, 4699 ms, schema valid, no fallback or retry. Research controller recorded one session/daily attempt and COMPLETE.
- Result linked leaf pigment changes with seasonal signals while explicitly leaving actual PULL leaf appearance/species unknown. Confidence LIKELY, needsExternalResearch true. These remain model claims, not verified botany or observed World changes.
- The REAL test result is not silently inserted into the user's browser save. Ongoing browser research stays MOCK. No production activation, commit or push.
