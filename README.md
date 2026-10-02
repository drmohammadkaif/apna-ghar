# Apna Ghar

Family credit card and loan tracker. Cloudflare Workers + Durable Object (SQLite) for live sync, installable PWA (Android and iPhone), works offline.

## Deploy
1. Push this repo to GitHub.
2. Cloudflare dashboard: Workers & Pages > Create > import the GitHub repo as a **Worker** (not Pages). Keep the default deploy command `npx wrangler deploy`.
3. Open the `*.workers.dev` link. The database is created automatically on first deploy and first visit.

## Install
- Android (Chrome): open the link and tap Install, or menu > Install app.
- iPhone (Safari): Share > Add to Home Screen.

## Privacy
There is no login, so anyone with the link can see and edit the data. Keep the link private, and for real protection turn on Cloudflare Access (Zero Trust, free for up to 50 users) for this Worker so only your family's emails can open it.

## Local run
`npm install && npm run dev`
