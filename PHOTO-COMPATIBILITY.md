# Door photo display compatibility

The frozen v4.19.17 source and the mechanical extraction have the same retrieval, mapping and gallery code. This is an inherited display bug exposed by live acceptance, not an extraction difference.

`photosFor` retrieves and maps all door photos. `refreshPhotoUI` counts that full list before filtering it for galleries. Completion cards only provided frame, door and ironmongery/snag galleries. Generic `other` records were therefore counted but excluded from every gallery. Additionally, `mapPbPhoto` preferred any truthy current `photo_kind`/`evidence_group`, including `other`, over useful legacy caption/kind values. The old door regex also missed a legacy `door_fitted` value.

The display mapper now selects a specific kind from current photo_kind, then caption, then legacy kind. A specific kind determines its evidence group, including when the stored group is generic. Existing file/photo URL candidates are unchanged. Gallery filters normalize kinds through the existing helper. Unclassified photos get an existing-style gallery immediately below the door's Photos count; no stage is invented for records without stage metadata. Known ironmongery/snag-group photos retain their existing section.

The upload handler searched only for the older `.photo-tools` container while completion cards use `.compact-photo-tools`. This discarded each selected category and passed `Other` to record creation, including for snag photos. The handler now accepts either container. The existing uploader and schema fields are unchanged: Frame fitted → `frame_fitted` / `installation` / caption `Frame fitted`; Door hung → `door_fitted` / `installation` / caption `Door fitted`; Ironmongery fitted → `ironmongery_fitted` / `ironmongery_snag` / caption `Ironmongery fitted`. The same selector correction preserves the existing snag mapping `defect_snag` / `ironmongery_snag` / caption `Defect / snag`, and explicit Other remains available. Already generic records cannot reliably be assigned to the stage from which they were uploaded; they still appear in the door-level fallback gallery.

## Validation

Run `node tools/validate.cjs` and `node tools/browser-check.cjs`.

The structural validator retains the frozen source and compares all content outside the two reviewed display functions and added fallback gallery. Authentication regressions remain unchanged. Browser comparisons still cover signed-out startup, initial DOM/styles and globals at 390/1440 px on root and subfolder routes. Photo regressions run the real mapper, completion card and renderer with 12 fixtures covering current enums, legacy labels and snake-case kinds, generic current metadata plus specific legacy fields, generic/empty metadata and group-only metadata. Every fixture renders exactly once, retains delete controls, decodes a mocked image and is visible when its section is expanded.

Upload regressions bind the actual completion-card file inputs and exercise `addDoorPhotos` and `uploadPbDoorPhoto` with a mocked request boundary. They verify outgoing multipart classification, project/door/uploader, both file fields, all three stages, snags, explicit Other, legacy controls and duplicate binding prevention. Recreating the card from the saved mock records verifies section placement. The structural validator allows only the exact selector correction in addition to the earlier display changes.

No PocketBase writes are performed by these tests. Real file access, protected-file permissions, mobile image decoding and PWA cache updates still need live acceptance. Verify existing and newly uploaded photos after reload; stage-specific records belong in their section, while records with no recoverable stage appear below the door photo count. No schema, rules, authentication, CSS, external snag import, merge or deployment changes are included.

`tools/extract.cjs` reproduces the original mechanical extraction and will overwrite this subsequent fix if rerun. It is a historical reproduction utility, not a build step.
