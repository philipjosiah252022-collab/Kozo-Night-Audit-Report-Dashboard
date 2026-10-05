# Kozo Night Audit Report Dashboard

Night-by-night audit reports for Kozo: Restaurant (POS 2), Lounge (POS 3) and Embar.
The dashboard opens on the latest day's sales. A History tab shows every recorded night,
and each day includes photos of the original POS slips and cash-up sheet.

All amounts are Ghana cedis (GH₵). The Tevalis slips print "GBP", but the figures are cedis.

## What's in here

| Path | What it is |
|---|---|
| `server.js` | Small Node server (no dependencies). Serves `public/` behind a password page. |
| `public/index.html` | The built dashboard. |
| `public/slips/` | Slip and cash-up sheet photos, named `YYYY-MM-DD-<till>.jpg`. |
| `src/nights.json` | The data: one entry per business date. |
| `src/body.html`, `src/*.css` | Dashboard layout and styles. |
| `src/build.py` | Rebuilds `public/index.html` from `src/`. |

## Adding a night

1. Add the night's entry to `src/nights.json`, and its photos to `public/slips/`.
2. Run `python3 src/build.py`.
3. Commit and push.

## Running it

```
DASHBOARD_PASSWORD=choose-a-password npm start
```

Then open http://localhost:10000.

On Render, create a Node web service with build command `npm install` and start command
`npm start`, and set the `DASHBOARD_PASSWORD` environment variable. Optionally set
`SESSION_SECRET` too. Sign-ins last 30 days, and failed attempts are rate-limited.

## Data is not stored here

This repository is public, so it holds only the dashboard code. `src/nights.json` is empty and `public/slips/` has no photos.
Kozo's nightly figures and slip photos live in the private Claude-hosted dashboard. Only add them here if the repository is made **private** first.
