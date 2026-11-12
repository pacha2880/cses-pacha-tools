# Chrome Web Store listing

Source of truth for the store listing (the dashboard locks it while a version is in review: `npm run release -- --cancel` first, or update it right after a review ends) (the API cannot set it; paste it in the Developer Dashboard → Store listing). Screenshots: `node scripts/store-shots.mjs` (1280x800, logged in, both CSES themes).

## Name (from manifest.json)

CSES Pacha Tools – Sort and Filter

## Summary (from manifest.json, max 132 chars)

Stalk your friends' CSES progress 👀 and find the easiest problems you haven't solved yet.

## Category

Education

## Description

Which CSES problem should you solve next? The one everyone else already solved.

• Sort all 400 problems by number of solves
• Hide what you, or your team, already solved
• See who solved what: one colored dot per friend
• Save your teams with a ★

Works in CSES's light and dark themes. Free and open source, no tracking.

Can't find someone? It can look them up by adding them as a CSES friend (it asks first).

Privacy policy: https://github.com/pacha2880/cses-pacha-tools/blob/main/PRIVACY.md
