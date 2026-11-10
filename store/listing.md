# Chrome Web Store listing

Source of truth for the store listing (the API cannot set it; paste it in the Developer Dashboard → Store listing). Screenshots: `node scripts/store-shots.mjs` (1280x800, logged in, both CSES themes).

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
• Hide solved: show only what is left to do, in either view.
• Progress at a glance: "Showing 179/400 · Solved 221".
• Team: type your teammates' CSES user IDs or usernames (comma-separated) and see the tasks any of you has solved. Press Enter to apply; clear the box (or its ×) to go back to your own progress.

Notes
• The team feature needs you to be logged in to CSES, because CSES only shows other users' statistics to logged-in users.
• Usernames are resolved through your CSES friends list: if a teammate is not your CSES friend yet, the extension adds them as a friend to look up their user ID. Use numeric user IDs to avoid this.

Privacy
• No data collection, no analytics, no remote code. Settings are stored locally in your browser. The extension only talks to cses.fi, with your existing session.
• Privacy policy: https://github.com/pacha2880/cses-pacha-tools/blob/main/PRIVACY.md

Open source: https://github.com/pacha2880/cses-pacha-tools
Not affiliated with CSES.
