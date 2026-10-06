FieldDock v4.18.8 — Project Notes

Changes:
- Adds PocketBase-backed shared project notes using the project_notes collection.
- Joiners assigned to a project can read shared project notes.
- Supervisors/Admins can create, edit and delete shared project notes according to PocketBase rules.
- Personal notes remain in personal_notes and remain private.
- Existing personal-note 'Process list' workflow is unchanged.
- Project cleanup hook now includes project_notes when a project passes its 24-hour deletion recovery period.
- PWA cache/version bumped to v4.18.8.

PocketBase prerequisite:
The project_notes collection must exist with project, author, title and content fields and the API rules configured before using this build.
