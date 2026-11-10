Chrome extension (Manifest V3) that adds a toolbar to https://cses.fi/problemset. Plain JS, no build step, no framework. All code, comments, UI text and docs are in English.

## Layout

```
manifest.json      content script config; load order of src/*.js matters
src/core.js        constants, `state`, $/$$ helpers, fetchDoc, scraping (extractAll), isVisible
src/styles.js      all styles, injected as a <style> element
src/views.js       original view vs sorted table, refresh
src/team.js        "Paint team": friend lookup, fetch teammates' solved tasks, paint/clear
src/ui.js          toolbar buttons + updateStats
src/main.js        entry point; waits for the task lists, then initializes
scripts/pack.mjs   validate + zip -> dist/
scripts/release.mjs pack + upload/submit via Chrome Web Store API v2 (service account); defers if a review is pending
scripts/browser.mjs Chrome for Testing with the extension loaded + persistent CSES login (npm run browser)
scripts/shot.mjs   attaches to that browser and screenshots a CSES page
scripts/ship.mjs   bump version + commit + push (triggers the release workflow on main)
BACKLOG.md         planned UX work, in order
```

## How the code works

- `src/*.js` are classic scripts sharing one isolated world: top-level declarations are global across files. A file may only use, at load time, what earlier files declared (calls inside functions are fine). No `import`/`export`.
- `state.data` holds one row per task (`li`, `taskId`, `topic`, `solved`, `baseSolved`, `solvedCount`, ...). `solved` is what the UI shows; `baseSolved` is the user's own status, used to undo team painting.
- `isVisible(row)` is the only place that decides whether a row is shown; add new filters there.
- After changing `state.data`, call `refresh()`.
- DOM ids are prefixed with `ID` (`pacha-cses-tools-ext`). localStorage keys live in `STORAGE_KEYS`.
- CSES markup we depend on. If CSES changes, start in `extractAll`, `fetchSolvedSet` and `resolveFriendId`:
  - Problem set: `h2` + `ul.task-list > li.task`, `span.detail` ("solved / attempts"), `span.task-score.full`.
  - Own user id: `.controls a.account[href*='/user/']`.
  - Teammate page `/problemset/user/<id>/`: `table.course-user-solved a.task-score.icon.full`.
  - Friends page `/user/<id>/friends/`: `table a[href^='/user/']`, form with `input[name=csrf_token]` and POST field `add`.

## Known behavior (intentional unless the owner says otherwise)

- Typing a username (not a numeric id) in the team box **adds that user as a CSES friend** of the logged-in user, to resolve their id. Entries that can't be resolved are skipped silently.
- Topic badges are inserted but end up hidden in both views (`.hide-topic-badge` in the original view; lists are hidden in the sorted view).
- "Paint team" in the original view does not re-apply "Hide solved" until it is toggled again.
- The script runs on every `/problemset*` page; on pages without task lists the MutationObserver in `main.js` never disconnects.

## Working on it

- `npm install` once. `npm run pack` is the only automated check (syntax + duplicate top-level names); there are no tests.
- Test in a real browser: `npm run browser` opens Chrome for Testing (install once: `npx @puppeteer/browsers install chrome@stable --path ~/.cft`) with this folder loaded and a persistent profile in `~/.cses-pacha-profile` (log in to CSES there once). `node scripts/shot.mjs out.png [url] [--dark|--light]` screenshots it. Restart the browser after editing `src/`.
- Adding a JS file: create it in `src/` and add it to `content_scripts[0].js` in `manifest.json` before `src/main.js`.
- New permissions or host matches trigger extra Chrome Web Store review; avoid unless needed.
- Keep it dependency-free at runtime.

## Release

`npm run ship -- "commit message"` bumps the patch version, validates, commits everything and pushes. On `main`, that push triggers `.github/workflows/release.yml`, which submits it to the store, at most one version in review at a time (the store rejects a version it already has, so every release needs a bump). Setup and manual alternatives: "Publishing" in README.md.
