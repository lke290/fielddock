# FieldDock v4.20.0 — local workflow review

Status: local implementation/test build only. No commit, push, Pages deployment, production migration or service restart. v4.19.18 remains the live known-good build. Orders stays absent, per the explicit clarification. Abandoned animation prototypes remain untouched/untracked.

## Database and identity

Prepared migration: backend/pb_migrations/1793318400_site_workflow.js.

- users: optional display_initials text (up to 6 letters/digits), presentation only.
- personal_notes and project_notes: reference, processed_kind, processed_target. Existing user/author relations remain authoritative.
- todos: project, reference, description, location, priority (Normal/Important/Urgent), assigned_to user relation, created_by user relation, created/updated dates, complete, completed_by user relation, completed_at, source_note relation to personal_notes, source_project_note relation to project_notes, immutable origin snapshot.
- workflow_sequences: locked internal prefix/value counters. Three initial sequence rows (N, TD, SN). No public collection API access.
- Existing Snags stay in project/schedule JSON. New entries gain reference and authenticated createdById; completion transitions gain completedById. Existing Snag create/update/delete permissions are retained.

User IDs, not initials, are stored as identity. Completion already has frame_completed_by, door_completed_by, ironmongery_completed_by: these are reused without modifying their writer/ownership hooks. Shared project-scoped directory routes return only IDs, names, usernames, initials and assignment eligibility. Removed contributors can still be resolved through their recorded project contributions where the account exists. Unresolvable IDs display Unknown user; unowned historical completions show only their date.

Initials derive from the first/last name parts (Luke Clayton → LC, Craig Brown → CB), falling back to username. Management can set/clear a display override through the To-dos management disclosure. An override does not change identity. Empty override restores generation. UI examples use initials plus dd/mm/yy; full dates/IDs stay in the database.

Existing users self-update rules were found to permit protected role/active/initials changes. The corrected local users request hook permits role/active changes only for Admin/superuser authority where existing API rules allow the update. Joiners cannot change initials; Supervisor/Admin initials management is retained. Normal record PATCH remains self-only under the existing rule; no new cross-user account-management permission is granted. Existing collection API rules are otherwise unchanged. This security hardening is part of the backend review; it has NOT been installed on production.

## References and processing

Reference allocation and record saving share a PocketBase transaction. One global counter per prefix spans projects/users and, for N, both Note collections. Unique indexes protect database-backed reference values. JSON Snag references come from that same locked SN counter. Numbers are at least four digits and grow beyond 9999. Deleted numbers are not reused. A conflicting write can fail safely and be retried; it cannot create duplicate references.

Normal Notes remain valid and private/shared according to their existing collection rules. Quick capture is unchanged. Process as → To-do/Snag is explicit. Personal Notes can be processed only by their creator; shared project Notes by their author or management with existing read access.

Processing creates one linked target, records processed kind/target on the Note, and retains original text/title, authenticated creator ID, original creation date, category/location reference, source collection and actual Note ID/reference. Source Note records are retained. To-dos have dedicated personal/shared source relations plus the immutable snapshot. Snags retain source identity/snapshot in their existing JSON. To-do and Snag provenance is visible in a disclosure.

A repeated/concurrent process of the same Note returns its existing target; changing kind after processing is refused. No title matching is used for new records. The old render-time legacy Note copier no longer runs, so a Supervisor processing a Note does not silently create an unrelated shared Note. Existing historical shared Notes still load normally. Each Note becomes one target; external multi-line/file importing remains its separate existing workflow.

The existing Note schemas have no attachment/file/photo fields. There were no Note attachments to copy or discard in this model. Original Notes/snapshots remain linked; To-dos introduce no photo requirement or photo-completion UI.

## To-dos, navigation and login

All authorized project members can create To-dos. Creator or Admin/Supervisor can edit task details/assignment. An unassigned task can be completed by any authorized member. An assigned task can be completed by its assignee or management. Only its completing user or management can reopen it. Completion actor/time are derived server-side and cannot be forged. Completed records stay in history; ordinary API deletion is locked. There is no new offline-write queue.

UI shows Saving and retains the previous confirmed checkbox until the response is validated. Failed/offline saves retain confirmed state and show an error. Unavailable counts are not presented as a confirmed zero. Project/account/read-generation guards prevent stale lists from overwriting confirmed task changes. To-dos are paginated before counts are calculated.

Dashboard grid: Outstanding Works | Site Diary / Project Drawings | To-dos. The existing Door Completion button/action is directly below, above Reports. To-dos show outstanding and assigned-to-you counts. Site menu and whole-site search include To-dos. Note/Snag reference search is supported. Existing Back routing is reused.

Login submit trims, lowercases usernames and collapses whitespace to hyphens. It leaves password bytes alone and only trims email input. No accounts are renamed or migrated.

## Changed implementation files

- index.html: v4.20.0 label, workflow markup/menu/dashboard layout, versioned changed-module/style references to avoid mixing cached v4.19.18 scripts with the new page.
- js/08-workflows.js: shared identity helpers/directory, To-do UI/cache/save/permissions, Note-processing adapters, search integration and login normalization.
- css/19-workflows.css: scoped workflow/attribution/provenance styling.
- js/01-app-core.js: small Note mappings/processing adapter, explicit processing visibility, login submission integration, reference search/labels, confirmed site-list response and Snag verification that permits server metadata. The v4.19.18 completion save/read functions are byte-equivalent to commit 71794b8; validator asserts this.
- js/07-site-items-js.js: reference/user/provenance display and reference search; existing actions/permissions remain.
- backend/pb_hooks/site-workflow.pb.js and site-workflow.js: authenticated request hooks/routes and transactional processing/numbering/permissions.
- backend/pb_migrations/1793318400_site_workflow.js: prepared additive schema change.
- tools/workflow-api-tests.cjs and tools/workflow-browser-check.cjs: new isolated integration tests.
- tools/browser-check.cjs, dashboard-shortcut-regressions.cjs, menu-motion-regressions.cjs, completion-persistence-regressions.cjs, validate.cjs: expected feature markup/format/navigation integration and explicit unchanged-persistence assertions.

## Local validation

Migration rehearsed on a fresh isolated read-only snapshot of production. Post-migration comparisons preserved every historical value in 25 completion records, 5 personal Notes, 2 shared Notes, 2 projects and 395 schedules. New counters were zero and new To-dos empty. No bulk backfill: old references/initials remain blank. An explicitly processed legacy Note receives a reference as part of that transaction; normal legacy reads/edits do not assign ownership.

API suite: 59 request/security assertions plus content checks, including concurrent numbering and same-Note processing, forged identities, private/shared provenance, assignment restrictions, completer visibility, management override, immutable references, initials overrides and unchanged direct Snag restrictions. Concurrent Note edits cannot clear processing links; concurrent Calendar writes cannot erase a processed Snag. Existing assignees are retained if directory loading fails.

Real browser/API suite: 390px and 1440px; real username/email login, private/shared Note conversion, reload, native Snag save/resolve with server metadata, To-do Saving/confirmation/rejection/offline behavior, assignee/completer visibility, Supervisor overrides/initials, search and dashboard/Back. All three Door Completion stages are saved/reloaded with user attribution; a different Joiner sees them read-only. Completed To-dos are retained.

Existing regressions exercise auth/token rotation, completion persistence/undo/dates/history, search/filtering, project selection, Notes, Calendar, Orders absence, photo upload/display/ownership/session, Snags, Hardware, report builders and phone/desktop layouts. Existing menu animation sampling has intermittent timing failures in this Edge runtime; it is not changed by this build. Functional regressions can be run separately from that timing assertion when diagnosing it.

Service worker/cache/config and photo handling are unchanged. Offline To-do save failure is tested; new server-confirmed records/references require connectivity. The orphaned-photo 404 and Response.clone issues remain separate outstanding bugs. Physical-device acceptance and live PWA/cache testing remain a review/deployment follow-up, not claimed as completed here.

## Before any production deployment

1. Review the migration, hooks, profile-field guard and permissions above. Do not run the older completion-only deployment helper for this release.
2. Take and verify a full live pb_data backup plus hooks/migrations. Verify the current production schema/history against the reviewed baseline.
3. Install the new workflow hook/helper and apply the additive migration to the actual live PocketBase using its normal managed startup/deployment procedure. A backend restart to load hooks will be needed at that later approved deployment, not now.
4. Verify health, source hashes, preserved history, assigned/unassigned task permissions, initials override and references before publishing the frontend.
5. Commit only intended feature/test/report files; exclude abandoned prototypes, isolated databases, fixture tokens and screenshots. Deploy the frontend through the existing main → Pages process after approval.
6. Perform two-phone acceptance on v4.20.0. Do not clean up photos or alter the service worker as part of this feature release without separate approval.

Mechanism references: https://pocketbase.io/docs/js-routing/ , https://pocketbase.io/docs/js-records/#transaction and https://pocketbase.io/docs/js-migrations/ ; also tested with the installed PocketBase 0.40.4 executable.


## Security corrections and full rehearsal (30 October 2026)

Still local/uncommitted v4.20.0 only. Production remains untouched.

- Fixed Supervisor self-escalation: role and active are Admin/superuser-only, independently of work-management/initials authority. Rejected mixed-field requests are atomic.
- Normal Note creation derives user/author from authentication, including app Admin creation. Shared Note completion also derives actor/time; existing attribution cannot be rewritten through ordinary edits.
- Snag creator/reference, completer and provenance are server-owned. New completed Snags and completion transitions derive the actor; completion dates are server-generated, or (only for the old native-door writer) validated within two minutes of server time. Existing completion dates and Note origin/source snapshots cannot be rewritten.
- v4.20 opts into Snag response metadata with X-FieldDock-Workflow: 1. Old schedule-record responses omit the added audit fields, while retaining them in storage; old native resolution timestamps are validated and echoed. Header negotiation never bypasses write validation. Project/Site Snag responses remain unchanged.
- No migration/schema change was required for these corrections. Permanent deletion of a project containing To-dos remains blocked; archiving passes.
- Fresh complete migration from current production copy: 26 completions, 5 personal Notes, 2 shared Notes, 2 projects, 395 schedules. Every existing column value/record remained unchanged; integrity passed.
- Actual isolated rollback: preserved the failed migrated tree containing representative new workflow data; restored all 324 pre-release files with exact SHA-256 matches; restored original schema/hooks/migration history and every historical value. Post-backup Note/To-do records were absent from the restored snapshot and retained in the failed-state copy for reconciliation.
- Exact v4.19.18 Git blobs passed real login, three completion stages, personal Notes, native Snag creation/resolution, Calendar, reload and stored-state checks against BOTH the migrated backend and the restored baseline.
- Final tests: 45 direct security/legacy assertions; 62 workflow API checks including reference concurrency and Note processing; 72 existing direct completion ownership assertions; real 390/1440px workflow browser checks including Joiner/Supervisor/Admin, assignment, pending/rejection/offline saves and refresh.
- Existing validation/auth checks and all non-motion browser regressions passed at both widths/root/subfolder. Full unchanged browser suite still fails the pre-existing menu reveal timing assertion; a temporary runner excluded only that module and left application code untouched.
- Added tools/workflow-security-regressions.cjs and tools/workflow-legacy-compatibility.cjs for repeatable loopback-only security and pinned-old-client checks. Fixture credentials/databases/evidence remain outside the repository.

Production service/task cutover, Cloudflare routing, backup encryption/startup credentials and phone acceptance remain deployment-time checks requiring approval. No orphaned-photo or service-worker clone fix is included. Nothing has been committed, pushed or deployed.
