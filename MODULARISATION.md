# FieldDock v4.19.17 mechanical extraction

Baseline: `lke290/fielddock`, commit `b45c5f9d06db73fa6ce22c75186f593dc4a0eb3a`.
Use this repository baseline rather than the older loose project copies or proposed snag-import patches. No importer fix is included.

## Resulting tree

```text
index.html                 entry point; original markup and asset order
config.js                  unchanged
manifest.json              unchanged
sw.js                      unchanged
icon-192.png               unchanged
icon-512.png               unchanged
css/
  01-base.css
  02-mobile-ui-fix.css
  03-polish.css
  04-corrections.css
  05-guidance-regulations.css
  06-compact-regulation-cards.css
  07-regulation-details.css
  08-regulation-polish.css
  09-site-list-mobile-css.css
  10-snag-page.css
  11-mobile-ui.css
  12-glass-ui.css
  13-delete-project-style.css
  14-ui-permissions-polish.css
  15-regression-fix.css
  16-light-theme-polish.css
  17-work-view-css.css
  18-site-items-ui.css
js/
  01-app-core.js
  02-mobile-ui-js.js
  03-project-navigation.js
  04-ui-permissions-js.js
  05-navigation-history.js
  06-work-view-js.js
  07-site-items-js.js
baseline/
  index.html               frozen Git source, not a second app entry point
  extraction.json          original attributes, order, file map, commit
tools/
  extract.cjs              reproduce extraction from frozen Git commit
  validate.cjs             structural and auth regression checks
  auth-regressions.cjs     pre-existing auth tests, run through validate.cjs
  browser-check.cjs        baseline/modular browser comparison
MODULARISATION.md
README.md                  original repository readme
```

The seven original classic scripts retain their original parser positions and IDs, with no async/defer/module conversion. Global declarations, function hoisting, wrapper closures and overrides remain in their original scripts. CSS cascade order and IDs are preserved; styles embedded in print-document JavaScript remain inside that JavaScript. Existing inline HTML style attributes are retained. All new references are relative, supporting a root or `/fielddock/` deployment.

The 668 KB core script intentionally remains together: splitting inside its existing execution scope could change function hoisting or startup behavior. This first pass separates the existing execution units; it does not claim full internal module isolation. Further subdivision requires dedicated characterization tests.

## Validation completed

- `node tools/validate.cjs`: seven scripts parse, reinlining reproduces frozen source byte for byte, supporting files have identical Git blobs, all static script/stylesheet/manifest references resolve, no extracted CSS URLs need rebasing, service worker parses.
- Existing mocked authentication tests pass: refresh, roles, headers, rejected/expired/missing sessions, outages, concurrency, logout race, public login, multipart upload, 401, storage and reload.
- `node tools/browser-check.cjs`: headless Edge, 390 px and 1440 px, baseline compared with modular root and `/fielddock/` routes. Initial body DOM, computed element styles and selected shared globals match; no uncaught runtime errors or local missing assets.
- Browser comparisons use a signed-out session, block external requests and disable service workers. They do not validate PDF/ZIP libraries, real PocketBase data, authenticated workflows or offline installation.

The browser check uses the bundled Playwright location on Luke's current PC. On another machine install Playwright and adapt its require path. The structural/auth check only needs Node and Git.

## Luke's acceptance tests before merging

1. Serve this entire folder over HTTP, then test both normal desktop and mobile widths. Never deploy index.html alone: include css/ and js/.
2. Sign in as Admin and Joiner, reload, sign out/in; verify projects, memberships, role gating and work-view switching.
3. Open B01 D-1 in Door Completion. Expand/collapse Hardware and verify all 12 items and guide links.
4. View/upload/open door and snag photos, including existing images. Verify note, snag, completion and project navigation flows against baseline.
5. Exercise PDF/ZIP imports and the existing external snag-import flow without expecting its known bug to be repaired.
6. Test appearance, menus, browser back/forward, calculations, guides and project export/print.
7. Test PWA install, update from the old version, close/reopen, online reload and warm-cache offline reload. Config remains network-only and external libraries retain their existing offline limits. The unchanged worker caches new local assets when requested; verify no missing CSS/JS during an update or offline reload.
8. Deploy a preview under the actual GitHub Pages subfolder; verify all assets and API requests. A home server must serve .js as JavaScript and .css as CSS.

Behavioral parity remains pending Luke's real-device and live-data acceptance. Nothing has been deployed.

## Next Git steps (PowerShell)

In this prepared checkout:

```powershell
Set-Location 'C:\Users\LukeP\.codex\.chatgpt-projects\g-p-6ac20bec70c08191ba72814b87bddfd1\fielddock-modular'
git status
node tools/validate.cjs
git push -u origin refactor/modularise-v4.19.17
```

Open a pull request from `refactor/modularise-v4.19.17` to `main`, review the extraction, and test a preview before merging. Do not point production Pages at this branch before acceptance. To serve a preview with Node, run `npx --yes http-server . -p 8080 -c-1` and open http://localhost:8080 (this downloads http-server if unavailable).

After acceptance and merging on GitHub, in your normal FieldDock checkout:

```powershell
git switch main
git pull --ff-only origin main
```

Deploy the complete frontend tree through the normal GitHub Pages or server process. Preserve config.js at the app root. Baseline and tools are review/development material, not needed in a production upload.
