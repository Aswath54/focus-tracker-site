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

For Auth0 login to work, set these environment variables:
- `SECRET`
- `BASE_URL`
- `CLIENT_ID`
- `CLIENT_SECRET`
- `ISSUER_BASE_URL`

## Deploying on Railway
1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
3. Select this repo — Railway auto-detects Node.js and runs `npm start`
4. Done! Railway will give you a public URL.

Set the same Auth0 environment variables in Railway, and make sure `BASE_URL` matches the deployed Railway URL.

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
