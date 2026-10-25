# Stage-specific completion ownership

Production PocketBase: 0.40.4. Source-controlled backend files are kept here because the live server directory is outside the frontend Git repository.

Migration: pb_migrations/1792886400_stage_completion_ownership.js adds optional single-user relations frame_completed_by, door_completed_by and ironmongery_completed_by to completion_records. Existing completed_by stays unchanged. No backfill or historical data updates.

Request hooks: pb_hooks/completion-ownership.pb.js loads completion-ownership.js. Create/update checks and the save run in one transaction, re-reading the stored record and merging only explicitly submitted fields. Each stage's boolean, timestamp and owner is checked independently. Project/schedule links are immutable; schedule/project association and current membership are checked; duplicate creation for the same door is refused. Unsupported field modifiers are rejected. Joiners cannot delete the shared completion record.

Assigned Joiners can complete incomplete stages; the server derives the owner from authentication and supplies a timestamp if absent. Only that owner can change a completed stage's boolean, timestamp or owner. Undo clears timestamp and owner atomically. Completed stages without owners are read-only for Joiners. Global Admin/Supervisor retain override; PocketBase superusers retain administrative access. Derived installation/ironmongery/full-completion report flags and timestamps are recomputed server-side. Legacy alternative completion fields cannot be changed by Joiners to bypass enforcement. Shared note editing remains separate.

All collection API rules are unchanged. Existing project membership restrictions remain in place; hooks add field-level restrictions. A request mixing an allowed Frame change with an unauthorized Door/Ironmongery change fails as a whole. Concurrent requests cannot overwrite another user's stage ownership; conflicting transactions fail safely. Same-value idempotent requests do not claim a completed stage.

Frontend js/01-app-core.js maps stage owners, disables only another user's or unowned completed stages, refreshes before mutation, sends only the edited stage, preserves audits, and refreshes authoritative state after failure. Account/project guards prevent stale responses from changing the active project. Local-only projects retain existing functionality. Photos, stage reports and other workflows are unchanged.

## Validation and deployment

- tools/completion-ownership-api.cjs: 72 direct API assertions against an ISOLATED production database copy on 127.0.0.1:8091. Never run it against production. Test superuser credentials in this file are local fixture credentials, created only on the copy. They are not production credentials.
- tools/completion-ownership-regressions.cjs: browser coverage for all roles/stages, malformed/missing ownership, partial payloads, reload mapping, project switching and separate report builders. Invoked by tools/browser-check.cjs.
- tools/validate.cjs: syntax, frozen baseline and authentication checks.
- Existing browser workflows passed at 390px and 1440px, root and /fielddock/ paths: dashboard/Back/search, Orders absence, Notes, Calendar, photo rendering/uploads/ownership/session, snags, hardware and completion ownership.
- The unchanged Site/Tools animation test fails on this installed Edge build because the computed clip remains at its start value at the sampled opening frame. Full command was run twice; remaining tests were then run separately without modifying animation source or tests. Physical devices remain to be tested.

Live rollout used tools/deploy-completion-ownership.ps1 with Windows administrator elevation. It stops the existing backend task/process, copies the full pb_data plus hooks/migrations, integrity-checks the backup, applies the three-field migration, compares every historical completion value and existing API rule, then restarts using the existing task/startup arguments. tools/verify-completion-migration.py performs the read-only comparisons. Rollback intentionally does not remove populated owner fields or automatically overwrite production history; inspect the full backup before recovery.

Verified production backup: C:/Users/hp/Documents/ChatGPT/Fielddock/completion-security/live-backup-20261025-212622. Records before/after: 21/21; historical completed Frame/Door/Ironmongery stages 9/7/7 unchanged; all historical stage owners blank. Deployed hooks match source hashes. Local and public /api/health returned 200. Security attack tests use the isolated copy, not historical production records.

No abandoned animation prototypes are included. No Hearth files are accessed.

Mechanism references: https://pocketbase.io/docs/js-event-hooks/ and https://pocketbase.io/docs/js-records/#transaction ; also verified against the installed 0.40.4 types.d.ts and executable.
