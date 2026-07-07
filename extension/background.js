// AuraFocus Service Worker (background.js)

const EDUCATIONAL_DOMAINS = [
  "wikipedia.org",
  "khanacademy.org",
  "coursera.org",
  "edx.org",
  "duolingo.com",
  "quizlet.com",
  "stackoverflow.com",
  "github.com",
  "google.com",
  "w3schools.com",
  "developer.mozilla.org",
  "docs.microsoft.com",
  "arxiv.org",
  "scholar.google.com",
  "nih.gov",
  "nasa.gov",
  "britannica.com",
  "mit.edu",
  "stanford.edu",
  "harvard.edu",
  "berkeley.edu",
  "quora.com",
  "medium.com",
  
  // Kid-friendly search engines
  "kiddle.co",
  "kiddle.com",
  
  // Library databases and research tools
  "gale.com",
  "galegroup.com",
  "ebsco.com",
  "ebscohost.com",
  "jstor.org",
  "proquest.com",
  "loc.gov",
  
  // School Learning Management Systems (LMS)
  "instructure.com",
  "canvas.instructure.com",
  "classroom.google.com",
  
  // School single sign-on (SSO) and portals
  "clever.com",
  "classlink.com",
  
  // Educational interactive platforms & tools
  "kahoot.com",
  "kahoot.it",
  "desmos.com",
  "geogebra.org",
  "ixl.com",
  "brainpop.com",
  "pebblego.com",
  "scholastic.com",
  "discoveryeducation.com",
  "seesaw.me",
  
  // Writing and study aids
  "grammarly.com",
  "turnitin.com",
  "ck12.org",
  "typing.com",
  "typingclub.com",
  "soraapp.com",
  "overdrive.com"
];

// Helper to get extension state
async function getExtensionState() {
  const result = await chrome.storage.local.get([
    "isFocusActive",
    "sessionEndTime",
    "allowedUrls",
    "password",
    "parentPassword",
    "focusMode",
    "modeLocked",
    "accountToken",
    "accountUser"
  ]);

  return {
    isFocusActive: result.isFocusActive || false,
    sessionEndTime: result.sessionEndTime || 0,
    allowedUrls: result.allowedUrls || [],
    hasPassword: !!result.password,
    hasParentPassword: !!result.parentPassword,
    focusMode: result.focusMode || "self",
    modeLocked: !!result.modeLocked,
    hasAccount: !!(result.accountToken || result.accountUser)
  };
}

// Redirect all open tabs that are on blocked sites
async function redirectActiveBlockedTabs(allowedUrls) {
  const tabs = await chrome.tabs.query({});
  const normalizedDomains = allowedUrls.map(url => url.replace(/^(https?:\/\/)?(www\.)?/, "").split('/')[0]).filter(Boolean);
  const eduDomains = EDUCATIONAL_DOMAINS.map(d => d.split('/')[0]);
  const excluded = [...new Set([...eduDomains, ...normalizedDomains])];

  for (const tab of tabs) {
    if (tab.url) {
      try {
        const url = new URL(tab.url);
        // Skip chrome://, about:, extension pages etc.
        if (url.protocol !== "http:" && url.protocol !== "https:") continue;

        const hostname = url.hostname.toLowerCase();
        const hostNoWww = hostname.startsWith("www.") ? hostname.substring(4) : hostname;

        // Check if hostname is excluded
        let isAllowed = false;
        for (const dom of excluded) {
          if (hostNoWww === dom || hostNoWww.endsWith("." + dom)) {
            isAllowed = true;
            break;
          }
        }

        if (!isAllowed) {
          chrome.tabs.update(tab.id, {
            url: chrome.runtime.getURL(`blocked.html?url=${encodeURIComponent(tab.url)}`)
          });
        }
      } catch (e) {
        // Ignore invalid urls
      }
    }
  }
}

// Clear blocking rules in Declarative Net Request
async function clearBlockingRules() {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  const ids = rules.map(r => r.id);
  if (ids.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: ids
    });
  }
}

// Apply blocking rules in Declarative Net Request
async function updateBlockingRules(allowedUrls) {
  // Clear existing first
  await clearBlockingRules();

  // Normalize whitelist domains to raw hostnames
  const normalizedDomains = allowedUrls.map(url => {
    let d = url.replace(/^(https?:\/\/)?(www\.)?/, "");
    d = d.split('/')[0];
    return d;
  }).filter(Boolean);

  // Parse educational domains to hostnames
  const eduDomains = EDUCATIONAL_DOMAINS.map(d => d.split('/')[0]);

  // Combine to find unique excluded domains
  const excludedDomains = [...new Set([...eduDomains, ...normalizedDomains])];

  const rulesToAdd = [];

  // Rule 1 (Priority 1): Redirect all HTTP/HTTPS main_frame requests to blocked.html
  rulesToAdd.push({
    id: 1,
    priority: 1,
    action: {
      type: "redirect",
      redirect: {
        regexSubstitution: chrome.runtime.getURL("blocked.html") + "?url=\\1"
      }
    },
    condition: {
      regexFilter: "^(https?://.*)",
      resourceTypes: ["main_frame"]
    }
  });

  // Create an explicit allow rule for each allowed domain (Priority 2, bypasses Rule 1)
  // urlFilter: "||domain" matches the domain and all of its subdomains natively!
  excludedDomains.forEach((domain, index) => {
    rulesToAdd.push({
      id: 100 + index, // IDs must be unique
      priority: 2,
      action: {
        type: "allow"
      },
      condition: {
        urlFilter: "||" + domain,
        resourceTypes: ["main_frame"]
      }
    });
  });

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: rulesToAdd
  });
}

// Clean up and end focus session
async function endFocusSession(notified = true) {
  await chrome.storage.local.set({ 
    isFocusActive: false, 
    sessionEndTime: 0,
    showFeedbackPrompt: true
  });
  await chrome.alarms.clear("focusTimer");
  await clearBlockingRules();
  
  if (notified) {
    chrome.notifications.create("focus-ended", {
      type: "basic",
      iconUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      title: "Focus Session Completed! 🎉",
      message: "Excellent job staying focused! Your locked session has ended.",
      priority: 2
    });

    // Programmatically open popup.html in a standalone window to prompt for feedback
    try {
      chrome.windows.create({
        url: chrome.runtime.getURL("popup.html"),
        type: "popup",
        width: 360,
        height: 600,
        focused: true
      });
    } catch (e) {
      console.error("Failed to open feedback popup window:", e);
    }
  }

  // Notify any open popup or blocked pages
  try {
    chrome.runtime.sendMessage({ type: "SESSION_ENDED" });
  } catch (e) {
    // Popup might not be open, ignore error
  }
}

// Refresh rules based on current state
async function refreshBlockingRules() {
  const state = await getExtensionState();
  if (state.isFocusActive && Date.now() < state.sessionEndTime) {
    await updateBlockingRules(state.allowedUrls);
  } else {
    if (state.isFocusActive) {
      await endFocusSession(false);
    } else {
      await clearBlockingRules();
    }
  }
}

// Alarm Listener
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "focusTimer") {
    await endFocusSession(true);
  }
});

// Extension Startup listeners
chrome.runtime.onStartup.addListener(refreshBlockingRules);
chrome.runtime.onInstalled.addListener(refreshBlockingRules);

// Message Handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessages(request).then(response => sendResponse(response));
  return true; // Keep message channel open for async responses
});

async function handleMessages(request) {
  try {
    const state = await getExtensionState();
    
    if (request.type === "GET_STATE") {
      return { success: true, state };
    }
    
    else if (request.type === "SET_PASSWORD") {
      if (state.hasPassword) {
        return { success: false, error: "Password is already configured." };
      }
      await chrome.storage.local.set({
        password: request.password,
        focusMode: request.focusMode || "self"
      });
      return { success: true };
    }

    else if (request.type === "SET_PARENT_PASSWORD") {
      if (state.focusMode !== "parent") {
        return { success: false, error: "Switch to parent mode before setting a parent password." };
      }
      if (typeof request.parentPassword !== "string" || request.parentPassword.length < 4) {
        return { success: false, error: "Parent password must be at least 4 characters." };
      }
      await chrome.storage.local.set({ parentPassword: request.parentPassword });
      return { success: true };
    }

    else if (request.type === "VERIFY_PARENT_PASSWORD") {
      const storage = await chrome.storage.local.get("parentPassword");
      if (!storage.parentPassword || storage.parentPassword !== request.parentPassword) {
        return { success: false, error: "Incorrect parent password." };
      }
      return { success: true };
    }
    
    else if (request.type === "CHANGE_PASSWORD") {
      const storage = await chrome.storage.local.get("password");
      if (storage.password !== request.oldPassword) {
        return { success: false, error: "Incorrect old password." };
      }
      await chrome.storage.local.set({ password: request.newPassword });
      return { success: true };
    }
    
    else if (request.type === "START_SESSION") {
      if (!state.hasPassword) {
        return { success: false, error: "Please configure a lock password first." };
      }
      if (state.isFocusActive && Date.now() < state.sessionEndTime) {
        return { success: false, error: "Focus session is already running." };
      }

      const durationSec = request.durationSeconds;
      const endTime = Date.now() + durationSec * 1000;
      const allowedUrls = request.allowedUrls || [];

      await chrome.storage.local.set({
        isFocusActive: true,
        sessionEndTime: endTime,
        allowedUrls: allowedUrls
      });

      // Set alarm
      await chrome.alarms.create("focusTimer", { when: endTime });

      // Apply network redirect rules
      await updateBlockingRules(allowedUrls);

      // Scan and redirect existing tabs
      await redirectActiveBlockedTabs(allowedUrls);

      return { success: true, sessionEndTime: endTime };
    }
    
    else if (request.type === "STOP_SESSION") {
      const storage = await chrome.storage.local.get(["password", "parentPassword", "focusMode"]);
      const controlPassword = storage.focusMode === "parent" ? storage.parentPassword : storage.password;
      if (!controlPassword || controlPassword !== request.password) {
        return { success: false, error: "Incorrect password. Stay focused!" };
      }

      await endFocusSession(false);
      return { success: true };
    }
    
    else if (request.type === "UPDATE_WHITELIST") {
      if (state.focusMode === "child" && state.isFocusActive && Date.now() < state.sessionEndTime) {
        return { success: false, error: "Whitelist changes are disabled in child mode during an active session." };
      }

      // If focus is active, we require the password to modify the whitelist
      if (state.isFocusActive && Date.now() < state.sessionEndTime) {
        const storage = await chrome.storage.local.get(["password", "parentPassword", "focusMode"]);
        const controlPassword = storage.focusMode === "parent" ? storage.parentPassword : storage.password;
        if (!controlPassword || controlPassword !== request.password) {
          return { success: false, error: "Incorrect password. Cannot modify blocklist during active session." };
        }
      }

      await chrome.storage.local.set({ allowedUrls: request.allowedUrls });
      
      // If active, re-apply blocking rules with new whitelist
      if (state.isFocusActive && Date.now() < state.sessionEndTime) {
        await updateBlockingRules(request.allowedUrls);
        await redirectActiveBlockedTabs(request.allowedUrls);
      }
      
      return { success: true };
    }

    else if (request.type === "SET_FOCUS_MODE") {
      if (state.modeLocked) {
        return { success: false, error: "Focus mode is locked after child sync and cannot be changed on this device." };
      }

      const nextMode = ["self", "parent", "child"].includes(request.focusMode)
        ? request.focusMode
        : "self";

      await chrome.storage.local.set({ focusMode: nextMode });
      return { success: true, focusMode: nextMode };
    }

    else if (request.type === "RESTORE_PROGRESS") {
      if (state.isFocusActive && Date.now() < state.sessionEndTime) {
        return { success: false, error: "Stop the active focus session before restoring synced progress." };
      }

      const progress = request.progress || {};
      const existing = await chrome.storage.local.get(["accountToken"]);
      await chrome.storage.local.set({
        allowedUrls: Array.isArray(progress.allowedUrls) ? progress.allowedUrls : [],
        whitelistHistory: Array.isArray(progress.whitelistHistory) ? progress.whitelistHistory : [],
        feedbackHistory: Array.isArray(progress.feedbackHistory) ? progress.feedbackHistory : [],
        password: typeof progress.lockPassword === "string" ? progress.lockPassword : "",
        parentPassword: typeof progress.parentPassword === "string" ? progress.parentPassword : "",
        modeLocked: !!progress.modeLocked,
        accountToken: typeof progress.accountToken === "string"
          ? progress.accountToken
          : typeof existing.accountToken === "string"
            ? existing.accountToken
            : "",
        focusMode: ["self", "parent", "child"].includes(progress.focusMode) ? progress.focusMode : "self",
        permanentFeedback: progress.permanentFeedback && typeof progress.permanentFeedback === "object"
          ? progress.permanentFeedback
          : { rating: 0, thumb: null, comments: "" }
      });
      return { success: true };
    }
    
    return { success: false, error: "Unknown message type." };
  } catch (err) {
    console.error("Error handling message:", err);
    return { success: false, error: err.message };
  }
}
