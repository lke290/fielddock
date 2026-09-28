# FieldDock v4.15.0 — Field Test PWA

**Site information. In your pocket.**

This folder is the public GitHub Pages frontend only. It contains no PocketBase database, migrations, uploaded project files, or credentials.

## GitHub Pages
Upload these files to the root of the `fielddock` repository. In GitHub open **Settings → Pages**, choose **Deploy from a branch**, then select **main** and **/(root)**.

## Backend configuration
`config.js` is configured for the FieldDock PocketBase tunnel. v4.15.0 deliberately excludes this file from service-worker caching so backend configuration changes are picked up reliably:

```js
window.FIELDDOCK_CONFIG = {
  pocketBaseUrl: "https://your-secure-pocketbase-host.example"
};
```

Do not put passwords, PocketBase admin credentials, API tokens, database files, or project documents in this repository.

## Field-test behaviour
- Installable PWA metadata is configured for GitHub Pages project hosting.
- The header reports Online / Offline / Connecting / Backend not configured.
- Writes are not queued while offline; the app tells the user the change was not sent.
- Existing authentication storage key is deliberately retained for compatibility.

The current icons are retained from the stable build until the final FieldDock production icon assets are exported.

## v4.15.0 field-test fixes
- Dashboard door/schedule search now uses compact navigation results; **Open** jumps to and expands the matching completion record instead of rendering the full record inside the search card.
- Completion-list filtering now uses the same normalised room terminology and handles zero-padded room numbers (for example `Bed 1` matches `Bedroom 01`).
- Door photo refresh requests bypass browser/proxy caches so newly uploaded evidence is requested immediately.
- Personal notes reload from PocketBase with an explicit current-user filter and no-cache request after a fresh sign-in; private note state is cleared on sign-out.


## v4.15.0 search navigator
- Search result rows are fully tappable; separate Open buttons removed.
- Exact room/door searches no longer include partial numeric matches such as Bed 30 for Bed 3.
- Large door result sets are grouped by count and open the Completion List with a temporary filter.
- Guidance remains visible as its own result category.


## v4.15.0 mobile UI
- Phone-first dashboard navigation tiles.
- Supervisor Projects button and role-aware project switcher.
- Grouped Project Files & Imports and Project Management sections.
- Compact saved-notes index.
- Formula toolbox grid.
- Light/Dark only; FieldDock orange fixed.
- New FieldDock notebook app icons.
