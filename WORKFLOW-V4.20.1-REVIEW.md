# FieldDock v4.20.1 — local correction review

Status: ready for review, local/uncommitted only. Production remains on v4.20.0, commit 6e23c20974bafa5fb399ae1dfb022df284cf525a. No commit, push, deployment, production migration, production record write or production service restart was performed. Existing untracked prototypes/diagnostic scripts were left untouched. Only the isolated loopback test backend was started/reloaded and then stopped.

## Root causes and corrections

1. To-do management: v4.20.0 rendered New To-do without a management check, and both todoCanEdit and the server allowed the creator to edit. This gave Joiner creators edit/reassignment rights. Creation and description/location/priority/assignment changes now require global Supervisor/Admin authority. UI entry points and handlers use that same policy. Existing Joiner-created tasks are retained, but their Joiner creator no longer gains editing rights. Existing assignment/completion/reopen rules, membership-based visibility, authenticated completer/time and pending/error feedback remain unchanged. Mixed forbidden-edit/completion requests reject atomically.

2. Snags: completion cards always rendered Report snag and its opener did not check role. Existing project/schedule JSON rules can authorize a global Joiner with a project-Supervisor membership. The workflow hook now separately enforces global Supervisor/Admin creation and detail/removal permissions for site_lists_json, general_snags_json and snags_json. It rejects append/replacement/duplicate-row and legacy typed-item bypasses. Joiners retain existing permitted completion transitions; no collection permission is broadened. Native Report controls and equivalent import controls are hidden, and the native creation helper rejects Joiners. The separate legacy snags collection already has a management-only create rule; its Joiner rejection was tested and its rules were not changed. Authenticated actors, references, completion dates and Note provenance remain server-controlled.

3. Note processing: v4.20.0 unconditionally displayed Process and its custom route allowed member-owned Notes. Both personal/shared processing controls are now management-only; the processing route rejects Joiners before any target/reference/processing metadata is written. Joiner personal Notes remain normal persistent Notes. Supervisors/Admins retain existing access-limited processing, including original Note attribution and idempotence.

4. Account navigation: login refreshed Dashboard content but did not activate Dashboard, discard transient editors or scope browser history to an account/session. A successful login now resets to Dashboard; account changes/logout also clear transient To-do/Note drafts, viewers, dialogs, pending photo-selection identifiers, searches and expansion state. Project/schedule/completion caches are not indiscriminately deleted. History entries carry account/session identity, so Back cannot reopen the previous session's pages. Scoped request generations prevent old To-do/Note responses from restoring previous-session UI; token refresh for the same account does not reset navigation.

5. Drawings: the old card repeated the filename in its title, PDF placeholder and footer, then required a separate Open button. A native button now wraps the primary card/title content; redundant PDF placeholder/Open controls and repeated filename are removed. Meaningful title/filename, level, revision, upload date, image preview and management actions remain. Protected cloud and local Blob opening still use the original handlers. Tab/Enter and a visible FieldDock-orange focus outline are tested. A small request-generation/account guard prevents an older drawing response from overwriting the latest render after account/render changes.

6. Personal Note dates: the row combined an Updated date with a second creator/date stamp. Rows now show the update date once plus creator initials. The editor still exposes creation attribution, and no stored date is changed.

7. Snag timestamps: provenance templates printed origin.created_at directly. Snag and To-do provenance now use the existing friendly date formatter. Audit values, source text, IDs and timestamps remain unchanged in storage.

## Files changed

Application:
- backend/pb_hooks/site-workflow.js — management enforcement in existing request hooks/processing route; JSON bypass protection.
- js/08-workflows.js — work-role UI/handler checks, account/session reset, scoped async state, friendly provenance date.
- js/01-app-core.js — login reset, Note response guards, native Snag controls/helpers, Note-row date simplification, drawing card/render guard.
- js/05-navigation-history.js — account/session-scoped Back navigation.
- js/07-site-items-js.js — management controls and friendly origin date.
- css/19-workflows.css — reliable hidden controls and accessible drawing primary button/focus treatment.
- index.html — local visible version/asset queries v4.20.1; safe default-hidden controls and processing label.

Tests/documentation:
- tools/workflow-role-api.cjs (new): explicit Joiner/management API matrix, project-role/modifier/type/duplicate bypasses and historical Joiner-creator rejection.
- tools/workflow-correction-browser.cjs (new): 390/1440px role controls, repeated real login/logout across four workflows, Back/cache/draft isolation, late saves, drawing click/keyboard/focus, persistent Note dates and friendly provenance.
- tools/workflow-api-tests.cjs; tools/workflow-security-regressions.cjs; tools/workflow-browser-check.cjs — existing cases updated to perform managed actions as Supervisor, retaining Joiner completion/privacy/failure checks.
- tools/browser-check.cjs; tools/snag-regressions.cjs; tools/validate.cjs — intentional role/markup/version expectations and authorized native-Snag fixture.
- WORKFLOW-V4.20.1-REVIEW.md — this report.

## Verification results

All API/browser writes used the isolated migrated copy on 127.0.0.1:8092. No production write tests were run for this correction.

- 62 existing workflow API checks passed: reference concurrency, processing/idempotence, privacy, assignment/completion, actor attribution, initials and concurrent processing/Calendar preservation.
- 39 existing direct security/legacy checks passed with management-only creation expectations.
- 39 focused v4.20.1 role/security checks passed: Joiner create/edit/reassignment/processing rejection, mixed-request atomicity, assigned completion, Snag JSON/legacy collection creation rejection, project-role and typed/duplicate bypasses, management capabilities and original creator editing denial.
- 72 existing direct completion API assertions passed: three stages, own undo/reload, unknown owners, timestamp/owner spoofing, management overrides, membership, derived fields and competing claims.
- Existing real workflow browser/API suite passed at 390px and 1440px, including natural spaced/capitalised login, Notes, To-dos, Snags, dashboard/Back, attribution, refresh, honest pending/rejected/offline saves and all roles.
- 10 focused browser groups passed across both widths: Joiner controls/Note persistence/single date; repeated Supervisor↔Joiner login/logout from To-dos, Notes, Snags and Door Completion; stale Back/editor/cache isolation; late previous-account Note response; all-role drawing cloud/local click plus keyboard/focus; friendly provenance/no runtime errors.
- Exact committed v4.19.18 frontend passed all nine critical compatibility groups against the corrected isolated backend: login, all three completion stages, personal Notes, native Snag creation/resolution, Calendar and reload persistence.
- Standard browser-check passed on its final complete run, covering baseline/root/subfolder at both widths, all menu destinations/Back, dashboard, Orders absence, Notes, Calendar, photos/uploads/ownership/session, native Snags, hardware and completion permissions/persistence. The pre-existing menu timing assertion and animation source were not changed; its historically observed flakiness is not claimed fixed. A temporary exclusion runner was also used earlier to exercise all non-motion regressions independently.
- Syntax/validation/auth suite and git diff --check passed. Stored collection definitions/API rules match the copied v4.20 source. Existing manager-override tests intentionally change three copied legacy completion dates; those fixture dates were restored in the stopped isolated database afterward. The original copied historical business values then matched the source and SQLite integrity passed.
- Read-only verification confirmed production hooks still match deployed v4.20.0. sw.js, css/03-polish.css and tools/menu-motion-regressions.cjs are unchanged. No orphaned-photo, service-worker clone or animation fix is included.

Local result artifacts are under C:\Users\hp\Documents\ChatGPT\Fielddock\v4201. Isolated databases and fixture credentials must stay private/out of Git.

## Schema, deployment and compatibility

No new PocketBase collection, field, relation, index, API-rule edit, data rewrite or migration is required. The existing v4.20 migration and hook registrations remain unchanged. Security is enforced by the existing RecordCreate/Update request hooks and processing route, not merely hidden buttons; PocketBase remains the security boundary.

A future approved deployment must include BOTH the corrected workflow helper and v4.20.1 frontend assets. A controlled PocketBase restart is needed to load the helper; no production operation was done here. Frontend-only publication would leave the old API permissions active. Installing the hook first is restrictive: cached v4.20.0 Joiner clients may temporarily show buttons but receive visible rejection, so coordinate publication/reload. No historical Joiner-created task is removed or reattributed. The v4.19.18 critical workflows remain compatible, with intentional management restrictions on legacy paths.

No new blocker was found in the requested corrections after testing. Production remains unchanged and deployment awaits explicit approval. Physical-device appearance/usability remains a manual retest after an approved deployment or isolated preview; it was not simulated as a completed phone acceptance.

## Concise phone retest (after approval)

1. Confirm v4.20.1. Joiner: no New/Edit To-do, Report snag or Note-processing controls; personal Notes still save/reload with one row date.
2. Supervisor creates and assigns a To-do; Joiner sees assigned-to-you count, completes it, and both accounts see the authenticated initials/date after refresh. Other Joiner cannot complete it.
3. Supervisor/Admin retain create/edit/reassign and Note→To-do/Snag. Check references, immutable source attribution, friendly provenance date, Snag completion and reload.
4. Repeatedly logout while editing/viewing each of To-dos, Notes, Snags and Door Completion; login as the other role. Always land on Dashboard with no old editor/modal/draft; Back must not restore the previous account's page.
5. Open PDF/image drawings by tapping the card/title; no redundant Open/filename. Check desktop Tab/Enter and category/delete permissions.
6. Save/refresh all three Door Completion stages and an allowed undo. Check a rejected/offline To-do save retains the confirmed state and shows its error.

STOP: local review build only; do not commit/push/deploy/restart production without a new instruction.
