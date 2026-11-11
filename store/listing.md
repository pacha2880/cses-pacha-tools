# Chrome Web Store listing

Source of truth for the store listing (the dashboard locks it while a version is in review: `npm run release -- --cancel` first, or update it right after a review ends) (the API cannot set it; paste it in the Developer Dashboard → Store listing). Screenshots: `node scripts/store-shots.mjs` (1280x800, logged in, both CSES themes).

## Name (from manifest.json)

CSES Pacha Tools – Sort and Filter

## Summary (from manifest.json, max 132 chars)

Sort CSES problems by number of solves, filter out what you or your team solved, and see each teammate's progress.

## Category

Education

## Description

Practice the CSES Problem Set (cses.fi/problemset) more efficiently. CSES Pacha Tools adds a small toolbar above the task list that looks and feels like CSES itself, in both its light and dark themes.

Features
• By topic | By solves: switch between CSES's usual topic lists and one list of all 400 tasks sorted by how many people solved them, so you can pick the most approachable problem next. Your choice is remembered.
• Filter: show all, hide what you solved, hide what your team solved, hide what anyone solved, or only what your team solved and you didn't (ask them!).
• Team: start typing a teammate's name and pick them from the suggestions (your CSES friends, recent teammates and teams, teams you starred, and every CSES user with 5+ solved tasks). Each problem gets one colored dot per teammate (filled = solved), and the counts show "Me 221 · Team 243 · Nobody 157". Click a teammate's chip to hide them for a moment, × to remove. Your own green checks stay yours.

Notes
• The team feature needs you to be logged in to CSES, because CSES only shows other users' statistics to logged-in users.
• Users missing from the bundled list (new accounts) can be looked up through your CSES friends list: the extension asks, then adds them as a CSES friend to find their user ID. Numeric user IDs always work.

Privacy
• No data collection, no analytics, no remote code. Settings are stored locally in your browser. The extension only talks to cses.fi, with your existing session.
• Privacy policy: https://github.com/pacha2880/cses-pacha-tools/blob/main/PRIVACY.md

Open source: https://github.com/pacha2880/cses-pacha-tools
Not affiliated with CSES.
