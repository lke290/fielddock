FieldDock v4.16.0 — Safe Project Deletion
=========================================

Based on the stable v4.15.9 navigation-history build.

New project lifecycle
---------------------
- Active and Archived projects now have a deliberately low-prominence Delete project action for Supervisor/Admin accounts.
- Deletion requires BOTH typing DELETE and re-entering the signed-in user's current PocketBase password.
- The password is re-authenticated against PocketBase; FieldDock does not store it.
- Confirmed deletions become Recently Deleted for 24 hours rather than being removed immediately.
- Recently Deleted projects are hidden from normal project switching and cannot remain the active project.
- Recently Deleted shows who requested deletion, when it was requested, and the remaining recovery time.
- Restore project cancels deletion without requiring the password again.
- A server-side PocketBase cron hook permanently removes expired projects and their project-owned records/files.

PocketBase schema additions REQUIRED before testing deletion
-----------------------------------------------------------
In the existing `projects` collection add these fields in PocketBase Admin:

1. pending_delete
   Type: Bool
   Required: No
   Default: false

2. delete_after
   Type: Date
   Required: No

3. deletion_requested_at
   Type: Date
   Required: No

4. deletion_requested_by
   Type: Text
   Required: No

Do not change the existing collection API rules just for this feature. FieldDock already uses the project's existing update permission path.

Server cleanup hook
-------------------
Copy:
  pb_hooks/fielddock_project_cleanup.pb.js
into the `pb_hooks` directory beside your PocketBase executable.

The hook checks once per hour (at minute 7) and permanently removes projects whose 24-hour recovery deadline has passed. It removes project-owned records from:
- door_photos
- site_item_photos
- completion_records
- documents
- drawings
- personal_notes
- project_members
- schedule_records
and finally deletes the project itself.

IMPORTANT: test this against the old FieldDock test projects before using it on real jobs. Keep a PocketBase backup before the first permanent-deletion test.

Suggested first test
--------------------
1. Add the four project fields above.
2. Install the cleanup hook and restart PocketBase if necessary.
3. Deploy the v4.16.0 frontend.
4. Sign in as Supervisor/Admin.
5. Open Projects and choose one disposable test project.
6. Press Delete project.
7. Confirm the correct project name is shown.
8. Verify the button remains disabled until DELETE and a password are entered.
9. Enter a wrong password first — deletion must be rejected.
10. Enter the correct password — project should move to Recently Deleted.
11. Restore it — it should return intact to Active projects.
12. Delete it again. For the final server cleanup test, either wait for expiry or temporarily change its delete_after value in PocketBase Admin to a time in the past, then trigger/wait for the cron.

## v4.17.0 — User & Invitation Foundation
- Adds Admin as a first-class role while preserving Supervisor and Joiner behavior.
- Login now presents Username or email; PocketBase identity authentication handles either.
- Admin sees an account directory inside Team & Access.
- Keeps the tested v4.16.0 safe-deletion workflow and packages the corrected cleanup hook including audit_log and schedule_imports.
- Invitation creation, account disable/reset actions and role changes are intentionally deferred to the next tested pass.

## v4.18.1 — Secure invitations
- Adds a Supervisor/Admin invitation UI with 48-hour, single-use links.
- Supervisors can invite Joiners only; Admins can invite Joiner/Supervisor/Admin accounts.
- Optional project assignment is stored in the invite and applied server-side on redemption.
- Invite validation and redemption use custom PocketBase routes so the hidden token is never exposed through public collection APIs.
- New users choose a username, display name and password. FieldDock creates a private internal email value because the current PocketBase users schema still requires the system email field; users do not need to supply a personal email.
- Redeemed invites are marked used with used_at, and cannot be replayed.
- Install pb_hooks/fielddock_user_invites.pb.js alongside the existing project cleanup hook.


## v4.18.1 — Invitation screen visibility fix
- Fixed the Join FieldDock invitation screen appearing during normal app use.
- Shared login-screen styling now correctly hides invitation UI unless an invite token is present.
- No database schema or invitation API changes from v4.18.0.
