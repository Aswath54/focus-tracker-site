# AuraFocus Tracker Extension 🛡️

A premium, glassmorphic Chrome Extension (Manifest V3) designed to help you stay focused by blocking distracting websites, leaving only your custom whitelisted pages and core educational platforms accessible.

## Core Features
1. **Password-Locked Focus Sessions**: Set a password during setup. Once a focus session starts, it **cannot be turned off or bypassed** unless you enter the correct password.
2. **Selective Blocking (Whitelist)**: Input specific URLs you need for work/focus. All other websites will be blocked.
3. **Always-Allowed Educational Sites**: Standard educational platforms (like Wikipedia, StackOverflow, GitHub, Coursera, and Khan Academy) are automatically allowed so you are never locked out of research or learning tools.
4. **Active Tab Redirection**: Starting a focus session immediately scans and redirects any open distracting tabs.
5. **Aesthetic Block Screen**: Distracting attempts redirect to a beautiful, dark-themed glowing card displaying a countdown timer and randomized motivational focus quotes.
6. **Robust Background Sync**: Built using `chrome.alarms` to ensure sessions track reliably even if Chrome terminates background workers to save memory.

---

## Installation Guide (Chrome / Edge / Brave)

To load and use this extension in your browser:

1. Open your browser and navigate to the extensions page:
   - **Chrome**: Go to `chrome://extensions/`
   - **Edge**: Go to `edge://extensions/`
   - **Brave**: Go to `brave://extensions/`
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click the **Load unpacked** button in the top-left corner.
4. Select the `C:\Users\Aswath\apps\focus-tracker-extension` directory.
5. The extension is now active! Pin it to your toolbar for easy access.

---

## File Structure
* [manifest.json](file:///C:/Users/Aswath/apps/focus-tracker-extension/manifest.json) — Extension definition and permissions (storage, alarms, webNavigation).
* [icon.svg](file:///C:/Users/Aswath/apps/focus-tracker-extension/icon.svg) — Scaleable vector icon representing secure focus.
* [background.js](file:///C:/Users/Aswath/apps/focus-tracker-extension/background.js) — Intercepts navigation, verifies passwords, and coordinates timers.
* [popup.html](file:///C:/Users/Aswath/apps/focus-tracker-extension/popup.html) / [popup.js](file:///C:/Users/Aswath/apps/focus-tracker-extension/popup.js) / [popup.css](file:///C:/Users/Aswath/apps/focus-tracker-extension/popup.css) — Main extension popup dropdown UI.
* [blocked.html](file:///C:/Users/Aswath/apps/focus-tracker-extension/blocked.html) / [blocked.js](file:///C:/Users/Aswath/apps/focus-tracker-extension/blocked.js) / [blocked.css](file:///C:/Users/Aswath/apps/focus-tracker-extension/blocked.css) — The full-page overlay displayed when navigating to blocked sites.

---

## Design Choices & Implementation Details

* **Glassmorphism**: Built using modern CSS styling including `backdrop-filter: blur()`, radial breathing gradients, Orbitron fonts, and drop-shadow glow effects.
* **Security Model**: The password is saved to local chrome storage. Any modification of the active session or edit of the whitelists checks the entered password against the storage key in the background script context to prevent front-end tampering.
* **Persistent States**: Utilizes Manifest V3 `alarms` rather than simple JavaScript intervals in `background.js` since MV3 background workers sleep dynamically.
