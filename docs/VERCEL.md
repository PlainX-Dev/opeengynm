# Deploy on Vercel (and install it on your iPhone)

This repo can be hosted on [Vercel](https://vercel.com) as a **static, serverless web app** — no
Docker, no server to run. Open the URL in Safari on your iPhone, tap **Add to Home Screen**, and it
launches full-screen like a native app.

## What you get — and what you don't

The normal openGym needs its Node backend (passkey sign-in, data stored as JSON files on disk),
which can't run on Vercel's serverless platform. So the Vercel build is the **standalone** flavor
(`VITE_STANDALONE=1`, see `frontend/src/lib/standalone.js`), the same model as the mobile app:

| | Vercel (standalone) | Self-hosted (Docker) |
|---|---|---|
| Sign-in / accounts | none — opens straight into the app | passkeys, one profile per person |
| Where your data lives | **this device's browser storage** | your server, synced across devices |
| Sync between phone and laptop | no (use Export / Import) | yes |
| Push notifications, admin dashboard, AI Coach | not available | available |
| Everything else — plans, guided workouts, progression, 1RM, stats, 1,324 exercises, 12 languages, import from Strong/Hevy/FitNotes | ✅ | ✅ |

Exercise images and GIFs (~140 MB) aren't bundled: the app loads them from the upstream dataset on
jsDelivr, pinned to a fixed commit (`frontend/.env.vercel`).

## Deploy

1. Push this repo to GitHub (it already is, if you're reading this there).
2. In Vercel: **Add New… → Project → Import** this repository.
3. Leave every setting as it is. `vercel.json` at the repo root already sets the install command,
   the build command (`npm --prefix frontend run build:vercel`) and the output folder
   (`frontend/dist`). No environment variables are needed.
4. **Deploy.** Vercel gives you a `https://<project>.vercel.app` URL — HTTPS is required for the
   service worker (offline support) and "Add to Home Screen" to work properly, and Vercel provides it.

Every push to the branch you deployed redeploys automatically.

## Install on iPhone

1. Open your Vercel URL in **Safari** (not Chrome or an in-app browser — only Safari can add PWAs
   on iOS).
2. Tap the **Share** button → **Add to Home Screen** → **Add**.
3. Open openGym from the new home-screen icon. It runs without Safari's toolbars.

**Do this before you start logging.** On iOS, the installed app and the Safari tab keep *separate*
browser storage, so anything you entered in Safari won't appear in the home-screen app. If it does
happen, use **Settings → Export** in Safari and **Import** in the installed app.

## Keep your data safe

Because everything is stored on the device, deleting the app, clearing Safari's website data, or
switching phones wipes it. Use **Settings → Export** every now and then and keep the file
somewhere safe (iCloud Drive, Files). **Import** restores it.

## Updating

After a new deploy, the installed app picks up the update the next time it's opened with a
connection — close it fully (swipe it away) and reopen it once or twice.

## Build it yourself

```sh
cd frontend
npm ci
npm run build:vercel     # → frontend/dist, a folder of static files you can host anywhere
```

Any static host works the same way; the app uses hash routes (`/#/plan`), so no rewrite rules
are needed.
