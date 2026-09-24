# Accounts + Cloud Persistent World v1

## Provider decision

PULL uses Supabase Auth and Postgres for the first cloud persistence version. The existing app already has structured, versioned World and Moru state. Postgres plus row-level security keeps ownership enforcement at the database boundary and leaves room for later World Object, device-token, and scheduler tables without putting an administrator credential in Web or Capacitor.

The browser and iOS app receive only the Supabase project URL and publishable key. OpenAI credentials, service-role keys, and APNs credentials remain server-only and are not required by this client persistence path.

## Data ownership

- One authenticated user owns one `pull_worlds` row.
- The World owns one current World state and one Moru identity row.
- Moru owns one current Intelligence state plus append-like Experience and Memory records.
- Appearance follows the same Moru. Graphics, theme, audio volume, and control preferences stay device-local.
- Existing `Memory v7` and `Background World v1` payloads remain the runtime schemas. Cloud schema version 1 wraps them instead of replacing them.

## Sync policy

Local storage remains the fast runtime cache. Cloud is authoritative once an account is connected. Sync runs after authentication, on foreground/background and connectivity changes, on a low-frequency visible timer, and on manual request. Unchanged payloads do not write a new cloud revision.

Current mutable state uses optimistic revisions. When another device advanced the cloud revision, that cloud state wins and monotonic records are merged. Experience records are idempotent by full semantic content, even when older devices produced colliding or different local IDs. Preferences and familiarity are rebuilt from the deduplicated Experience set so retries cannot inflate evidence.

World simulation uses a separate optimistic `simulation_revision`. Only one device can advance a given cloud simulation revision. A losing device reloads and reconciles rather than committing a second elapsed-time advance.

## Offline and account isolation

Offline play continues against local storage. Reconnect reconciles and uploads pending changes. Each account has a separate cache namespace. Signing out restores the pre-account guest snapshot, preventing one account's World from appearing in another account session.

## Required external configuration

1. Create a Supabase project and apply `supabase/migrations` with the Supabase CLI.
2. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` locally and in the existing Vercel project. These are project identifiers/public client configuration, not administrator secrets.
3. Configure Auth site/redirect URLs for localhost, the production PULL URL, and `com.yeiwon.pull://auth/callback`.
4. Keep service-role, OpenAI, APNs, and other private credentials out of Vite variables and the iOS bundle.

Account deletion and remote push scheduling are outside this version. Logout never deletes cloud data.
