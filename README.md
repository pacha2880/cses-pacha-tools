# CSES Pacha Tools

Chrome extension that improves the [CSES](https://cses.fi/problemset) problem set page with options to **sort, filter and track your progress**.

**Chrome Web Store:** [CSES Pacha Tools](https://chromewebstore.google.com/detail/cses-pacha-tools-%E2%80%93-ordena/jjniilllmpgdakgffiilihbjchglpjjp)

## Features

- **By topic | By solves** — CSES's lists, or all problems sorted by how many people solved them. Remembered across visits.
- **Filter** — show all, hide what you solved, what your team solved, or what anyone solved, or only what your team solved and you didn't.
- **Team** — add teammates as chips, with suggestions from your CSES friends, your recent teammates and teams, teams you starred (☆ at the end of the box), and every CSES user with 5+ solved tasks. One colored dot per teammate next to each problem (filled = solved), and `Me · Team · Nobody` counts. Click a chip to hide that teammate, × to remove. Your own green checks are never changed. Users not in the list can be looked up through your CSES friends list (asks before adding a friend).

## Development

1. `chrome://extensions` → enable Developer mode → **Load unpacked** → select this folder.
2. Edit files in `src/`, then reload the extension and the CSES tab.

See [AGENTS.md](AGENTS.md) for how the code is organized.

## Publishing

Requires Node.js 20.12+. Run `npm install` once.

Normal flow, one command:

```
npm run ship -- "commit message"
```

It bumps the patch version, validates, commits everything and pushes. When that push lands on `main`, the [Release workflow](.github/workflows/release.yml) uploads the new version, submits it for review and tags it `v<version>`. Google's review (hours to days) cannot be skipped.

**One review at a time.** If a version is still in review, the release is deferred instead of cancelling it (cancelling restarts the queue). The workflow also runs every 6 hours and submits the latest untagged version once the review is over, so several quick ships end up as one review. To replace a version in review anyway (urgent fix): Actions → Release → Run workflow → "cancel pending".

By hand:

- `npm run status` → what is published and what is in review.
- `npm run pack` → creates `dist/cses-pacha-tools-v<version>.zip` for a manual upload in the [Developer Dashboard](https://chrome.google.com/webstore/devconsole).
- `npm run release` → packs, uploads and submits from your machine (same deferral rule; `-- --cancel-pending` to override).

### One-time setup (done; to redo it)

1. Google Cloud project with the Chrome Web Store API enabled, a service account, and a JSON key for it (`gcloud iam service-accounts keys create`).
2. Developer Dashboard → Account → Service account: add the service account's email (one per publisher).
3. `.env` (see `.env.example`): `SERVICE_ACCOUNT_KEY` = the key file base64-encoded on one line, `PUBLISHER_ID` from the dashboard URL.
4. Give the same values to the workflow: `gh secret set -f .env`.

`.env` is git-ignored; never commit it.
