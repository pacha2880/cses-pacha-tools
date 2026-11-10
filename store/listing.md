# Chrome Web Store listing

Source of truth for the store listing (the dashboard locks it while a version is in review: `npm run release -- --cancel` first, or update it right after a review ends) (the API cannot set it; paste it in the Developer Dashboard → Store listing). Screenshots: `node scripts/store-shots.mjs` (1280x800, logged in, both CSES themes).

## Name (from manifest.json)

CSES Pacha Tools – Sort and Filter

## Summary (from manifest.json, max 132 chars)

Adds controls to CSES to sort by number of solves, hide solved problems, show topics and paint your team's progress.

## Category

Tools (Developer Tools)

## Description

Practice the CSES Problem Set (cses.fi/problemset) more efficiently. CSES Pacha Tools adds a small toolbar above the task list that looks and feels like CSES itself, in both its light and dark themes.

Features
• By topic | By solves: switch between CSES's usual topic lists and one list of all 400 tasks sorted by how many people solved them, so you can pick the most approachable problem next. Your choice is remembered.
• Filter: show all, hide what you solved, hide what anyone on your team solved, or only what your team solved and you didn't (ask them!).
• Team: type your teammates' CSES user IDs or usernames (comma-separated). Each problem gets one colored dot per teammate (filled = solved), and the counts show "Me 221 · Team 243 · Nobody 157". Your own green checks stay yours. Press Enter to apply; clear the box (or its ×) to remove the team.

Notes
• The team feature needs you to be logged in to CSES, because CSES only shows other users' statistics to logged-in users.
• Usernames are resolved through your CSES friends list: if a teammate is not your CSES friend yet, the extension adds them as a friend to look up their user ID. Use numeric user IDs to avoid this.

Privacy
• No data collection, no analytics, no remote code. Settings are stored locally in your browser. The extension only talks to cses.fi, with your existing session.
• Privacy policy: https://github.com/pacha2880/cses-pacha-tools/blob/main/PRIVACY.md

Open source: https://github.com/pacha2880/cses-pacha-tools
Not affiliated with CSES.
