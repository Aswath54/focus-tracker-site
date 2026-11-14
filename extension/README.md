# AuraFocus Extension Guide

## What AuraFocus Does

AuraFocus is a Chromium browser extension that starts timed focus sessions and blocks websites that are not on the allowed list.

### Focus modes

- **Self:** Personal use. Set allowed websites, create a session password, and start your own timer.
- **Parent:** Sign in with Google, create a Sync password, and control a linked child device remotely. Only Parent mode can stop a locked child session.
- **Child:** Sign in with the child’s Google account, select Child mode, and enter a parent account email and the Sync password created by that parent. The child device receives and applies the parent’s sessions.

Each child account can link to multiple parent accounts, and each parent can link to multiple children. Repeat the Child Sync form with each parent’s email and Sync password. The Parent Timer panel lets a parent select which linked child receives a session.

## Download and Install

1. Open the AuraFocus website.
2. Click **Download** or **Download for Any Computer (.zip)**.
3. Save the ZIP file and choose **Extract All**.
4. Open Chrome and go to `chrome://extensions` (or `edge://extensions` in Edge).
5. Turn on **Developer mode**.
6. Click **Load unpacked**.
7. Select the extracted folder containing `manifest.json`.
8. Pin AuraFocus from the browser’s Extensions menu.

## First-time setup

1. Click the AuraFocus icon and select Self, Parent, or Child mode.
2. Select **Continue with Google** and complete sign-in.
3. In Self mode, create a session password.
4. For Parent/Child use, sign in to each device with that person’s Google account.
5. On each Parent account, create a Sync password.
6. On the Child device, enter a parent’s email and Sync password in Child Sync. Repeat to add other parents.
7. On the Parent device, select a linked child, choose a timer, and click **Start Child Session**. Repeat Child Sync from additional child accounts to link multiple children.

The extension must remain installed and enabled. The child device needs an internet connection to receive parent sessions. Only the Parent device can stop a synced locked session. After updating the extension, reload it from `chrome://extensions`.
