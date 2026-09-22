# Moru Brain v2 — direct conversation boundary

Local Brain v1 still owns ambient decisions. Only ConversationInput/debug direct submit → session.send → ServerConversationProvider reaches `/api/moru-conversation`. No timer or ambient tick calls the endpoint. No new dependencies, model edits or graphics/audio changes.

## Enable when ready

Production defaults stay MOCK. Local REAL activation was subsequently verified; see the checkpoint below.

Local: add these names to `/Users/yeiwon/Developer/pull/.env.local` (preserve existing entries), then restart `npm run dev`:

```
MORU_PROVIDER=REAL
OPENAI_API_KEY=<your server-side key>
MORU_OPENAI_MODEL=gpt-5.6-luna
```

Never use a `VITE_` prefix for the key. `.env.local` is ignored; `.env.example` contains blank/example values only. Do not paste the key into chat or the browser. Vite loads it only into its server plugin; the client never imports server modules.

Vercel: Project Settings → Environment Variables, set the same three names for the intended environment, then redeploy. `api/moru-conversation.ts` is the Node Web Handler; the SPA rewrite excludes `/api/`. Static `vite preview` alone does not run this function and the client falls back locally. No deployment was performed or verified in this task.

Development inspector: AUTO/REAL use server configuration (neither bypasses server MOCK); MOCK bypasses HTTP entirely. The last effective provider is shown. Server configuration is authoritative in production.

Before enabling REAL on a publicly accessible deployment, configure deployment access protection or a distributed rate limit/WAF rule and provider budget. Current 12 requests/minute and 2 concurrent requests are **per function instance**, not global authentication or a hard billing cap. Origin checking prevents ordinary cross-origin browser requests but is not authentication. No user accounts were added in this pass.

## Data boundary

`transport.ts` picks current submitted text (280 chars), only this session's last eight user/Moru turns, season/timeOfDay/weather/location/indoor/nearWater, six internal numeric states, and up to eight actual local event labels. It strips event keys/times, coordinates, dates, attention targets, logs and all unrelated properties. The server reconstructs only this allowlisted shape and limits the body to 12KB. No files, browser information, other sessions or persistent user memories are included in the OpenAI payload. The HTTP service necessarily sees normal connection metadata, but none is added to the model prompt.

Internal state becomes low/medium/high. Recent event labels describe observed local reactions; a `curious` label does not prove a meteor or another specific event. No new historical event is inferred. Context is client-world data, not a server-authoritative simulation; prompts reduce hallucination but cannot guarantee a model never invents a detail.

OpenAI Responses API uses a strict JSON schema, `store:false`, 350 max output tokens and no tools. Only the fixed OpenAI endpoint is used. There is no runtime default model. `MORU_OPENAI_MODEL` is required for REAL; absent, empty or whitespace-only values keep MOCK even when a key exists. `gpt-5.6-luna` above is the user-selected development example, not a hardcoded fallback. Changing this value changes only the API model field, not Brain/context/response schema. The selected model must support Responses API structured outputs; actual account availability and compatibility have not been verified with a live call. Another provider can replace the server request implementation behind the same client interface.

## Response / fallback

Speech is 1–120 chars. Actions come from existing gesture registry (wave/listen/hop/skip/penguin), no dance. Emotions: calm/happy/curious/sleepy/warm. Attention: USER/SKY/WATER/HOME/WORLD/NONE, constrained by indoor/near-water state. Emotes: heart/sparkle/question/surprise/music. Optional fields may be null. Invalid optional fields are discarded; invalid speech falls back. Both server and client use existing parser, and character execution still checks current availability. Emotion/attention remain semantic; no new facial rig or physical look controller is claimed.

Server aborts at 9s, client session times out at 11s. Missing key or model → server Mock; provider error/refusal/malformed response → server Mock; offline/HTTP failure → client Mock; outer timeout → short local fallback. Close/Escape aborts the client request and releases Brain hold; existing reply lifetime closes the session normally. No retries, paid ambient calls, persistent storage or aggressive cache. Production has no raw conversation logging. Development context inspector remains local.

## Verification

Lint, TypeScript build, production build and 104 tests passed. Tests inject provider responses and cover allowlists, payload minimization, context/world fidelity, bounded history, malformed/overlong/refusal output, timeout, abort, no key, offline fallback, concurrency/rate guard, and Local Brain hold/resume. Client bundle scan found no key variable, OpenAI endpoint or server identity prompt. Browser desktop and phone-sized viewport checks are documented in task report; no real API quality/latency, hosted Vercel route, or physical iPhone keyboard verification was performed.

References: [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Vercel Web Handlers](https://vercel.com/docs/functions/functions-api-reference).

## Client / API compilation

`tsconfig.app.json` owns the Vite browser graph (DOM + vite/client types).
`tsconfig.node.json` owns Vite tooling. `api/tsconfig.json` owns the deployed
Node Function and its server/shared imports (ES2022, NodeNext, Node types).
The root solution references all three, so `npm run build` checks each graph.
Use `npm run typecheck:client` and `npm run typecheck:server` independently.

Vercel finds `tsconfig.json` from the API entrypoint; root project references
alone do not supply its compiler options. The API config intentionally contains
explicit target/module options, including for builders that supply defaults
before resolving extended configs. `@types/node` was already installed.

Shared TypeScript imports retain `.ts` for the existing native Node strip-types
tests. `rewriteRelativeImportExtensions` emits `.js` imports for Node ESM rather
than merely suppressing extension errors with `allowImportingTsExtensions`.
The server targets ES2022, including `Array.at`, without changing the browser
target. `tests/apiBuild.test.mjs` checks entrypoint config discovery, emits the
API graph to a temporary directory and executes the emitted handler with MOCK
forced and network access rejected. No secret or real API call is needed.

The API `rootDir` explicitly includes the project root because its graph spans
`api`, `server`, and shared `src` modules. TypeScript 6 otherwise defaults to
the config directory during emit. The regression test must not override this
source-layout option: it uses the deployable config itself, changing only the
output location and enabling emit.

## Initial REAL activation (2026-09-22)

Recommended initial configuration: `MORU_OPENAI_MODEL=gpt-5.6-luna` and
`MORU_OPENAI_REASONING_EFFORT=none`. Luna supports this setting; its documented
default is medium. Explicit none avoids spending the short response budget on
reasoning. Effort is optional and server-only; remove it when switching to a
model without this capability. Model support is still verified on the first
real request, not inferred from a name. No temperature parameter is sent.

Set the three existing variables plus optional effort in local `.env.local`
first, preserving existing entries. Use `MORU_PROVIDER=REAL` only for the local
conversation trial. Never paste a key into conversation or commit it. Restart
Vite after editing. Production remains MOCK until local validation succeeds.

Initial readiness inspection found no API key. The user subsequently configured
the local environment and the first REAL request succeeded (see checkpoint).
Production activation remains separate. Token usage is not currently exposed
by the provider; no broad Korean quality evaluation has been completed.

Trial order: greeting, current activity, world impression, leaving for home;
repeat current activity three times total, then vary actual debug world states.
Only explicit conversation submits may call OpenAI. Confirm REAL (not FALLBACK),
allowlisted response, gesture/text timing, and 9s server / 11s client timeout.
On authentication, model/schema, rate-limit, latency or grounding failure,
inspect the cause before expanding the implementation.

Before enabling production, add access protection or an effective distributed
rate limit: the current instance-local 12/minute, 2-in-flight limit and Origin
check are not user authentication or a global cost cap.

Sources: [Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna),
[nano](https://developers.openai.com/api/docs/models/gpt-5.4-nano),
[4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini).

## Development failure diagnostics

Vite's development API logs one sanitized `[moru-conversation]` record per
handled request; API responses and the production Function contain no diagnostics.
The production handler has no sink, and NODE_ENV=production also disables one.
Each record contains key presence only, model/effort, timestamps, total/provider
latency, attempted provider invocation, HTTP-response receipt, provider status,
local status, error type/code, timeout/cancellation, failed stage and rejected
field names. `reachedProvider` means fetch was invoked, not proof that OpenAI
received the request; `responseReceived` and `status` record an HTTP response.

Stages distinguish local adapter, request validation, configuration, local rate
limit, provider transport/HTTP, response decoding, JSON parsing and structured
validation. A local 503 therefore cannot silently masquerade as an OpenAI error.
Error messages are fixed local descriptions: upstream messages, exception
messages/stacks, headers, keys, prompts and response text are never forwarded to
the diagnostic sink. Invalid optional semantic fields still use existing
allowlist behavior, with only their field names reported. Fallback behavior and
9s/11s deadlines are unchanged. Diagnostic sink failures cannot break replies.

Tests use injected responses only, including HTTP 400/401/403/404/429/5xx,
transport failures, timeout, malformed output, validation rejection, malicious
error strings and local adapter construction failure. Automated tests never call OpenAI.

## First successful local REAL checkpoint

2026-09-22: default browser fetch is wrapped as `(input, init) => fetch(input, init)`.
Saving native fetch on the provider and invoking it as an instance method caused
`TypeError: Illegal invocation` before any HTTP request. Custom fetch injection
is preserved. A browser adapter probe reproduced the failure; a direct,
non-provider probe reached the same Vite middleware with HTTP 200.

After the fix, one explicitly authorized local conversation request completed:
client → Vite middleware → shared handler → OpenAI Responses, HTTP 200 at both
boundaries, model `gpt-5.6-luna`, reasoning `none`. Provider latency was 4,289ms;
client response validation completed at 4,310ms. Provider was REAL, not FALLBACK;
no rejected fields, timeout or cancellation. Output was consistent with the
current DAY / clear / field context. This is one successful sample, not a
completed personality/quality evaluation. No conversation text or key is stored
in this checkpoint. Production secrets and activation were not changed.

Development-only routing trace and non-provider probe remain available in the
Moru Brain inspector. The normal conversation button is used for personality
review on the local development server. Production has no diagnostic sink,
client trace collection or probe UI. No automatic OpenAI requests are added.
