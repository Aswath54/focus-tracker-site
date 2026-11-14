# AuraFocus — Focus Tracker Website

Landing page + download server for the [AuraFocus cross-platform Chromium extension](https://github.com/Aswath54/focus-tracker-extension).

## What This Does
- Serves a beautiful landing page for the AuraFocus extension
- Provides a `/download` endpoint that dynamically zips the extension files and serves them as a `.zip` download for Windows, Mac, Linux, and Chromebook users

## Running Locally
```bash
npm install
npm start
```

Then visit `http://localhost:3000`.

For Auth.js Google login, set `AUTH_SECRET`, `AUTH_GOOGLE_ID`, and `AUTH_GOOGLE_SECRET`. Google OAuth credentials can be created in Google Cloud Console; configure the web callback as `https://your-domain.example/api/auth/callback/google` (or `http://localhost:3000/api/auth/callback/google` locally). `AUTH_SECRET` should be a long random value. The legacy `SECRET`, `CLIENT_ID`, and `CLIENT_SECRET` variables remain accepted as fallbacks.

For the admin console, also set:
- `ADMIN_EMAIL`
- `ADMIN_SESSION_SECRET` (recommended)

The admin console now uses the authorized Google account matching `ADMIN_EMAIL`; `ADMIN_PASSWORD_HASH` is no longer used.

For local-account password recovery, configure the public app URL and SMTP delivery:
- `PASSWORD_RESET_BASE_URL` (for example, `https://your-domain.example`)
- `SMTP_HOST`
- `SMTP_PORT` (usually `587`, or `465` with TLS)
- `SMTP_SECURE` (`true` for implicit TLS, otherwise `false`)
- `SMTP_USER`
- `SMTP_PASS`
- `PASSWORD_RESET_FROM` (the sender address)

Password reset links are one-time tokens stored only as SHA-256 hashes and expire after one hour. The forgot-password endpoint returns the same message for existing and non-existing emails. In local development, when SMTP is not configured, the reset link is printed to the server console; production requires SMTP configuration and never exposes the link in the API response.

Google-only authentication also requires `AUTH_EXTENSION_ID` (or the full `AUTH_EXTENSION_REDIRECT_URI`) for the Chrome extension callback. The extension callback format is `https://<extension-id>.chromiumapp.org/callback`; add that exact URL to the Google OAuth client's Authorized redirect URIs.

## Deploying on Railway
1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
3. Select this repo — Railway auto-detects Node.js and runs `npm start`
4. Done! Railway will give you a public URL.

Set the same Auth.js environment variables in Railway. Set `AUTH_URL` to the deployed app URL if automatic host detection is unavailable.
Set the admin variables in Railway too if you want `/admin-login.html` to work.

## Project Structure
```
focus-tracker-site/
├── server.js          # Express server with /download endpoint
├── package.json
├── public/
│   ├── index.html     # Landing page
│   ├── style.css      # Styles
│   └── main.js        # Animations & interactions
└── extension/         # Extension files included in the download zip
    ├── manifest.json
    ├── background.js
    ├── popup.html / popup.css / popup.js
    ├── blocked.html / blocked.css / blocked.js
    └── icon.svg
```
