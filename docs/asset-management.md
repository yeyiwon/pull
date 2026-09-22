# Runtime assets and source archives

- Keep Blender, Rescue, Full Life, and full-model animation source files outside the repository. Current untracked eight GLBs are intentionally left untouched, and exactly ignored. Do not delete them.
- `public/moru/moru-walk.glb` is the visible Original Meshy model. All 15 `public/moru/clips/*.glb` files are runtime assets and must remain tracked.
- Previously tracked legacy models already on origin/main remain unchanged; this cleanup does not rewrite remote history.
- `.gitignore` is not a deployment filter: ignored files in `public/` still enter a local Vite build. Use a clean Git checkout for deployment. Archive relocation requires a separate explicit operation with hash verification.
- Before staging/pushing, run `npm run check:assets`. It checks staged content plus `origin/main..HEAD`, so a file added then deleted in an unpushed commit is still rejected. Use `npm run check:assets -- <base> <head>` to inspect another range or `--staged-only` for staged files.
- New blobs above 5,000,000 bytes require review. Only the known visible model path is preapproved; review replacements there too. Add other specific runtime exceptions only after deliberate review. Do not add `*.glb` or numeric-suffix blanket ignores.
- `.env.local`, real credentials, `.vercel`, Blender sources, Full Life/Rescue models, generated build directories and the eight source-only Moru paths are rejected by the guard. `.env.example` may contain empty/example values only. Pattern checks are not a comprehensive secret detector.
- Push only the reviewed branch ref. Do not use `--all`, `--mirror`, `--tags` or `--follow-tags` with old backup refs. The old integrated-baseline tag and checkpoints are preserved in the external pre-cleanup bundle, not the cleaned main ancestry.
- No git hook is silently installed. Run the guard as part of review; a future CI job can enforce the same command after fetching origin/main.
