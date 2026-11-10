# Backlog

Planned UX work, in the order to do it. Each item is small enough for one agent session. Law names refer to https://lawsofux.com/.

Design rules for every item:

- Look like CSES, not like a separate app: reuse its markup, fonts and colors (Jakob's Law).
- Never hardcode light colors. CSES has its own dark mode (header toggle; state in `#darkmode-enabled`, `theme-changed` event on `document`), independent of the browser's. Prefer `color: inherit`, `currentColor` borders and translucent backgrounds so no theme detection is needed.
- Never signal state by color alone; pair it with a shape, icon or text.
- Every action gives visible feedback in under 400 ms (Doherty Threshold). No `alert()`.

## 1. Toolbar cleanup

Today: 6 buttons + 1 input in one row that wraps badly in CSES's 650px column; white box in dark mode.

- [x] Replace "Sort by solves" + "Restore view" with one two-option switch: `By topic | By solves`. The active option is highlighted, so the current view is always visible (Hick's Law: 2 buttons → 1 control).
- [x] Replace the "Hide solved: ON/OFF" button with a checkbox "Hide solved". A button whose label is its state is ambiguous: does "ON" describe now, or what a click does?
- [x] Remove "Clear team". Applying an empty team box clears it; add a small `×` inside the box.
- [x] Enter in the team box applies it.
- [x] Lay out in two rows that never wrap mid-label: row 1 view + filter + stats, row 2 team (Proximity / Common Region).
- [x] Theme-proof colors (see design rules). Check both CSES themes.
- [x] Remember the chosen view across reloads, like "Hide solved" already is.

## 2. Team feedback and fixes

- [x] While teammates load: disable the Apply button and show "Loading 2/3…" in the stats area.
- [x] Replace `alert()` with an inline message under the team row.
- [x] Say which entries failed ("Not found: Bob"). Today they are dropped silently.
- [x] The team feature needs a logged-in CSES user (teammate pages answer "Please login to see the statistics", for numeric IDs too). When logged out, say "Log in to CSES to use Team". Today nothing happens.
- [x] Adding a CSES friend is a side effect on the user's account: ask once before the first time ("Usernames are looked up through your CSES friends list. Add Bob as a friend?").
- [x] Fix: applying a team in the topic view must re-apply "Hide solved" (call `showOriginal()` from `refresh()`).
- [x] Placeholder: "Teammate IDs or usernames, comma-separated".

## 3. Team as a separate layer (replaces "paint")

Problem: painting turns teammates' solves into the user's own green check. The user can no longer tell what *they* still have to solve, and "Solved: N" mixes both.

Model: never overwrite the user's own status. Each task has two independent facts: solved by me, and solved by which teammates.

- [x] Keep CSES's green check for "solved by me" untouched.
- [x] Next to it, show the team: one small dot per teammate (fixed color and position per person, filled = solved, name in the tooltip). For more than 4 teammates show a count instead ("3/6").
- [x] Replace the "Hide solved" checkbox with one selector, which covers every use case without an "include me" option:
  - `Show all`
  - `Hide solved by me` (my own to-do list)
  - `Hide solved by anyone` (what the whole team still lacks; today's behavior)
  - `Only solved by team, not by me` (what I can ask a teammate about)
- [x] Stats: `Me 134 · Team 180 · Nobody 220` instead of one mixed number.
- [x] Rename the feature in the UI from "Paint team" to "Team".

Data model: `row.solvedBy` (Set of teammate ids) next to `row.baseSolved`; `row.solved` and the `data-pacha-painted` mechanism go away. All filtering stays in `isVisible`.

## 4. Sorted view that looks like CSES

- [x] Render "By solves" as one `ul.task-list` built from clones of the original `li.task` elements instead of a custom table. It inherits CSES styling, dark mode, the status icons and the team dots for free, and removes the table CSS.
- [x] Show the topic badge there (the badges exist but are currently hidden in both views).

## 5. Store polish

- [x] Update the store listing to English (name, description, screenshots); the UI is English since 1.2.0.
- [x] Add 16px and 48px icons.
- [x] New screenshots (light and dark) and a listing text that mentions the friends-list behavior.
