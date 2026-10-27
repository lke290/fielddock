# FieldDock v4.19.18 — completion persistence

## Root cause, reproduced before editing

The save and sync paths compared the raw PocketBase token before/after authenticated requests. ensurePbAuth refreshes the token on protected requests; a changed token for the same user is normal. Reproduction through the actual auth/request functions showed:

- Rotation during the pre-save GET: zero POST/PATCH requests; cached stage remained false/no date.
- Rotation during PATCH: one successful write, but its confirmed response was discarded and the cached stage stayed false/no date.

The checkbox change handler immediately checked/disabled the native checkbox. Silent early returns skipped cleanup/rendering, leaving a grey disabled tick without a date. Refresh then either revealed the committed record or restored unticked state. Stage boolean/date field mappings were correct. Photo requests and the service worker were not needed to reproduce either failure; the worker bypasses cross-origin and non-GET requests.

## Change

- js/01-app-core.js: completionAccountId and syncPocketBaseCompletion use authenticated user identity, not token equality. Completion reads begun before a newer confirmed update cannot overwrite it.
- saveCompletion keeps explicit save/error state outside the rendered DOM, serializes completion writes per account/project, deduplicates repeated requests for the same stage, reads only the edited door before saving and sends only its stage boolean/date. Ownership checks remain enforced by the unchanged backend.
- The checkbox remains at its previous confirmed state while Saving… is visible. Only a valid PocketBase response with the requested stage/date is committed to local data. Undo clears the date using the existing API mechanism.
- Failures retain the last confirmed state and display a persistent inline error. A fresh read reconciles a possibly lost response with actual server state; the warning remains visible. No automatic write retries that could duplicate completion records.
- renderCompletion rejects obsolete renders and preserves pending/error state across card recreation. Handlers capture their project and are attached once to newly rendered elements.
- css/03-polish.css: scoped completion-only confirmed blue indicators and pending/error feedback; focus and read-only visibility preserved in light/dark themes.
- index.html: visible build label v4.19.18. sw.js and its registration/version/cache logic intentionally unchanged.

No backend files, schema, rules or production records changed. No animation prototypes were changed or included.

## Checks

- tools/validate.cjs: JavaScript syntax, authentication and unchanged frozen-baseline regions; adjusted only for the reviewed completion UI/build changes.
- tools/completion-persistence-regressions.cjs: actual checkbox events through the real pbRequest/pbFetch/ensurePbAuth functions, rotating tokens on every request; all three stages and dates, reload, pending during rerender, own undo, offline/HTTP rejection rollback, repeated taps, lost response, historical records, permissions, late reads and real account switching. Installed Edge, 390px and 1440px, root and /fielddock/ paths.
- tools/completion-persistence-api.cjs: actual frontend-to-PocketBase 0.40.4 integration against the explicit isolated database copy on port 8091; actual server restart, browser reload, dates/owners, own undo and Supervisor undo across all stages; Joiner B read-only. Never targets production.
- Existing dashboard/Back/search, Orders absence, Notes, Calendar, photo ownership/upload/display/session, snags, Hardware and separate completion reports passed.
- The pre-existing Site/Tools menu interpolation assertion is tracked separately from these tests; no animation changes are part of this release.

## Phone release

This change is prepared locally, not committed/pushed/deployed by this task. Publish the frontend through the existing lke290/fielddock main → GitHub Pages workflow. Runtime files are index.html, js/01-app-core.js and css/03-polish.css. Keep the tests and this report in source control when releasing. Do not include abandoned prototypes. No PocketBase copy/migration/restart or Cloudflared changes are needed.

Reload/reopen the online PWA and verify its header/footer says v4.19.18 before testing. On two Joiner accounts: complete each stage on disposable test doors, check Saving… followed by blue/date, reload both phones, verify ownership, undo your own stage and verify date clears. Disable connectivity for a new save: it must keep the previous confirmed value and show an error; restore connectivity and retry. Supervisor must retain override.

## Next two separate bugs — deliberately unfixed

1. Orphaned-photo URLs: old/missing JPGs return 404 under /api/files/. Investigate storage/reference integrity separately; do not delete or backfill records as part of this completion fix.
2. Service worker Response.clone body-used error at sw.js?v=4.19.11:45. Inspect the asynchronous cache-put/clone lifecycle separately. The source worker was not edited here.
