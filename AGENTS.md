Chrome extension (Manifest V3) that adds a toolbar to https://cses.fi/problemset. Plain JS, no build step, no framework. All code, comments, UI text and docs are in English.

## Working agreement (always)

Every change the owner asks for ends the same way, without asking: verify it in the test browser (`npm run smoke`, screenshots in both CSES themes), then `npm run ship -- "message"`. That one command commits, pushes and deploys: the push to `main` runs the Release workflow (~20 s), which uploads and submits to the Chrome Web Store. Never leave finished work uncommitted, unpushed or undeployed. Google's review afterwards (hours to days) is the only part that is not instant; the workflow handles it (see Release).

## Layout

```
manifest.json      content script config; load order of src/*.js matters
src/core.js        constants, `state`, $/$$ helpers, fetchDoc, scraping (extractAll), isVisible
src/styles.js      all styles, injected as a <style> element
src/views.js       CSES's lists vs one sorted ul.task-list of cloned li.task, team marks, refresh
src/users.js       user directory (data/users.txt, lazy) + CSES friends; searchUsers/findUser
src/team.js        Team state: add/remove/hide members, solved sets (cached, 2 at a time), recent teams, friend-add fallback
src/ui.js          toolbar buttons + updateStats + team messages
src/chips.js       team field: chips + ARIA combobox suggestions + keyboard
data/users.txt     "name<TAB>id<TAB>solved" for CSES users with >=5 solved, rank order (npm run users; web_accessible_resources)
src/main.js        entry point; waits for the task lists, then initializes
scripts/pack.mjs   validate + zip -> dist/
scripts/release.mjs pack + upload/submit via Chrome Web Store API v2 (service account); defers if a review is pending
scripts/browser.mjs Chrome for Testing with the extension loaded + persistent CSES login (npm run browser)
scripts/shot.mjs   attaches to that browser and screenshots a CSES page
scripts/users.mjs  rebuilds data/users.txt from CSES's ranking with the test browser's session (~1 page/s, resumable)
scripts/smoke.mjs  logged-in smoke test on live CSES in that browser (npm run smoke)
scripts/store-shots.mjs  store screenshots (1280x800, both themes, demo team of public ranking users) into store/
store/listing.md   store listing text; scripts/store-listing.mjs puts it and store/*.png in the Developer Dashboard (test browser signed in to Google; listing locked while a version is in review)
scripts/ship.mjs   bump version + commit + push (triggers the release workflow on main)
BACKLOG.md         planned UX work, in order
```

## How the code works

- `src/*.js` are classic scripts sharing one isolated world: top-level declarations are global across files. A file may only use, at load time, what earlier files declared (calls inside functions are fine). No `import`/`export`.
- `state.data` holds one row per task (`li`, `taskId`, `topic`, `solved`, `solvedBy`, `solvedCount`, ...). `solved` is the user's own status (CSES's green check, never modified); `solvedBy` is a Set of color slots of the shown teammates who solved it. `state.team` members are `{ id, label, slot, hidden, status, set, solved }`; `slot` (0-5) is the color and never changes while the member stays; after changing the team call `teamChanged()` (saves, re-renders chips, recomputes solvedBy, refreshes once per frame).
- `state.filter` is one of `FILTERS` (core.js).
- Team feedback goes through per-chip status, `teamMessage`, `askTeam` and `announce` (screen readers) in `ui.js` (no `alert()`/`confirm()`).
- `isVisible(row)` is the only place that decides whether a row is shown; add new filters there.
- After changing `state.data`, call `refresh()`.
- DOM ids are prefixed with `ID` (`pacha-cses-tools-ext`). localStorage keys live in `STORAGE_KEYS`.
- CSES markup we depend on. If CSES changes, start in `extractAll`, `fetchSolvedSet` and `resolveFriendId`:
  - Problem set: `h2` + `ul.task-list > li.task`, `span.detail` ("solved / attempts"), `span.task-score.full`.
  - Own user id: `.controls a.account[href*='/user/']`.
  - User ranking `/problemset/stats/p/<n>` (logged in): `table tr` with `a[href^='/problemset/user/']` and the solved count in the 3rd cell.
  - Friends ranking `/problemset/stats/friends/`: same table, the user's friends (suggestions and solved counts).
  - Teammate page `/problemset/user/<id>/`: `table.course-user-solved a.task-score.icon.full`.
  - Friends page `/user/<id>/friends/`: `table a[href^='/user/']`, form with `input[name=csrf_token]` and POST field `add`.

## Known behavior (intentional unless the owner says otherwise)

- Teammates are resolved from numeric ids, data/users.txt and the user's CSES friends. Only the explicit "Look up “x” on CSES" suggestion **adds that user as a CSES friend** to resolve their id; the first time it asks inline (consent in `STORAGE_KEYS.friendConsent`). A typed name that resolves to nothing is never added.
- At most 6 teammates (one color each). Enter takes the highlighted suggestion only when it is a typed id or a name starting with the text; otherwise it resolves the exact text or says how to look it up.
- A team of 2+ kept for 10 s (or when the tab is hidden/closed) becomes a recent team (5 kept, 3 shown). The ☆ at the end of the field, or on a recent-team suggestion, saves a team (★, kept until unstarred, listed first). The empty field offers saved teams, recent teams, recent teammates, then all friends. The old comma-separated `mates` key is migrated once.
- Topic badges show only in the sorted list (`.hide-topic-badge` hides them in CSES's own lists). In the sorted list the columns are name, topic, team dots, solves, status (CSS `order`). In CSES's own lists a topic whose tasks are all filtered out is hidden (`.pacha-empty`).
- The script runs on every `/problemset*` page; on pages without task lists the MutationObserver in `main.js` never disconnects.

## Working on it

- `npm install` once. `npm run pack` is the only automated check (syntax + duplicate top-level names); there are no tests.
- Test in a real browser: `npm run browser` opens Chrome for Testing (install once: `npx @puppeteer/browsers install chrome@stable --path ~/.cft`) with this folder loaded and a persistent profile in `~/.cses-pacha-profile` (log in to CSES there once). `node scripts/shot.mjs out.png [url] [--dark|--light]` screenshots it. Both reload the extension first, so no restart is needed after editing `src/`. `npm run smoke` checks toolbar, own solved count and the team chips (add from suggestions, hide, remove) while logged in, and puts the user's team back.
- Adding a JS file: create it in `src/` and add it to `content_scripts[0].js` in `manifest.json` before `src/main.js`.
- New permissions or host matches trigger extra Chrome Web Store review; avoid unless needed.
- Keep it dependency-free at runtime.

## Release

`npm run ship -- "commit message"` bumps the patch version, validates, commits everything and pushes. On `main`, that push triggers `.github/workflows/release.yml`, which submits it to the store, at most one version in review at a time (the store rejects a version it already has, so every release needs a bump). Setup and manual alternatives: "Publishing" in README.md.
