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
