# AuraFocus Extension Guide

## Page 1 — What AuraFocus Does

AuraFocus is a Chromium browser extension that helps you stay focused by starting timed focus sessions and blocking websites that are not on your allowed list. During a session, blocked pages are redirected to the AuraFocus lock screen. The lock remains active until the timer ends or an authorized person stops it.

### The three focus modes

**Self mode** is for personal use. You choose the allowed websites, set a timer, and create a session password. The password is required to stop the session early or change the block list while the timer is active.

**Parent mode** is used to control a linked child device. The parent signs in with Google, creates a Sync password, and starts the child’s timer remotely. The parent browser does not become blocked. Only Parent mode can stop a locked child session.

**Child mode** is used on the device that should be controlled. The child signs in with Google, selects Child mode, and enters the Sync password created by the parent. After sync is unlocked, the child device receives the parent’s focus sessions and applies the blocking locally. The child cannot stop a locked session.

### How synchronization works

The extension syncs the account’s settings and focus-session status through the AuraFocus website. The parent and child devices must use the same Google account. The child device checks for an active parent session periodically. When a parent starts a timer, the child device applies the allowed-site list and starts its local lock.

The Sync password is separate from the Google password. It is created in Parent mode and entered once in Child mode to unlock synchronization on that device. Keep it private and do not share it with the child if the child should not be able to change parent settings.

### Sessions and feedback

When a session ends, AuraFocus can ask the user to rate it. The feedback prompt can be submitted immediately or postponed with “Maybe Later.” Saved feedback remains available after the session prompt is completed.

<div style="page-break-after: always;"></div>

# AuraFocus Extension Guide

## Page 2 — Download and Install

### Download from the website

1. Open the AuraFocus website in Chrome or another Chromium-based browser.
2. Select **Download** or **Download for Any Computer (.zip)**.
3. Save the downloaded ZIP file somewhere easy to find, such as the Downloads folder.
4. Right-click the ZIP file and choose **Extract All**. Remember the extracted folder location.

The download is generated from the current extension files on the website. Do not delete or move the extracted folder after installation unless you plan to load it again from its new location.

### Install in Chrome, Edge, or another Chromium browser

1. Open the browser’s extensions page: `chrome://extensions` in Chrome or `edge://extensions` in Edge.
2. Turn on **Developer mode** using the toggle, usually in the upper-right corner.
3. Click **Load unpacked**.
4. Select the extracted AuraFocus extension folder—the folder containing `manifest.json`.
5. Confirm that **AuraFocus Tracker** appears in the extensions list.
6. Click the puzzle-piece Extensions button and pin AuraFocus for easy access.

### First-time setup

1. Click the AuraFocus icon.
2. Select **Self**, **Parent**, or **Child** mode.
3. Choose **Continue with Google** and complete sign-in.
4. In Self mode, create a session password and configure your allowed websites.
5. For Parent/Child use, sign in on both devices with the same Google account.
6. On the Parent device, select Parent mode and create the Sync password.
7. On the Child device, select Child mode and enter that Sync password.
8. On the Parent device, choose the timer and click **Start Child Session**.

### Important notes

- The browser extension must remain installed and enabled for blocking to work.
- The child device needs an internet connection to receive newly started or stopped parent sessions.
- Only the Parent device should use **Stop Child Session** for a synced lock.
- If the extension was updated, return to `chrome://extensions`, click **Reload** on AuraFocus, and reopen the popup.
- If Google sign-in fails, verify that the deployed website URL and extension callback URL are configured in the authentication provider.
