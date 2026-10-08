FieldDock v4.19.5 — Standardisation foundation
Built from known-good v4.19.4.
- Adds shared FieldDock-styled confirmation modal.
- Drawing deletion now uses FieldDock confirmation instead of browser/GitHub confirm.
- Photo deletion uses the same FieldDock confirmation where applicable.
- Adds shared compact-file CSS primitives for Documents/Guidance/RAMS migration.
- Keeps the proven v4.19.4 compact Drawings implementation unchanged otherwise.
This release deliberately establishes/test the shared component before migrating every file list at once.
