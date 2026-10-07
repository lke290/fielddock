FieldDock v4.19.0 — Completion stability fix

1. Photo capture
- Removed the forced Android capture intent from completion file inputs.
- Android now uses its normal image chooser. Camera can still be selected where offered.
- This avoids the direct camera hand-off that was causing the installed PWA to be
  destroyed/recreated on some Android devices before FieldDock received the image.

2. Hardware
- Hardware now remains visible whenever a door has an ironmongery set.
- If a record has a set (for example HS01) but its own hardware array is empty,
  FieldDock looks for another door in the SAME project with the exact same set and
  a populated hardware list, then uses that set data.
- If no item data exists anywhere for that set, the Hardware row still appears and
  explicitly says the set has no imported items instead of silently disappearing.

No PocketBase schema changes are required for this patch.
