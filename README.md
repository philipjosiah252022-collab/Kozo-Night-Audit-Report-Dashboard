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

## Who can sign in

Each person gets their own **8-character access key**, for example `AB3K7MQZ`. Keys aren't case-sensitive, and spaces or dashes are ignored. They can type it on the login page, or open their personal
one-tap link (`https://<your-site>/access/<key>`), which signs them in for 30 days.

**Give someone access**

```
node scripts/new-key.js "Kwame Asante" https://<your-site>.onrender.com
```

This prints their key, their one-tap link, and a `Name:KEY` entry. Add that entry to the
`ACCESS_TOKENS` setting on Render, separating people with commas:

```
ACCESS_TOKENS=Kwame Asante:AB3K7MQZ,Ama Mensah:R8WN4TXC
```

Then send the person their link or key privately, for example by WhatsApp.

**Remove someone's access**

Delete their entry from `ACCESS_TOKENS` and save. Render redeploys, and the old key, link and any
session already signed in with it stop working.

`DASHBOARD_PASSWORD` is optional: an extra admin login for the night auditor. Set `SESSION_SECRET`
to a long random value so people stay signed in across deploys. The page shows "Signed in as …"
with a sign-out link, and failed attempts are rate-limited: 10 per 15 minutes per device, and logins pause for an hour after 60 wrong attempts from anywhere.

## Running it

```
ACCESS_TOKENS="Your Name:TEST2345" npm start
```

Then open http://localhost:10000/access/TEST2345.

On Render, create a Node web service with build command `npm install` and start command `npm start`,
and set `ACCESS_TOKENS` and `SESSION_SECRET`.

## Deploying on Streamlit Community Cloud

1. Go to **share.streamlit.io**, sign in with GitHub, then click **Create app**.
2. Repository: `philipjosiah252022-collab/Kozo-Night-Audit-Report-Dashboard`. Branch: `main`. Main file: `streamlit_app.py`.
3. Under **Advanced settings → Secrets**, paste one line per person (format shown in `.streamlit/secrets.example.toml`):
   ```
   [access_tokens]
   "Philip Anthony Josiah" = "AB3K7MQZ"
   ```
4. Click **Deploy**.

Each person signs in with their access key, or opens `https://<app>.streamlit.app/?token=<their key>`.
Deleting their line from Secrets withdraws their access. Make new keys with `node scripts/new-key.js "Name"`.

## Data

`src/nights.json` holds every recorded night, and `public/slips/` holds the photos. This repository contains
Kozo's sales figures, staff names and slip photos, so it must stay **private**.
