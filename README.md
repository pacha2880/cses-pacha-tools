# CSES Pacha Tools

Chrome extension that improves the [CSES](https://cses.fi/problemset) problem set page with options to **sort, filter and track your progress**.

**Chrome Web Store:** [CSES Pacha Tools](https://chromewebstore.google.com/detail/cses-pacha-tools-%E2%80%93-ordena/jjniilllmpgdakgffiilihbjchglpjjp)

## Features

- **Sort by solves** — table of all problems sorted by how many people solved them.
- **Hide solved** — show only what's left to do.
- **Paint team** — mark as solved the problems your teammates solved (user IDs or usernames, comma-separated; usernames are added to your CSES friends list).
- **Restore view** — back to the standard CSES layout.

## Development

1. `chrome://extensions` → enable Developer mode → **Load unpacked** → select this folder.
2. Edit files in `src/`, then reload the extension and the CSES tab.

See [AGENTS.md](AGENTS.md) for how the code is organized.

## Publishing

Requires Node.js 20.12+. Run `npm install` once.

1. Bump `version` in `manifest.json`.
2. Choose one:
   - `npm run pack` → creates `dist/cses-pacha-tools-v<version>.zip`; upload it in the [Developer Dashboard](https://chrome.google.com/webstore/devconsole).
   - `npm run release` → packs, uploads and publishes automatically.

### One-time setup for `npm run release`

1. Copy `.env.example` to `.env`.
2. Get `CLIENT_ID`, `CLIENT_SECRET` and `REFRESH_TOKEN` by following [chrome-webstore-upload-keys](https://github.com/fregante/chrome-webstore-upload-keys).
3. `PUBLISHER_ID` is shown in the Developer Dashboard account settings.

`.env` is git-ignored; never commit it.
