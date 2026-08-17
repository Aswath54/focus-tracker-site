// AuraFocus Service Worker (background.js)

const DEFAULT_BACKEND_URL = "https://focus-tracker-site-production-628b.up.railway.app";
const REMOTE_FOCUS_SESSION_ALARM = "remote-focus-session-sync";
const REMOTE_FOCUS_SESSION_PERIOD_MINUTES = 0.5;

// Site activity is tracked only for the active browser tab while a focus
// session is running. The timestamps and accumulated durations are persisted
// so tracking survives service-worker restarts.
let siteActivityOperation = Promise.resolve();

function withSiteActivityLock(operation) {
  const nextOperation = siteActivityOperation.then(operation, operation);
  siteActivityOperation = nextOperation.catch(() => {});
  return nextOperation;
}

function getTrackableDomain(tab) {
  try {
    const url = new URL(tab && tab.url ? tab.url : "");
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch (error) {
    return "";
  }
}

function normalizeSiteActivity(activity) {
  if (!activity || typeof activity !== "object" || Array.isArray(activity)) return {};

  return Object.entries(activity).reduce((normalized, [domain, milliseconds]) => {
    const duration = Number(milliseconds);
    if (domain && Number.isFinite(duration) && duration > 0) {
      normalized[domain] = duration;
    }
    return normalized;
  }, {});
}

function addElapsedSiteActivity(activity, domain, startedAt, now) {
  const start = Number(startedAt);
  if (!domain || !Number.isFinite(start) || start <= 0) return;

  const elapsed = Math.max(0, now - start);
  if (elapsed > 0) {
    activity[domain] = (Number(activity[domain]) || 0) + elapsed;
  }
}

async function getActiveWebTab() {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tabs.find((tab) => getTrackableDomain(tab)) || null;
}

async function refreshActiveSiteTracking() {
  return withSiteActivityLock(async () => {
    const state = await chrome.storage.local.get([
      "isFocusActive",
      "sessionEndTime",
      "sessionSiteActivity",
      "activityTabId",
      "activityDomain",
      "activityStartedAt"
    ]);
    if (!state.isFocusActive || (state.sessionEndTime && Date.now() >= state.sessionEndTime)) {
      return normalizeSiteActivity(state.sessionSiteActivity);
    }

    const activeTab = await getActiveWebTab();
    const nextDomain = getTrackableDomain(activeTab);
    const now = Date.now();
    const activity = normalizeSiteActivity(state.sessionSiteActivity);
    const previousDomain = typeof state.activityDomain === "string" ? state.activityDomain : "";
    const previousStartedAt = Number(state.activityStartedAt);

    if (previousDomain && previousDomain !== nextDomain) {
      addElapsedSiteActivity(activity, previousDomain, previousStartedAt, now);
    }

    await chrome.storage.local.set({
      sessionSiteActivity: activity,
      activityTabId: nextDomain && activeTab ? activeTab.id : null,
      activityDomain: nextDomain,
      activityStartedAt: nextDomain
        ? (previousDomain === nextDomain && previousStartedAt > 0 ? previousStartedAt : now)
        : 0
    });

    return activity;
  });
}

async function flushActiveSiteActivity() {
  return withSiteActivityLock(async () => {
    const state = await chrome.storage.local.get([
      "isFocusActive",
      "sessionSiteActivity",
      "activityDomain",
      "activityStartedAt"
    ]);
    const activity = normalizeSiteActivity(state.sessionSiteActivity);
    const now = Date.now();

    if (state.isFocusActive) {
      addElapsedSiteActivity(activity, state.activityDomain, state.activityStartedAt, now);
      await chrome.storage.local.set({
        sessionSiteActivity: activity,
        activityStartedAt: state.activityDomain ? now : 0
      });
    }

    return activity;
  });
}

async function finishSiteActivityTracking() {
  return withSiteActivityLock(async () => {
    const state = await chrome.storage.local.get([
      "isFocusActive",
      "activeSessionId",
      "sessionSiteActivity",
      "activityDomain",
      "activityStartedAt"
    ]);
    const activity = normalizeSiteActivity(state.sessionSiteActivity);
    const now = Date.now();

    if (state.isFocusActive) {
      addElapsedSiteActivity(activity, state.activityDomain, state.activityStartedAt, now);
    }

    await chrome.storage.local.set({
      lastSessionSiteActivity: activity,
      lastSessionActivitySessionId: state.activeSessionId || null,
      lastSessionActivityEndedAt: now,
      sessionSiteActivity: {},
      activityTabId: null,
      activityDomain: "",
      activityStartedAt: 0
    });

    return activity;
  });
}

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
    "childLinked",
    "childSyncUnlocked",
    "focusMode",
    "modeLocked",
    "showFeedbackPrompt",
    "feedbackPromptSessionId",
    "accountToken",
    "accountUser"
  ]);

  return {
    isFocusActive: result.isFocusActive || false,
    sessionEndTime: result.sessionEndTime || 0,
    allowedUrls: result.allowedUrls || [],
    hasPassword: !!result.password,
    hasParentPassword: !!result.parentPassword,
    childLinked: !!result.childLinked,
    childSyncUnlocked: !!result.childSyncUnlocked,
    focusMode: result.focusMode || "self",
    modeLocked: !!result.modeLocked,
    showFeedbackPrompt: !!result.showFeedbackPrompt,
    feedbackPromptSessionId: result.feedbackPromptSessionId || null,
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

async function getRemoteBackendUrl() {
  const result = await chrome.storage.local.get("backendUrl");
  const configuredUrl = typeof result.backendUrl === "string" ? result.backendUrl.trim() : "";
  return (configuredUrl || DEFAULT_BACKEND_URL).replace(/\/+$/, "");
}

async function requestRemoteFocusSession(path, options = {}) {
  const account = await chrome.storage.local.get("accountToken");
  if (!account.accountToken) {
    return { skipped: true, error: "Sign in with Google before syncing focus sessions." };
  }

  const headers = {
    Authorization: `Bearer ${account.accountToken}`
  };
  const requestOptions = {
    method: options.method || "GET",
    headers
  };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    requestOptions.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(`${await getRemoteBackendUrl()}${path}`, requestOptions);
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    console.warn("Remote focus session request failed:", error.message);
    return { ok: false, error: "Could not reach the account sync server." };
  }
}

async function applyLocalFocusSession(session, remote = false) {
  const endTime = Number(session && session.endTime);
  if (!Number.isFinite(endTime) || endTime <= Date.now()) {
    return false;
  }

  const sessionId = typeof session.sessionId === "string" && session.sessionId
    ? session.sessionId
    : `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const allowedUrls = Array.isArray(session.allowedUrls)
    ? session.allowedUrls.filter((item) => typeof item === "string")
    : [];
  const current = await chrome.storage.local.get(["isFocusActive", "sessionEndTime", "remoteSessionId"]);
  if (
    remote &&
    current.isFocusActive &&
    current.remoteSessionId === sessionId &&
    Number(current.sessionEndTime) === endTime
  ) {
    return true;
  }

  await chrome.storage.local.set({
    isFocusActive: true,
    sessionEndTime: endTime,
    allowedUrls,
    activeSessionId: sessionId,
    sessionSiteActivity: {},
    activityTabId: null,
    activityDomain: "",
    activityStartedAt: 0,
    remoteSessionId: remote ? sessionId : null,
    showFeedbackPrompt: false,
    feedbackPromptDeferred: false,
    feedbackPromptSessionId: null
  });
  await chrome.alarms.create("focusTimer", { when: endTime });
  await updateBlockingRules(allowedUrls);
  await redirectActiveBlockedTabs(allowedUrls);
  await refreshActiveSiteTracking();
  return true;
}

async function startRemoteFocusSession(durationSeconds, allowedUrls) {
  const result = await requestRemoteFocusSession("/api/focus-session/start", {
    method: "POST",
    body: { focusMode: "parent", durationSeconds, allowedUrls }
  });
  if (result.skipped) {
    return { success: false, error: result.error };
  }
  if (!result.ok || !result.data?.session) {
    return {
      success: false,
      error: result.data?.error || result.error || "Could not start the child session."
    };
  }
  return { success: true, session: result.data.session };
}

async function stopRemoteFocusSession() {
  const result = await requestRemoteFocusSession("/api/focus-session/stop", {
    method: "POST",
    body: { focusMode: "parent" }
  });
  if (result.skipped) {
    return { success: false, error: result.error };
  }
  return {
    success: result.ok,
    error: result.data?.error || result.error || "Could not stop the child session."
  };
}

async function syncRemoteFocusSession() {
  const local = await chrome.storage.local.get([
    "accountToken",
    "focusMode",
    "childSyncUnlocked",
    "isFocusActive",
    "remoteSessionId"
  ]);
  if (!local.accountToken) {
    return { success: true, skipped: true };
  }

  const result = await requestRemoteFocusSession("/api/focus-session");
  if (result.skipped || !result.ok) {
    return { success: false, error: result.error || result.data?.error || "Could not sync the child session." };
  }

  if (typeof result.data?.childLinked === "boolean") {
    await chrome.storage.local.set({ childLinked: result.data.childLinked });
  }

  if (local.focusMode !== "child" || !local.childSyncUnlocked) {
    return { success: true, skipped: true, childLinked: result.data?.childLinked === true };
  }

  const session = result.data && result.data.session;
  if (session && await applyLocalFocusSession(session, true)) {
    return { success: true, active: true, sessionEndTime: Number(session.endTime) };
  }

  if (local.remoteSessionId && local.isFocusActive) {
    await endFocusSession(false);
  } else if (local.remoteSessionId) {
    await chrome.storage.local.remove("remoteSessionId");
  }
  return { success: true, active: false };
}

async function ensureRemoteFocusSessionAlarm() {
  try {
    await chrome.alarms.create(REMOTE_FOCUS_SESSION_ALARM, {
      periodInMinutes: REMOTE_FOCUS_SESSION_PERIOD_MINUTES
    });
  } catch (error) {
    console.warn("Could not schedule remote focus session sync:", error.message);
  }
}

// Clean up and end focus session
async function endFocusSession(notified = true, showFeedbackPrompt = true) {
  await finishSiteActivityTracking();
  const sessionResult = await chrome.storage.local.get("activeSessionId");
  const { focusMode } = await chrome.storage.local.get("focusMode");
  const feedbackPromptSessionId = sessionResult.activeSessionId || `session_${Date.now()}`;

  await chrome.storage.local.set({ 
    isFocusActive: false, 
    sessionEndTime: 0,
    allowedUrls: [],
    activeSessionId: null,
    remoteSessionId: null,
    showFeedbackPrompt,
    feedbackPromptDeferred: false,
    feedbackPromptSessionId,
    ...(focusMode === "self" ? { password: "" } : {}),
    ...(focusMode === "parent" ? { parentSessionPassword: "" } : {})
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
  } else if (alarm.name === REMOTE_FOCUS_SESSION_ALARM) {
    await syncRemoteFocusSession();
  }
});

// Extension Startup listeners
async function initializeExtension() {
  await ensureRemoteFocusSessionAlarm();
  await refreshBlockingRules();
  await syncRemoteFocusSession();
  await refreshActiveSiteTracking();
}

chrome.runtime.onStartup.addListener(initializeExtension);
chrome.runtime.onInstalled.addListener(initializeExtension);
ensureRemoteFocusSessionAlarm();

chrome.tabs.onActivated.addListener(() => {
  refreshActiveSiteTracking().catch((error) => {
    console.warn("Could not update site activity after tab activation:", error.message);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!changeInfo.url || !tab.active) return;
  refreshActiveSiteTracking().catch((error) => {
    console.warn("Could not update site activity after navigation:", error.message);
  });
});

chrome.tabs.onRemoved.addListener(() => {
  refreshActiveSiteTracking().catch((error) => {
    console.warn("Could not update site activity after tab removal:", error.message);
  });
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  const update = windowId === chrome.windows.WINDOW_ID_NONE
    ? withSiteActivityLock(async () => {
        const state = await chrome.storage.local.get([
          "isFocusActive",
          "sessionSiteActivity",
          "activityDomain",
          "activityStartedAt"
        ]);
        if (!state.isFocusActive) return;

        const activity = normalizeSiteActivity(state.sessionSiteActivity);
        addElapsedSiteActivity(activity, state.activityDomain, state.activityStartedAt, Date.now());
        await chrome.storage.local.set({
          sessionSiteActivity: activity,
          activityTabId: null,
          activityDomain: "",
          activityStartedAt: 0
        });
      })
    : refreshActiveSiteTracking();

  update.catch((error) => {
    console.warn("Could not update site activity after window focus change:", error.message);
  });
});

// Message Handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessages(request).then(response => sendResponse(response));
  return true; // Keep message channel open for async responses
});

async function handleMessages(request) {
  try {
    if (request.type === "SYNC_REMOTE_SESSION") {
      return await syncRemoteFocusSession();
    }

    if (request.type === "GET_STATE") {
      await syncRemoteFocusSession();
      return { success: true, state: await getExtensionState() };
    }

    if (request.type === "GET_SESSION_ACTIVITY") {
      await refreshActiveSiteTracking();
      const activeActivity = await flushActiveSiteActivity();
      const activityState = await chrome.storage.local.get([
        "isFocusActive",
        "activeSessionId",
        "lastSessionSiteActivity",
        "lastSessionActivitySessionId"
      ]);
      const isActive = !!activityState.isFocusActive;
      return {
        success: true,
        isActive,
        sessionId: isActive
          ? activityState.activeSessionId || null
          : activityState.lastSessionActivitySessionId || null,
        activity: isActive
          ? activeActivity
          : normalizeSiteActivity(activityState.lastSessionSiteActivity)
      };
    }

    const state = await getExtensionState();
    
    if (request.type === "SET_PASSWORD") {
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
      if (typeof request.parentPassword !== "string" || request.parentPassword.length < 4) {
        return { success: false, error: "Parent password must be at least 4 characters." };
      }
      const parentEmail = typeof request.parentEmail === "string" ? request.parentEmail.trim().toLowerCase() : "";
      const accountState = await chrome.storage.local.get(["accountToken"]);
      if (!parentEmail || !accountState.accountToken) {
        return { success: false, error: "Sign in with Google in Account Sync before saving a parent password." };
      }
      await chrome.storage.local.set({ parentPassword: request.parentPassword, parentEmail });
      return { success: true };
    }

    else if (request.type === "VERIFY_PARENT_PASSWORD") {
      const storage = await chrome.storage.local.get(["parentPassword", "parentEmail"]);
      const currentUser = await chrome.storage.local.get(["accountUser"]);
      const currentEmail = typeof currentUser.accountUser?.email === "string"
        ? currentUser.accountUser.email.trim().toLowerCase()
        : "";
      if (!storage.parentPassword) {
        return { success: false, error: "No parent password is synced to this device. Save it again in Parent mode." };
      }
      if (storage.parentPassword !== request.parentPassword) {
        return { success: false, error: "Incorrect parent password." };
      }
      if (!currentEmail) {
        return { success: false, error: "Sign in with Google before unlocking sync." };
      }
      if (storage.parentEmail && storage.parentEmail !== currentEmail) {
        return { success: false, error: "Log in with the parent account to unlock sync." };
      }
      await chrome.storage.local.set({
        childLinked: true,
        childSyncUnlocked: true,
        modeLocked: true,
        parentEmail: storage.parentEmail || currentEmail
      });
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
      if (state.focusMode === "self") {
        if (typeof request.sessionPassword !== "string" || request.sessionPassword.length < 4) {
          return { success: false, error: "Create a temporary session password with at least 4 characters." };
        }
        await chrome.storage.local.set({ password: request.sessionPassword });
      } else if (state.focusMode === "parent") {
        if (typeof request.sessionPassword !== "string" || request.sessionPassword.length < 4) {
          return { success: false, error: "Create a temporary session password with at least 4 characters." };
        }
      } else if (!state.hasPassword) {
        return { success: false, error: "Please configure a lock password first." };
      }
      if (state.focusMode === "parent" && !state.childLinked) {
        return { success: false, error: "Link a child first before starting a parent session." };
      }
      if (state.focusMode === "parent" && !state.hasParentPassword) {
        return { success: false, error: "Set a parent password before starting a child session." };
      }
      const durationSec = Number(request.durationSeconds);
      if (!Number.isFinite(durationSec) || durationSec < 60 || durationSec > 720 * 60) {
        return { success: false, error: "Choose a duration between 1 minute and 12 hours." };
      }

      if (state.focusMode === "parent") {
        if (state.isFocusActive) {
          await endFocusSession(false, false);
        }
        const remoteResult = await startRemoteFocusSession(durationSec, request.allowedUrls || []);
        if (!remoteResult.success) {
          return remoteResult;
        }
        await chrome.storage.local.set({ parentSessionPassword: request.sessionPassword });
        return { success: true, sessionEndTime: remoteResult.session.endTime, remote: true };
      }

      if (state.isFocusActive) {
        if (Date.now() < state.sessionEndTime) {
          return { success: false, error: "Focus session is already running." };
        }
        await endFocusSession(false, false);
      }

      const endTime = Date.now() + durationSec * 1000;
      const allowedUrls = request.allowedUrls || [];
      const activeSessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      await applyLocalFocusSession({ sessionId: activeSessionId, endTime, allowedUrls });

      return { success: true, sessionEndTime: endTime };
    }
    
    else if (request.type === "STOP_SESSION") {
      const storage = await chrome.storage.local.get(["password", "parentPassword", "parentSessionPassword", "focusMode"]);
      if (storage.focusMode === "child") {
        return { success: false, error: "Only Parent mode can stop a locked session." };
      }
      const controlPassword = storage.focusMode === "parent" ? storage.parentSessionPassword : storage.password;
      if (!controlPassword || controlPassword !== request.password) {
        return { success: false, error: "Incorrect password. Stay focused!" };
      }

      if (storage.focusMode === "parent") {
        const remoteResult = await stopRemoteFocusSession();
        if (!remoteResult.success) {
          return remoteResult;
        }
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
      const existing = await chrome.storage.local.get([
        "accountToken",
        "allowedUrls",
        "whitelistHistory",
        "historyGroups",
        "feedbackHistory",
        "password",
        "parentPassword",
        "parentEmail",
        "focusMode",
        "modeLocked",
        "childLinked",
        "childSyncUnlocked",
        "permanentFeedback"
      ]);
      const remoteAllowedUrls = Array.isArray(progress.allowedUrls) ? progress.allowedUrls : [];
      const remoteWhitelistHistory = Array.isArray(progress.whitelistHistory) ? progress.whitelistHistory : [];
      const remoteHistoryGroups = Array.isArray(progress.historyGroups) ? progress.historyGroups : [];
      const remoteFeedbackHistory = Array.isArray(progress.feedbackHistory) ? progress.feedbackHistory : [];
      const remotePermanentFeedback = progress.permanentFeedback && typeof progress.permanentFeedback === "object"
        ? progress.permanentFeedback
        : null;
      await chrome.storage.local.set({
        allowedUrls: remoteAllowedUrls.length ? remoteAllowedUrls : (existing.allowedUrls || []),
        whitelistHistory: remoteWhitelistHistory.length ? remoteWhitelistHistory : (existing.whitelistHistory || []),
        historyGroups: remoteHistoryGroups.length ? remoteHistoryGroups : (existing.historyGroups || []),
        feedbackHistory: remoteFeedbackHistory.length ? remoteFeedbackHistory : (existing.feedbackHistory || []),
        password: typeof progress.lockPassword === "string" && progress.lockPassword
          ? progress.lockPassword
          : (existing.password || ""),
        parentPassword: typeof progress.parentPassword === "string" && progress.parentPassword
          ? progress.parentPassword
          : (existing.parentPassword || ""),
        parentEmail: typeof progress.parentEmail === "string" && progress.parentEmail.trim()
          ? progress.parentEmail.trim().toLowerCase()
          : (existing.parentEmail || ""),
        childLinked: !!existing.childLinked || !!progress.childLinked,
        childSyncUnlocked: !!existing.childSyncUnlocked,
        modeLocked: !!existing.childSyncUnlocked && !!existing.modeLocked,
        accountToken: typeof progress.accountToken === "string"
          ? progress.accountToken
          : typeof existing.accountToken === "string"
            ? existing.accountToken
            : "",
        focusMode: ["self", "parent", "child"].includes(existing.focusMode)
          ? existing.focusMode
          : "self",
        permanentFeedback: remotePermanentFeedback || existing.permanentFeedback || { rating: 0, thumb: null, comments: "" }
      });
      return { success: true };
    }
    
    return { success: false, error: "Unknown message type." };
  } catch (err) {
    console.error("Error handling message:", err);
    return { success: false, error: err.message };
  }
}
