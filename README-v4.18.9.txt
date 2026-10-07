FieldDock v4.18.9 — Completion regression fixes

Targeted fixes only:
1. New completion photos now retain the selected stage/type in the compact UI.
   v4.18.8 looked only for the old .photo-tools wrapper, so new compact uploads
   were saved as "Other". The total photo counter increased, but the Frame/Door/
   Ironmongery filtered gallery did not show them.
2. Hardware rows now display when the compact Hardware row is expanded.
   The compact UI contained a nested closed <details> whose summary was hidden,
   leaving the actual hardware list inaccessible.

No completion layout redesign was made in this patch.
Project Notes changes from v4.18.8 are retained.
