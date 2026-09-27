# FieldDock v4.12.0 — Field Test PWA

**Site information. In your pocket.**

This folder is the public GitHub Pages frontend only. It contains no PocketBase database, migrations, uploaded project files, or credentials.

## GitHub Pages
Upload these files to the root of the `fielddock` repository. In GitHub open **Settings → Pages**, choose **Deploy from a branch**, then select **main** and **/(root)**.

## Backend configuration
`config.js` intentionally ships with an empty `pocketBaseUrl`. After the secure HTTPS PocketBase tunnel is created, set it to the tunnel origin, for example:

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
