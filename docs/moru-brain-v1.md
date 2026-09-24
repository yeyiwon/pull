# Moru Brain v1

Production entry: `SpeechBubble` samples semantic world observations at 1 Hz and feeds `brain/mind.ts`. Head projection still renders each frame. The older v0 controller/provider remain compatibility references exercised by existing tests; production no longer imports them. The expression broker's independent ambient scheduler is disabled while v1 is mounted, so there is one automatic decision owner.

## Data flow

World state → `observation.ts` → internal state / novelty gate → semantic intent → existing action + speech broker → working / short memory.

Observed: actual phase/hour/date, season, weather, wind, indoor flag, river proximity, active rendered celestial-event state, movement/input, grounded/action status, visit return, real actions and accepted speech. No fabricated proximity sensor, object recognition or user avatar exists.

Normalized state: energy, curiosity, comfort, attention strength, affection, sleepiness. These interpolate slowly; attention target is separate (USER/SKY/WATER/HOME/WORLD/NONE). OBJECT is reserved and rejected without a sensor. User attention means social intent toward the viewer, not an avatar position. The current Meshy model has no facial controls; `listen`/`wave` express attention through available body clips, not precision head/eye tracking.

## Timing / priority

- Input and airborne states win; existing locomotion still cancels body actions immediately.
- Explicit user actions/conversation precede autonomous reactions. Conversation responses are invalidated by movement, suspension or disposal; the actuator checks live input again before execution.
- Important weather/sky events take precedence over social and ambient candidates. Daily event keys suppress repeated first-snow/rain reactions. Stale weather is discarded before a new phase observation is queued.
- Reactions have 32–62 second cooldown, broker speech adds its own silence-first budget, lines are suppressed for five minutes and repeated actions for 90 seconds. Ambient evaluations are probabilistic with variable scheduling. An empty or rejected expression is WAIT, never an empty body command.
- No autonomous dance, movement destination or new gameplay system.

## Action audit

15 current actions: idle, walk, run, jump; wave, listen, hop, skip, penguin; bubbleDance, funnyDance, loveDance, superloveDance, podGroove, youGroove. Classes: AMBIENT / REACTION / SOCIAL / DANCE. Automatic v1 candidates are wave/listen/hop. Removed Cherish, Dumbfounded and Talk are not mapped or loaded. No GLB or texture changes.

## Memory

Working memory: bounded recent actions, speech and observations. Short memory: up to 32 meaningful session events, with up to 256 novelty keys. Existing storage retains visit count/time and interaction totals; visits mildly bias affection. Optional LongMemoryPort supports future durable semantic memory; no autobiographical memory/database was installed. Short event memory resets on a new page session. Visibility return reuses the live session.

## Conversation hook

`ConversationAdapter.respond(text, context, AbortSignal)` is injected into the mind. Ambient never calls it. Direct text is limited to 280 characters, one pending request, and an eight-second request interval. Four-second timeout, invalid output or rejection falls back to a short local acknowledgement + Listening. No provider, endpoint, secret or external API is configured. Development form is local only; this is not a production chatbot UI or a semantic natural-language answerer.

Validated shape:

```json
{"kind":"REACT","attention":"USER","action":"wave","speech":"왔네.","emote":"heart"}
```

Only current semantic action IDs, available attention targets, known emotes and short single-line plain text are accepted. `{"kind":"WAIT"}` requests silence. No raw GLB names, DOM/HTML commands or model manipulation from generated text.

The development-only Brain panel displays states, observation, attention, WAIT/REACT, cooldown, recent actions/speech and decision trace. It can request a gated evaluation or submit local conversation text. Production does not expose it.

## Verification

85 tests pass, including 15 new v1 scenarios covering greeting, normalized gradual state, first-weather novelty, stale events, night/water/home attention, silence, repetition, movement priority, structured validation, no ambient provider calls, timeout/failure fallback, rate limiting and late response cancellation. Lint, TypeScript and production build pass; existing bundle-size warning remains.

Browser: fresh-session local conversation emitted Listening plus “같이 있을래?”; snow produced SKY/hop/“하늘 봐!” once in the observed session; night reduced energy and increased sleepiness, water raised comfort, idle yielded WAIT between reactions. Movement, Space jump and drag orbit still responded. Rain was observed and cooldown gating inspected. Probability means a specific observation may legitimately remain silent; deterministic tests cover successful first-rain selection. No new console errors observed after final reload.

Protected SHA-256 comparison: all Moru GLBs, audio assets/runtime, graphics/environment modules, and existing World/Character/locomotion/camera/house/bridge/water files unchanged. No external provider or real iPhone conversation test was performed; no commit.
