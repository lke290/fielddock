# Photo/session investigation after native snag implementation

## Established evidence

- Compared `6cf53debe2f74af0ed9e1b0e49ae311bfd500f77` with its immediate parent `5294c11`. Photo mapping, kind/group mapping, retrieval, multipart uploader, normal file-input binding, gallery filtering, normal post-upload refresh, authentication and `renderCompletion` were unchanged. The normal stage controls were unchanged. New snag submission invokes photo upload only after a snag save; its document click listener only matches `.compact-report-snag`. The added stylesheet is scoped to `.native-door-snag-dialog`.
- Checked Luke's running `http://192.168.1.111:8080/` preview: the page and checked supporting files matched the checkout. A fresh browser using an Android device profile loaded all 26 configuration/JS/CSS assets byte-for-byte from this repository with `no-store` response headers. There were no missing/mismatched modules in that run.
- At this HTTP LAN origin the fresh browser reported `isSecureContext === false` and no `navigator.serviceWorker`, with ordinary browser settings. This origin cannot normally run the HTTPS/localhost service worker. This is evidence about the tested fresh browser, not an inspection of Luke's phone's in-memory page or browser flags.
- Luke confirmed that the missing records, distinguishing classification and image files remain in PocketBase. No new record appears after his failed camera attempt. No live PocketBase records, schema or permissions were modified during this investigation.

## Reproduced session defect and repair

The real photo input/uploader/authentication path was exercised in the LAN-served page with mocked HTTP responses. With an already verified session, a temporary `auth-refresh` network error cleared `pbVerifiedToken` and called `applyAuth`, showing the login screen. The photo POST was never sent. The retained stored token could subsequently be verified again, explaining a possible apparent logout/login cycle without an actual explicit sign-out. A refresh HTTP 503 had the same invalidation problem. This defect already existed in the parent; it was not introduced by the snag code.

Transient refresh errors now fail the current operation while retaining any previously verified session. They do not turn an unverified session into a verified one, and they do not send the blocked write. A collection HTTP 401 is revalidated once and retried once with the refreshed token. A second collection rejection is reported as a request error, without claiming that a separately verified session expired. Auth-refresh rejection (401/403), missing credentials or an invalid refresh identity still invalidate the session. Existing account/logout race guards remain.

## Test gap and coverage

Earlier photo tests replaced `photosFor` and `pbFetch`, bypassing the authenticated retrieval/upload request chain. Existing auth tests checked stored-token retention during network errors but not the verified-token state or actual login-screen visibility; they also expected collection 401 responses to clear credentials without a confirming auth-refresh rejection. The browser runner previously checked runtime errors only before the workflow tests.

The new integrated tests mock only raw HTTP and retain actual photo retrieval/mapping, multipart construction, input handlers, authentication wrappers and authentication UI. They cover three classified records rendered exactly once, Other records only in fallback, correct classification of all three normal uploads, visible decoded images, actual persisted counts, upload validation/network errors, refresh network/503 errors, collection 401 handling, retry after temporary failure, genuinely invalid sessions and 12 unchanged hardware entries. Existing native snag regressions remain in the full suite, and runtime errors are checked after workflows as well as startup.

## Live rendering investigation and acceptance update

The classified-photo disappearance has not been reproduced with the actual frontend and representative correctly classified HTTP records. Those images render in their correct sections both before and after this repair. The commit diff does not establish a causal snag change for that symptom, and a fresh LAN-page load did not show an asset mismatch. No gallery change or data rewrite has been made to conceal this uncertainty.

Luke subsequently confirmed live Android acceptance of the current repair: camera opens, upload succeeds without a logout, the new image appears immediately against the correct door, Frame fitted renders in its own section, existing classified photos render again, and hardware still appears to work. The separate classified-rendering failure was not independently reproduced, so its precise causal mechanism has not been established. No speculative gallery change was made. Automated tests still use mocked HTTP; the live result is Luke's reported device test. Photo work is now held at this known-good state while native snag acceptance proceeds.

Run `node tools/validate.cjs` and `node tools/browser-check.cjs`. No merge or deployment is part of this change.
