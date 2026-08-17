// AuraFocus Popup Logic (popup.js)
const DEFAULT_BACKEND_URL = "https://focus-tracker-site-production-628b.up.railway.app";
const HISTORY_GROUPS = ["School", "Work", "Personal"];
const CREATE_GROUP_OPTION = "__create_group__";
const HISTORY_GROUP_DOMAINS = {
  School: [
    "wikipedia.org", "khanacademy.org", "coursera.org", "edx.org", "quizlet.com",
    "stackoverflow.com", "github.com", "w3schools.com", "canvas.instructure.com",
    "classroom.google.com", "desmos.com", "geogebra.org", "ixl.com", "grammarly.com",
    "turnitin.com", "jstor.org", "scholar.google.com"
  ],
  Work: [
    "slack.com", "notion.so", "trello.com", "asana.com", "monday.com", "linear.app",
    "figma.com", "dropbox.com", "docs.google.com", "sheets.google.com", "zoom.us"
  ],
  Personal: [
    "youtube.com", "netflix.com", "spotify.com", "reddit.com", "instagram.com",
    "facebook.com", "x.com", "tiktok.com", "amazon.com"
  ]
};
let BACKEND_URL = DEFAULT_BACKEND_URL;

async function loadBackendUrl() {
  try {
    const result = await chrome.storage.local.get("backendUrl");
    const stored = typeof result.backendUrl === "string" ? result.backendUrl.trim() : "";
    if (stored) {
      BACKEND_URL = stored.replace(/\/+$/, "");
    }
  } catch (e) {
    console.warn("Could not read backend URL from storage; using default.", e);
  }
}

function backendPath(path) {
  return `${BACKEND_URL}${path}`;
}

function bytesToBase64Url(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function createRandomString(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

async function createCodeChallenge(codeVerifier) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToBase64Url(new Uint8Array(digest));
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadBackendUrl();

  // Elements
  const statusDot = document.getElementById("status-dot");
  const statusLabel = document.getElementById("status-label");
  const accountForm = document.getElementById("account-form");
  const accountStatusText = document.getElementById("account-status-text");
  const accountError = document.getElementById("account-error");
  const accountModeNote = document.getElementById("account-mode-note");
  const btnAccountGoogle = document.getElementById("btn-account-google");
  const btnAccountLogout = document.getElementById("btn-account-logout");
  const parentControlPanel = document.getElementById("parent-control-panel");
  const childSyncPanel = document.getElementById("child-sync-panel");
  const parentTimerPanel = document.getElementById("parent-timer-panel");
  const childSyncForm = document.getElementById("child-sync-form");
  const childSyncPassword = document.getElementById("child-sync-password");
  const childSyncError = document.getElementById("child-sync-error");
  const childSyncSuccess = document.getElementById("child-sync-success");
  const parentPasswordForm = document.getElementById("parent-password-form");
  const parentPasswordInput = document.getElementById("parent-password");
  const parentPasswordConfirm = document.getElementById("parent-password-confirm");
  const parentPasswordError = document.getElementById("parent-password-error");
  const parentPasswordSuccess = document.getElementById("parent-password-success");
  
  const secSetupPassword = document.getElementById("sec-setup-password");
  const secActiveSession = document.getElementById("sec-active-session");
  const secIdleSession = document.getElementById("sec-idle-session");
  const secPermanentFeedback = document.getElementById("sec-permanent-feedback");
  const secWhitelist = document.getElementById("sec-whitelist");
  const parentTestView = document.getElementById("parent-test-view");
  
  // Password Setup Elements
  const passwordSetupForm = document.getElementById("password-setup-form");
  const newPasswordInput = document.getElementById("new-password");
  const confirmPasswordInput = document.getElementById("confirm-password");
  const passwordSetupError = document.getElementById("password-setup-error");
  const focusModeSelect = document.getElementById("focus-mode-select");
  const focusModeHelp = document.getElementById("focus-mode-help");
  
  // Timer Elements
  const countdownText = document.getElementById("countdown-text");
  const presetBtns = document.querySelectorAll(".preset-btn");
  const customMinutesInput = document.getElementById("custom-minutes");
  const btnSetCustom = document.getElementById("btn-set-custom");
  const btnStartFocus = document.getElementById("btn-start-focus");
  const selfSessionPassword = document.getElementById("self-session-password");
  const selfSessionPasswordConfirm = document.getElementById("self-session-password-confirm");
  const parentPresetBtns = document.querySelectorAll(".parent-preset-btn");
  const parentCustomMinutesInput = document.getElementById("parent-custom-minutes");
  const btnParentSetCustom = document.getElementById("btn-parent-set-custom");
  const btnParentStartFocus = document.getElementById("btn-parent-start-focus");
  const parentSessionPassword = document.getElementById("parent-session-password");
  const parentSessionPasswordConfirm = document.getElementById("parent-session-password-confirm");
  const parentStopPassword = document.getElementById("parent-stop-password");
  const btnParentStopFocus = document.getElementById("btn-parent-stop-focus");
  const parentStopError = document.getElementById("parent-stop-error");
  const parentLinkNote = document.getElementById("parent-link-note");
  
  // Unlock Elements
  const unlockPasswordInput = document.getElementById("unlock-password-input");
  const btnUnlock = document.getElementById("btn-unlock");
  const unlockError = document.getElementById("unlock-error");
  
  // Whitelist Elements
  const newSiteInput = document.getElementById("new-site-input");
  const btnAddSite = document.getElementById("btn-add-site");
  const whitelistList = document.getElementById("whitelist-list");
  const whitelistActionError = document.getElementById("whitelist-action-error");
  const sessionActivityPie = document.getElementById("session-activity-pie");
  const sessionActivityLegend = document.getElementById("session-activity-legend");
  const sessionActivityLabel = document.getElementById("session-activity-label");
  const parentSessionActivityPanel = document.getElementById("parent-session-activity-panel");
  const parentSessionActivityPie = document.getElementById("parent-session-activity-pie");
  const parentSessionActivityLegend = document.getElementById("parent-session-activity-legend");
  const parentSessionActivityLabel = document.getElementById("parent-session-activity-label");
  
  // Whitelist Locking Elements
  const whitelistLockOverlay = document.getElementById("whitelist-lock-overlay");
  const btnPromptUnlockWhitelist = document.getElementById("btn-prompt-unlock-whitelist");
  const whitelistUnlockInputContainer = document.getElementById("whitelist-unlock-input-container");
  const whitelistUnlockPassword = document.getElementById("whitelist-unlock-password");
  const btnConfirmUnlockWhitelist = document.getElementById("btn-confirm-unlock-whitelist");
  const btnCancelUnlockWhitelist = document.getElementById("btn-cancel-unlock-whitelist");
  const whitelistUnlockError = document.getElementById("whitelist-unlock-error");

  // Change Password Elements
  const secChangePassword = document.getElementById("sec-change-password");
  const changePasswordForm = document.getElementById("change-password-form");
  const changeOldPassword = document.getElementById("change-old-password");
  const changeNewPassword = document.getElementById("change-new-password");
  const changeConfirmPassword = document.getElementById("change-confirm-password");
  const changePasswordError = document.getElementById("change-password-error");
  const changePasswordSuccess = document.getElementById("change-password-success");

  // Feedback Elements
  const secFeedback = document.getElementById("sec-feedback");
  const btnThumbUp = document.getElementById("btn-thumb-up");
  const btnThumbDown = document.getElementById("btn-thumb-down");
  const starBtns = document.querySelectorAll(".star-btn");
  const feedbackComments = document.getElementById("feedback-comments");
  const btnSubmitFeedback = document.getElementById("btn-submit-feedback");
  const btnLaterFeedback = document.getElementById("btn-later-feedback");
  const feedbackSuccessMsg = document.getElementById("feedback-success-msg");
  const feedbackError = document.getElementById("feedback-error");
  const permThumbUp = document.getElementById("perm-btn-thumb-up");
  const permThumbDown = document.getElementById("perm-btn-thumb-down");
  const permStarBtns = document.querySelectorAll(".perm-star-btn");
  const permFeedbackComments = document.getElementById("perm-feedback-comments");
  const permFeedbackSuccess = document.getElementById("perm-feedback-success");

  // Local popup states
  let activeDurationSeconds = 1500; // Default 25m
  let isWhitelistUnlocked = false; // Temp unlock for this popup instance
  let countdownInterval = null;
  let currentAllowedUrls = [];
  let feedbackUserId = null;
  let accountToken = null;
  let accountUser = null;
  let focusMode = "self";
  let parentPassword = "";
  let hasParentPassword = false;
  let childSyncUnlocked = false;
  let modeLocked = false;
  let childLinked = false;
  let parentDurationSeconds = 1500;
  let hasSubmittedSessionFeedback = false;
  let permanentFeedback = {
    rating: 0,
    thumb: null,
    comments: ""
  };
  let historyGroups = [...HISTORY_GROUPS];

  // Initialize view
  setupPasswordToggles();
  await loadAccount();
  await loadSessionFeedbackState();
  await loadPermanentFeedback();
  await refreshState();
  refreshSessionActivity();
  const sessionActivityInterval = setInterval(refreshSessionActivity, 5000);
  feedbackUserId = await getOrCreateFeedbackUserId();
  bindPermanentFeedbackControls();

  window.addEventListener("unload", () => {
    clearInterval(sessionActivityInterval);
  });

  // --- STATE AND VIEW MANAGEMENT ---
  async function refreshState() {
    chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
      if (chrome.runtime.lastError || !response || !response.success) {
        console.error("Could not fetch state from background service.");
        return;
      }
      
      const state = response.state;
      currentAllowedUrls = state.allowedUrls;
      focusMode = state.focusMode || focusMode;
      modeLocked = !!state.modeLocked;
      hasParentPassword = !!state.hasParentPassword;
      childSyncUnlocked = !!state.childSyncUnlocked;
      childLinked = !!state.childLinked;
      // Older builds stored only modeLocked, which could hide the sync form
      // before this device had actually verified the parent password.
      if (modeLocked && !childSyncUnlocked) {
        modeLocked = false;
        chrome.storage.local.set({ modeLocked: false });
      }
      syncProgress();
      const isChildMode = focusMode === "child";
      const isParentMode = focusMode === "parent";
      const isAccountMode = isParentMode || isChildMode;
      const hasSignedInAccount = !!(accountToken && accountUser);
      const accountRequired = isAccountMode && !hasSignedInAccount;
      const showParentOnlyPanels = isParentMode;

      if (parentTestView) {
        parentTestView.style.display = isParentMode && !accountRequired ? "flex" : "none";
      }
      if (document.body) {
        document.body.classList.toggle("parent-mode-active", isParentMode);
      }
      
      // Render Whitelist
      renderWhitelist(currentAllowedUrls);
      if (parentSessionActivityPanel) {
        parentSessionActivityPanel.style.display = isParentMode && hasSignedInAccount && childLinked ? "block" : "none";
      }
      if (focusModeSelect) {
        focusModeSelect.value = focusMode;
        focusModeSelect.disabled = modeLocked;
        updateFocusModeHelp();
      }
      if (accountModeNote) {
        accountModeNote.style.display = accountRequired ? "block" : "none";
      }
      if (secPermanentFeedback) {
        const sessionFeedbackPending = !!state.showFeedbackPrompt && !!state.feedbackPromptSessionId;
        secPermanentFeedback.style.display = accountRequired || isChildMode || state.isFocusActive || sessionFeedbackPending ? "none" : "block";
      }
      secWhitelist.style.display = isChildMode ? "none" : "block";
      secChangePassword.style.display = "none";
      if (parentControlPanel) {
        parentControlPanel.style.display = isParentMode && hasSignedInAccount && !childLinked ? "block" : "none";
      }
      if (childSyncPanel) {
        childSyncPanel.style.display = isParentMode || !hasSignedInAccount ? "none" : state.focusMode === "child" && !childSyncUnlocked ? "block" : "none";
      }
      if (parentTimerPanel) {
        const showParentTimer = isParentMode && hasSignedInAccount && childLinked;
        parentTimerPanel.style.display = showParentTimer ? "block" : "none";
      }
      updateParentTimerControls();

      if (accountRequired) {
        showSection(null);
        if (secWhitelist) secWhitelist.style.display = "none";
        if (secChangePassword) secChangePassword.style.display = "none";
        if (secPermanentFeedback) secPermanentFeedback.style.display = "none";
        if (parentControlPanel) parentControlPanel.style.display = "none";
        if (childSyncPanel) childSyncPanel.style.display = "none";
        if (parentTimerPanel) parentTimerPanel.style.display = "none";
        if (parentSessionActivityPanel) parentSessionActivityPanel.style.display = "none";
        stopLocalCountdown();
        if (whitelistLockOverlay) whitelistLockOverlay.style.display = "none";
        if (whitelistUnlockInputContainer) whitelistUnlockInputContainer.style.display = "none";
        updateStatus(false, isParentMode ? "Parent" : "Child");
        return;
      }

      // A child device has only one available action until the parent
      // password has been verified. Keep the sync form visible even if the
      // local lock password has not been configured yet.
      if (isChildMode && !childSyncUnlocked) {
        showSection(null);
        if (secWhitelist) secWhitelist.style.display = "none";
        if (secChangePassword) secChangePassword.style.display = "none";
        if (secPermanentFeedback) secPermanentFeedback.style.display = "none";
        if (parentControlPanel) parentControlPanel.style.display = "none";
        if (parentTimerPanel) parentTimerPanel.style.display = "none";
        if (parentSessionActivityPanel) parentSessionActivityPanel.style.display = "none";
        if (childSyncPanel) childSyncPanel.style.display = "block";
        stopLocalCountdown();
        if (whitelistLockOverlay) whitelistLockOverlay.style.display = "none";
        if (whitelistUnlockInputContainer) whitelistUnlockInputContainer.style.display = "none";
        updateStatus(false, "Child Sync");
        return;
      }

      // 1. Password Check
      if (!state.hasPassword && !isChildMode && !isParentMode) {
        if (secSetupPassword) secSetupPassword.style.display = "none";
      } else if (!state.hasPassword) {
        if (focusModeSelect) {
          focusModeSelect.value = focusMode;
          updateFocusModeHelp();
        }
        showSection(secSetupPassword);
        secWhitelist.style.display = "none"; // Hide whitelist during setup
        secChangePassword.style.display = "none";
        updateStatus(false, "Setup");
        return;
      }

      // 2. Active Session Check
      const now = Date.now();
      if (isParentMode) {
        chrome.storage.local.get(["showFeedbackPrompt", "feedbackPromptSessionId"], (feedbackState) => {
          if (feedbackState.showFeedbackPrompt && feedbackState.feedbackPromptSessionId) {
            showSection(secFeedback);
            if (secWhitelist) secWhitelist.style.display = "block";
            if (secChangePassword) secChangePassword.style.display = "none";
            if (parentControlPanel) parentControlPanel.style.display = "none";
            if (parentTimerPanel) parentTimerPanel.style.display = "none";
            if (parentSessionActivityPanel) parentSessionActivityPanel.style.display = "none";
            updateStatus(false, "Feedback");
          } else {
            showSection(null);
            if (secSetupPassword) secSetupPassword.style.display = "none";
            if (secActiveSession) secActiveSession.style.display = "none";
            if (secIdleSession) secIdleSession.style.display = "none";
            if (secFeedback) secFeedback.style.display = "none";
            if (secWhitelist) secWhitelist.style.display = "none";
            if (secChangePassword) secChangePassword.style.display = "none";
            if (parentControlPanel) parentControlPanel.style.display = hasSignedInAccount && !childLinked ? "block" : "none";
            if (childSyncPanel) childSyncPanel.style.display = "none";
            if (parentTimerPanel) parentTimerPanel.style.display = hasSignedInAccount && childLinked ? "block" : "none";
            updateParentTimerControls();
            updateStatus(false, "Parent");
          }
        });
        return;
      }

      if (state.isFocusActive && state.sessionEndTime > now) {
        showSection(secActiveSession);
        updateStatus(true, "Focusing");
        startLocalCountdown(state.sessionEndTime);
        
        // Handle Whitelist lock
        if (isWhitelistUnlocked) {
          whitelistLockOverlay.style.display = "none";
          whitelistUnlockInputContainer.style.display = "none";
        } else {
          whitelistLockOverlay.style.display = "flex";
          whitelistUnlockInputContainer.style.display = "none";
        }
      } else {
        // Idle
        chrome.storage.local.get("showFeedbackPrompt", (res) => {
          chrome.storage.local.get("feedbackPromptSessionId", (promptState) => {
            const hasCompletedSessionPrompt = res.showFeedbackPrompt && !!promptState.feedbackPromptSessionId && !isChildMode;

            if (hasCompletedSessionPrompt) {
              showSection(secFeedback);
              updateStatus(false, "Feedback");
              secWhitelist.style.display = "none"; // Hide whitelist during feedback
              secChangePassword.style.display = "none";
            } else {
              // Ignore stale prompt flags from before completed sessions were tracked.
              if (res.showFeedbackPrompt) {
                chrome.storage.local.set({ showFeedbackPrompt: false });
              }
              showSection(secIdleSession);
              updateStatus(false, "Idle");
              secWhitelist.style.display = isChildMode ? "none" : "block"; // Restore whitelist
              secChangePassword.style.display = "none";
            }
          });
        });
        stopLocalCountdown();
        
        // Whitelist is completely unlocked in idle mode
        whitelistLockOverlay.style.display = "none";
        whitelistUnlockInputContainer.style.display = "none";
      }
    });
  }

  function updateFocusModeHelp() {
    if (!focusModeHelp || !focusModeSelect) return;

    if (modeLocked) {
      focusModeHelp.textContent = "Focus mode is locked after child sync on this device.";
      return;
    }

    const helpByMode = {
      self: "Self mode is for personal use and keeps the current behavior.",
      parent: "Parent mode lets a parent manage the session password and controls.",
      child: "Child mode is for the supervised user who enters the password set by the parent."
    };

    focusModeHelp.textContent = helpByMode[focusModeSelect.value] || helpByMode.self;
  }

  function updateParentTimerControls() {
    const canStartParentSession = focusMode === "parent" && !!(accountToken && accountUser) && !!childLinked && hasParentPassword;
    if (parentLinkNote) {
      if (canStartParentSession) {
        parentLinkNote.style.display = "none";
      } else {
        parentLinkNote.textContent = !childLinked
          ? "Link a child first by completing child sync before starting a session."
          : "Set a parent password before starting a child session.";
        parentLinkNote.style.display = "block";
      }
    }
    if (btnParentStartFocus) {
      btnParentStartFocus.disabled = !canStartParentSession;
      btnParentStartFocus.title = canStartParentSession
        ? "Start the child focus session"
        : !childLinked ? "Complete child sync before starting a session" : "Set a parent password before starting a session";
    }
    parentPresetBtns.forEach((button) => {
      button.disabled = !canStartParentSession;
    });
    if (parentCustomMinutesInput) parentCustomMinutesInput.disabled = !canStartParentSession;
    if (btnParentSetCustom) btnParentSetCustom.disabled = !canStartParentSession;
  }

  if (focusModeSelect) {
    focusModeSelect.value = focusMode;
    updateFocusModeHelp();
    focusModeSelect.addEventListener("change", () => {
      if (modeLocked) {
        focusModeSelect.value = focusMode;
        updateFocusModeHelp();
        return;
      }

      focusMode = focusModeSelect.value;
      updateFocusModeHelp();
      chrome.runtime.sendMessage({
        type: "SET_FOCUS_MODE",
        focusMode
      }, () => {
        refreshState();
      });
      const accountRequired = (focusMode === "parent" || focusMode === "child") && !(accountToken && accountUser);
      if (accountModeNote) {
        accountModeNote.style.display = accountRequired ? "block" : "none";
      }
      if (secPermanentFeedback) {
        secPermanentFeedback.style.display = accountRequired || focusMode === "child" ? "none" : "block";
      }
      if (accountRequired) {
        showSection(null);
        if (secWhitelist) secWhitelist.style.display = "none";
        if (secChangePassword) secChangePassword.style.display = "none";
        if (parentControlPanel) parentControlPanel.style.display = "none";
        if (childSyncPanel) childSyncPanel.style.display = "none";
        if (parentTimerPanel) parentTimerPanel.style.display = "none";
        if (parentSessionActivityPanel) parentSessionActivityPanel.style.display = "none";
        stopLocalCountdown();
        if (whitelistLockOverlay) whitelistLockOverlay.style.display = "none";
        if (whitelistUnlockInputContainer) whitelistUnlockInputContainer.style.display = "none";
        updateStatus(false, focusMode === "parent" ? "Parent" : "Child");
        return;
      }
      if (parentControlPanel) {
        parentControlPanel.style.display = focusMode === "parent" && !childLinked ? "block" : "none";
      }
      if (childSyncPanel) {
        childSyncPanel.style.display = focusMode === "child" && !childSyncUnlocked && !!(accountToken && accountUser) ? "block" : "none";
      }
      if (parentTimerPanel) {
        parentTimerPanel.style.display = focusMode === "parent" && !!(accountToken && accountUser) && childLinked ? "block" : "none";
      }
      updateParentTimerControls();
    });
  }

  if (childSyncForm) {
    childSyncForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const enteredPassword = childSyncPassword ? childSyncPassword.value : "";

      if (focusMode !== "child") {
        showError(childSyncError, "Switch to child mode first.");
        return;
      }
      if (!enteredPassword) {
        showError(childSyncError, "Enter the parent password.");
        return;
      }

      chrome.runtime.sendMessage({
        type: "VERIFY_PARENT_PASSWORD",
        parentPassword: enteredPassword
      }, async (response) => {
        if (response && response.success) {
          childSyncUnlocked = true;
          modeLocked = true;
          childLinked = true;
          if (childSyncPassword) childSyncPassword.value = "";
          childSyncError.style.display = "none";
          if (childSyncSuccess) {
            childSyncSuccess.style.display = "block";
            setTimeout(() => childSyncSuccess.style.display = "none", 2500);
          }
          if (childSyncPanel) childSyncPanel.style.display = "none";
          if (focusModeSelect) {
            focusModeSelect.disabled = true;
          }
          await chrome.storage.local.set({ modeLocked: true, childLinked: true, childSyncUnlocked: true });
          updateFocusModeHelp();
          renderAccount();
          await syncProgress();
          refreshState();
        } else {
          showError(childSyncError, response.error || "Incorrect parent password.");
        }
      });
    });
  }

  function showSection(sectionToShow) {
    [secSetupPassword, secActiveSession, secIdleSession, secFeedback].forEach((sec) => {
      if (!sec) return;
      sec.style.display = sectionToShow && sec === sectionToShow ? "block" : "none";
    });
  }

  function updateStatus(isActive, text) {
    if (isActive) {
      statusDot.className = "status-dot active";
      statusLabel.textContent = text;
    } else {
      statusDot.className = "status-dot";
      statusLabel.textContent = text;
    }
  }

  // --- PASSWORD SETUP ---
  passwordSetupForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const newPass = newPasswordInput.value;
    const confirmPass = confirmPasswordInput.value;

    if (newPass !== confirmPass) {
      showError(passwordSetupError, "Passwords do not match.");
      return;
    }

    if (newPass.length < 4) {
      showError(passwordSetupError, "Password must be at least 4 characters.");
      return;
    }

    chrome.runtime.sendMessage({
      type: "SET_PASSWORD",
      password: newPass,
      focusMode: focusModeSelect ? focusModeSelect.value : focusMode
    }, (response) => {
      if (response && response.success) {
        newPasswordInput.value = "";
        confirmPasswordInput.value = "";
        passwordSetupError.style.display = "none";
        syncProgress();
        refreshState();
      } else {
        showError(passwordSetupError, response.error || "Failed to set password.");
      }
    });
  });

  if (parentPasswordForm) {
    parentPasswordForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const parentPass = parentPasswordInput ? parentPasswordInput.value : "";
      const confirmPass = parentPasswordConfirm ? parentPasswordConfirm.value : "";

      if (focusMode !== "parent") {
        showError(parentPasswordError, "Select parent mode first.");
        return;
      }
      if (parentPass !== confirmPass) {
        showError(parentPasswordError, "Parent passwords do not match.");
        return;
      }

      if (parentPass.length < 4) {
        showError(parentPasswordError, "Parent password must be at least 4 characters.");
        return;
      }

      chrome.runtime.sendMessage({
        type: "SET_PARENT_PASSWORD",
        parentPassword: parentPass,
        focusMode,
        parentEmail: accountUser && accountUser.email ? accountUser.email : ""
      }, async (response) => {
        if (response && response.success) {
          parentPassword = parentPass;
          hasParentPassword = true;
          updateParentTimerControls();
          const syncResult = await syncProgress();
          if (parentPasswordInput) parentPasswordInput.value = "";
          if (parentPasswordConfirm) parentPasswordConfirm.value = "";
          parentPasswordError.style.display = "none";
          if (!syncResult.success) {
            showError(parentPasswordError, `Parent password saved locally, but could not sync: ${syncResult.error}`);
            return;
          }
          if (parentPasswordSuccess) {
            parentPasswordSuccess.style.display = "block";
            setTimeout(() => parentPasswordSuccess.style.display = "none", 2500);
          }
          syncProgress();
        } else {
          showError(parentPasswordError, response.error || "Failed to save parent password.");
        }
      });
    });
  }

  // --- TIMER PRESENTATION ---
  parentPresetBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      parentPresetBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      parentDurationSeconds = parseInt(btn.dataset.seconds, 10);
      if (parentCustomMinutesInput) {
        parentCustomMinutesInput.value = Math.round(parentDurationSeconds / 60);
      }
    });
  });

  if (btnParentSetCustom) {
    btnParentSetCustom.addEventListener("click", () => {
      const mins = parseInt(parentCustomMinutesInput ? parentCustomMinutesInput.value : "25", 10);
      if (isNaN(mins) || mins < 1) {
        if (parentCustomMinutesInput) parentCustomMinutesInput.value = 1;
        parentDurationSeconds = 60;
      } else if (mins > 720) {
        if (parentCustomMinutesInput) parentCustomMinutesInput.value = 720;
        parentDurationSeconds = 720 * 60;
      } else {
        parentDurationSeconds = mins * 60;
      }
      parentPresetBtns.forEach(b => b.classList.remove("active"));
    });
  }

  presetBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      if (focusMode === "parent") return;
      presetBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeDurationSeconds = parseInt(btn.dataset.seconds, 10);
      
      // Update custom input display to match preset
      customMinutesInput.value = Math.round(activeDurationSeconds / 60);
    });
  });

  btnSetCustom.addEventListener("click", () => {
    if (focusMode === "parent") return;
    const mins = parseInt(customMinutesInput.value, 10);
    if (isNaN(mins) || mins < 1) {
      customMinutesInput.value = 1;
      activeDurationSeconds = 60;
    } else if (mins > 720) {
      customMinutesInput.value = 720;
      activeDurationSeconds = 720 * 60;
    } else {
      activeDurationSeconds = mins * 60;
    }
    
    // Deactivate all preset buttons
    presetBtns.forEach(b => b.classList.remove("active"));
  });

  // Start focus session
  btnStartFocus.addEventListener("click", () => {
    if (focusMode === "parent") return;
    const sessionPassword = selfSessionPassword ? selfSessionPassword.value : "";
    const sessionPasswordConfirm = selfSessionPasswordConfirm ? selfSessionPasswordConfirm.value : "";
    if (focusMode === "self" && (sessionPassword.length < 4 || sessionPassword !== sessionPasswordConfirm)) {
      alert(sessionPassword.length < 4 ? "Create a temporary password with at least 4 characters." : "Temporary passwords do not match.");
      return;
    }
    chrome.runtime.sendMessage({
      type: "START_SESSION",
      durationSeconds: activeDurationSeconds,
      allowedUrls: currentAllowedUrls,
      sessionPassword: focusMode === "self" ? sessionPassword : undefined
    }, (response) => {
      if (response && response.success) {
        if (selfSessionPassword) selfSessionPassword.value = "";
        if (selfSessionPasswordConfirm) selfSessionPasswordConfirm.value = "";
        refreshState();
      } else {
        alert(response.error || "Could not start session.");
      }
    });
  });

  if (btnParentStartFocus) {
    btnParentStartFocus.addEventListener("click", () => {
      if (focusMode !== "parent") return;
      if (!childLinked) {
        alert("Link a child first by completing child sync before starting a parent session.");
        return;
      }
      const sessionPassword = parentSessionPassword ? parentSessionPassword.value : "";
      const sessionPasswordConfirm = parentSessionPasswordConfirm ? parentSessionPasswordConfirm.value : "";
      if (sessionPassword.length < 4 || sessionPassword !== sessionPasswordConfirm) {
        alert(sessionPassword.length < 4 ? "Create a temporary session password with at least 4 characters." : "Temporary passwords do not match.");
        return;
      }
      chrome.runtime.sendMessage({
        type: "START_SESSION",
        durationSeconds: parentDurationSeconds,
        allowedUrls: currentAllowedUrls,
        sessionPassword
      }, (response) => {
        if (response && response.success) {
          if (parentSessionPassword) parentSessionPassword.value = "";
          if (parentSessionPasswordConfirm) parentSessionPasswordConfirm.value = "";
          refreshState();
        } else {
          alert(response.error || "Could not start child session.");
        }
      });
    });
  }

  // Stop session (Unlock)
  btnUnlock.addEventListener("click", () => {
    if (focusMode === "child") {
      return;
    }
    const password = unlockPasswordInput.value;
    if (!password) {
      showError(unlockError, "Password required.");
      return;
    }

    chrome.runtime.sendMessage({
      type: "STOP_SESSION",
      password: password
    }, (response) => {
      if (response && response.success) {
        unlockPasswordInput.value = "";
        unlockError.style.display = "none";
        isWhitelistUnlocked = false; // Reset lock
        refreshState();
      } else {
        showError(unlockError, response.error || "Verification failed.");
      }
    });
  });

  // --- TIMER DISPLAY LOCAL LOOP ---
  function startLocalCountdown(endTime) {
    stopLocalCountdown();
    
    function updateTimer() {
      const remainingMs = endTime - Date.now();
      if (remainingMs <= 0) {
        stopLocalCountdown();
        refreshState();
        return;
      }
      
      const totalSeconds = Math.ceil(remainingMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      
      countdownText.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    updateTimer();
    countdownInterval = setInterval(updateTimer, 1000);
  }

  function stopLocalCountdown() {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }

  // --- WHITELIST MANAGEMENT ---
  function renderWhitelist(urls) {
    whitelistList.innerHTML = "";
    if (urls.length === 0) {
      const emptyLi = document.createElement("li");
      emptyLi.className = "site-item";
      emptyLi.style.justifyContent = "center";
      emptyLi.style.color = "var(--text-muted)";
      emptyLi.textContent = "No whitelisted sites. All blocked.";
      whitelistList.appendChild(emptyLi);
      
      // Update history list rendering as well
      renderHistory();
      return;
    }

    urls.forEach((url, index) => {
      const li = document.createElement("li");
      li.className = "site-item";
      
      const span = document.createElement("span");
      span.className = "site-url";
      span.textContent = url;
      span.title = url;

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      `;
      deleteBtn.addEventListener("click", () => {
        deleteWhitelistItem(index);
      });

      li.appendChild(span);
      li.appendChild(deleteBtn);
      whitelistList.appendChild(li);
    });

    // Update history list rendering to reflect currently whitelisted domains
    renderHistory();
  }

  // Add site
  btnAddSite.addEventListener("click", () => {
    if (focusMode === "child") return;
    addWhitelistItem();
  });

  newSiteInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      addWhitelistItem();
    }
  });

  async function addWhitelistItem() {
    if (focusMode === "child") return;
    let inputVal = newSiteInput.value.trim().toLowerCase();
    if (!inputVal) return;

    // Standardize URL input: remove http:// or https:// and leading www.
    inputVal = inputVal.replace(/^(https?:\/\/)?(www\.)?/, "");
    
    if (inputVal === "") return;

    if (!inputVal.includes(".")) {
      showError(whitelistActionError, "Enter a valid domain name (e.g. youtube.com).");
      return;
    }

    if (currentAllowedUrls.includes(inputVal)) {
      showError(whitelistActionError, "Domain already in whitelist.");
      return;
    }

    // Prepare list
    const updatedUrls = [...currentAllowedUrls, inputVal];
    saveWhitelist(updatedUrls);
  }

  function deleteWhitelistItem(index) {
    if (focusMode === "child") return;
    const updatedUrls = [...currentAllowedUrls];
    updatedUrls.splice(index, 1);
    saveWhitelist(updatedUrls);
  }

  function saveWhitelist(updatedUrls) {
    if (focusMode === "child") return;
    // If active and whitelisted is locked, we need the password, but we've already checked isWhitelistUnlocked in the popup.
    // So we pass the unlock password if we verified it, or nothing if idle.
    const password = isWhitelistUnlocked ? whitelistUnlockPassword.value : "";
    
    chrome.runtime.sendMessage({
      type: "UPDATE_WHITELIST",
      allowedUrls: updatedUrls,
      password: password
    }, (response) => {
      if (response && response.success) {
        // If there was an item added, save it to history!
        if (updatedUrls.length > currentAllowedUrls.length) {
          const addedItem = updatedUrls[updatedUrls.length - 1];
          addToWhitelistHistory(addedItem);
        }

        newSiteInput.value = "";
        whitelistActionError.style.display = "none";
        currentAllowedUrls = updatedUrls;
        renderWhitelist(currentAllowedUrls);
        syncProgress();
      } else {
        showError(whitelistActionError, response.error || "Failed to update whitelist.");
      }
    });
  }

  // --- WHITELIST HISTORY & SEARCH ---
  const historyList = document.getElementById("history-list");
  const historySearch = document.getElementById("history-search");
  let historyRenderVersion = 0;

  function getHistoryGroup(domain, savedGroup) {
    if (historyGroups.includes(savedGroup)) return savedGroup;

    const hostname = domain.toLowerCase().replace(/^www\./, "");
    for (const group of HISTORY_GROUPS) {
      if (HISTORY_GROUP_DOMAINS[group].some(groupDomain =>
        hostname === groupDomain || hostname.endsWith(`.${groupDomain}`)
      )) {
        return group;
      }
    }

    return historyGroups[0] || "Personal";
  }

  if (btnParentStopFocus) {
    btnParentStopFocus.addEventListener("click", () => {
      if (focusMode !== "parent") return;
      const password = parentStopPassword ? parentStopPassword.value : "";
      if (!password) {
        showError(parentStopError, "Temporary session password required.");
        return;
      }
      chrome.runtime.sendMessage({ type: "STOP_SESSION", password }, (response) => {
        if (response && response.success) {
          if (parentStopPassword) parentStopPassword.value = "";
          if (parentStopError) parentStopError.style.display = "none";
          refreshState();
        } else {
          showError(parentStopError, response?.error || "Could not stop child session.");
        }
      });
    });
  }

  if (historySearch) {
    historySearch.addEventListener("input", (e) => {
      renderHistory(e.target.value.trim());
    });
  }

  async function addToWhitelistHistory(domain) {
    const result = await chrome.storage.local.get("whitelistHistory");
    let history = result.whitelistHistory || [];
    
    // Remove domain if it already exists to move it to the top (newest first)
    history = history.filter(item => item.domain !== domain);
    
    // Unshift new entry
    history.unshift({
      domain: domain,
      timestamp: Date.now(),
      group: getHistoryGroup(domain)
    });
    
    // Limit to last 50 items
    if (history.length > 50) {
      history = history.slice(0, 50);
    }
    
    await chrome.storage.local.set({ whitelistHistory: history });
    renderHistory(historySearch ? historySearch.value.trim() : "");
  }

  async function addSiteDirectly(domain) {
    const normalizedDomain = String(domain || "").trim().toLowerCase().replace(/^www\./, "");
    if (!normalizedDomain) return;

    if (currentAllowedUrls.includes(normalizedDomain)) {
      showError(whitelistActionError, "Domain already in whitelist.");
      return;
    }
    const updatedUrls = [...currentAllowedUrls, normalizedDomain];
    saveWhitelist(updatedUrls);
  }

  async function updateHistoryGroup(domain, group) {
    if (!historyGroups.includes(group)) return;

    const result = await chrome.storage.local.get("whitelistHistory");
    const history = result.whitelistHistory || [];
    const item = history.find(entry => entry.domain === domain);
    if (!item) return;

    item.group = group;
    await chrome.storage.local.set({ whitelistHistory: history });
    renderHistory(historySearch ? historySearch.value.trim() : "");
  }

  async function renderHistory(filterText = "") {
    if (!historyList) return;
    const renderVersion = ++historyRenderVersion;

    const groupState = await chrome.storage.local.get("historyGroups");
    if (renderVersion !== historyRenderVersion) return;
    const savedGroups = Array.isArray(groupState.historyGroups)
      ? groupState.historyGroups.filter(group => typeof group === "string" && group.trim()).slice(0, 30)
      : [];
    historyGroups = [...new Set([...HISTORY_GROUPS, ...savedGroups])];

    const result = await chrome.storage.local.get("whitelistHistory");
    if (renderVersion !== historyRenderVersion) return;
    let history = result.whitelistHistory || [];

    // Keep one history entry per domain, preserving the newest entry.
    const originalHistoryLength = history.length;
    const seenDomains = new Set();
    history = history.filter(item => {
      const domain = String(item.domain || "").trim().toLowerCase();
      if (!domain || seenDomains.has(domain)) return false;
      seenDomains.add(domain);
      return true;
    });
    if (history.length !== originalHistoryLength) {
      await chrome.storage.local.set({ whitelistHistory: history });
      if (renderVersion !== historyRenderVersion) return;
    }

    // Backfill sites that were whitelisted before history tracking was added.
    const knownDomains = new Set(history.map(item => item.domain));
    const missingCurrentSites = currentAllowedUrls
      .filter(domain => !knownDomains.has(domain))
      .map(domain => ({
        domain,
        timestamp: Date.now(),
        group: getHistoryGroup(domain)
      }));

    if (missingCurrentSites.length > 0) {
      history = [...missingCurrentSites, ...history];
      await chrome.storage.local.set({ whitelistHistory: history });
    }

    // Previously allowed means sites that are no longer on the active whitelist.
    const currentDomains = new Set(currentAllowedUrls.map(domain => domain.toLowerCase()));
    let filteredHistory = history.filter(item =>
      !currentDomains.has(String(item.domain || "").toLowerCase())
    );

    // Filter by search text if any
    if (filterText) {
      const lowerFilter = filterText.toLowerCase();
      filteredHistory = filteredHistory.filter(item => item.domain.includes(lowerFilter));
    }

    if (renderVersion !== historyRenderVersion) return;
    historyList.innerHTML = "";

    if (filteredHistory.length === 0) {
      const emptyLi = document.createElement("li");
      emptyLi.className = "site-item";
      emptyLi.style.justifyContent = "center";
      emptyLi.style.color = "var(--text-muted)";
      emptyLi.style.fontSize = "11px";
      emptyLi.textContent = filterText ? "No matching history." : "No previous history.";
      historyList.appendChild(emptyLi);
      return;
    }

    const groupedHistory = historyGroups.map(group => ({
      group,
      items: filteredHistory.filter(item => getHistoryGroup(item.domain, item.group) === group)
    })).filter(section => section.items.length > 0);

    groupedHistory.forEach(({ group, items }) => {
      const groupHeader = document.createElement("li");
      groupHeader.className = "history-group-header";
      groupHeader.textContent = group;
      historyList.appendChild(groupHeader);

      items.forEach(item => {
        const li = document.createElement("li");
        li.className = "site-item";

        const span = document.createElement("span");
        span.className = "site-domain";
        span.textContent = item.domain;
        span.title = item.domain;

        const actions = document.createElement("div");
        actions.className = "history-item-actions";

        const groupSelect = document.createElement("select");
        groupSelect.className = "history-group-select";
        groupSelect.setAttribute("aria-label", `Group for ${item.domain}`);
        historyGroups.forEach(optionGroup => {
          const option = document.createElement("option");
          option.value = optionGroup;
          option.textContent = optionGroup;
          option.selected = optionGroup === getHistoryGroup(item.domain, item.group);
          groupSelect.appendChild(option);
        });
        const createOption = document.createElement("option");
        createOption.value = CREATE_GROUP_OPTION;
        createOption.textContent = "Create New Group";
        groupSelect.appendChild(createOption);
        groupSelect.addEventListener("change", () => {
          if (groupSelect.value === CREATE_GROUP_OPTION) {
            const name = prompt("Enter a name for the new group:", "New Group");
            const cleanName = typeof name === "string" ? name.trim().slice(0, 32) : "";
            if (!cleanName || historyGroups.includes(cleanName)) {
              groupSelect.value = getHistoryGroup(item.domain, item.group);
              return;
            }
            historyGroups.push(cleanName);
            chrome.storage.local.set({ historyGroups });
            updateHistoryGroup(item.domain, cleanName);
            return;
          }
          updateHistoryGroup(item.domain, groupSelect.value);
        });

        const addBtn = document.createElement("button");
        addBtn.className = "btn-add-history";
        addBtn.textContent = "Add";
        addBtn.addEventListener("click", () => {
          addSiteDirectly(item.domain);
        });

        actions.appendChild(groupSelect);
        actions.appendChild(addBtn);
        li.appendChild(span);
        li.appendChild(actions);
        historyList.appendChild(li);
      });
    });
  }

  const sessionActivityColors = [
    "#f7b928",
    "#4dd8ff",
    "#b779ff",
    "#57e389",
    "#ff7f66",
    "#ff65b3",
    "#8d9eff"
  ];

  function formatActivityDuration(milliseconds) {
    const totalSeconds = Math.max(1, Math.round(Number(milliseconds) / 1000));
    if (totalSeconds < 60) return `${totalSeconds}s`;

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }

  function renderActivityChart(pie, legend, label, activity, isActive, parentView = false) {
    if (!pie || !legend) return;

    const entries = Object.entries(activity || {})
      .map(([domain, milliseconds]) => ({
        domain: domain.startsWith("blocked:") ? `Blocked: ${domain.slice(8)}` : domain,
        milliseconds: Number(milliseconds)
      }))
      .filter(item => item.domain && Number.isFinite(item.milliseconds) && item.milliseconds > 0)
      .sort((a, b) => b.milliseconds - a.milliseconds);

    const totalMilliseconds = entries.reduce((total, item) => total + item.milliseconds, 0);
    if (label) {
      label.textContent = isActive
        ? (parentView ? "Current child session" : "Current focus session")
        : (parentView ? "Last child session" : "Last focus session");
    }

    if (!totalMilliseconds) {
      pie.style.background = "var(--bg-dark-3)";
      pie.setAttribute("aria-label", parentView ? "No child website activity recorded yet" : "No website activity recorded yet");
      legend.innerHTML = `<div class="session-activity-empty">${parentView ? "No child website activity recorded yet." : "No website activity recorded yet."}</div>`;
      return;
    }

    const visibleEntries = entries.slice(0, 6);
    if (entries.length > visibleEntries.length) {
      visibleEntries.push({
        domain: "Other sites",
        milliseconds: entries.slice(6).reduce((total, item) => total + item.milliseconds, 0)
      });
    }

    let currentDegree = 0;
    const gradientSegments = [];
    const ariaParts = [];
    visibleEntries.forEach((item, index) => {
      const nextDegree = currentDegree + (item.milliseconds / totalMilliseconds) * 360;
      const color = sessionActivityColors[index % sessionActivityColors.length];
      gradientSegments.push(`${color} ${currentDegree}deg ${nextDegree}deg`);
      ariaParts.push(`${item.domain}: ${formatActivityDuration(item.milliseconds)}`);
      currentDegree = nextDegree;
    });

    pie.style.background = `conic-gradient(${gradientSegments.join(", ")})`;
    pie.setAttribute("aria-label", ariaParts.join(", "));
    legend.innerHTML = "";

    visibleEntries.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "session-activity-legend-row";

      const swatch = document.createElement("span");
      swatch.className = "session-activity-swatch";
      swatch.style.backgroundColor = sessionActivityColors[index % sessionActivityColors.length];

      const domain = document.createElement("span");
      domain.className = "session-activity-domain";
      domain.textContent = item.domain;
      domain.title = item.domain;

      const duration = document.createElement("span");
      duration.className = "session-activity-duration";
      duration.textContent = formatActivityDuration(item.milliseconds);

      row.appendChild(swatch);
      row.appendChild(domain);
      row.appendChild(duration);
      legend.appendChild(row);
    });
  }

  function refreshSessionActivity() {
    chrome.runtime.sendMessage({ type: "GET_SESSION_ACTIVITY" }, (response) => {
      if (chrome.runtime.lastError || !response || !response.success) return;
      renderActivityChart(
        sessionActivityPie,
        sessionActivityLegend,
        sessionActivityLabel,
        response.activity,
        response.isActive,
        false
      );
      renderActivityChart(
        parentSessionActivityPie,
        parentSessionActivityLegend,
        parentSessionActivityLabel,
        response.activity,
        response.isActive,
        !!response.isParentView
      );
    });
  }

  // --- PASSWORD VISIBILITY TOGGLE ---
  function setupPasswordToggles() {
    document.querySelectorAll(".toggle-password-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const input = btn.parentElement.querySelector("input");
        if (!input) return;

        if (input.type === "password") {
          input.type = "text";
          btn.innerHTML = `
            <svg class="eye-off-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
          `;
        } else {
          input.type = "password";
          btn.innerHTML = `
            <svg class="eye-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          `;
        }
      });
    });
  }

  // --- WHITELIST LOCK/UNLOCK ---
  btnPromptUnlockWhitelist.addEventListener("click", () => {
    whitelistLockOverlay.style.display = "none";
    whitelistUnlockInputContainer.style.display = "flex";
    whitelistUnlockPassword.focus();
  });

  btnCancelUnlockWhitelist.addEventListener("click", () => {
    whitelistUnlockInputContainer.style.display = "none";
    whitelistLockOverlay.style.display = "flex";
    whitelistUnlockPassword.value = "";
    whitelistUnlockError.style.display = "none";
  });

  btnConfirmUnlockWhitelist.addEventListener("click", () => {
    const password = whitelistUnlockPassword.value;
    if (!password) {
      showError(whitelistUnlockError, "Password required.");
      return;
    }

    // Try a test whitelist update with same array to verify password
    chrome.runtime.sendMessage({
      type: "UPDATE_WHITELIST",
      allowedUrls: currentAllowedUrls,
      password: password
    }, (response) => {
      if (response && response.success) {
        isWhitelistUnlocked = true;
        whitelistUnlockInputContainer.style.display = "none";
        whitelistLockOverlay.style.display = "none";
        whitelistUnlockPassword.value = "";
        whitelistUnlockError.style.display = "none";
      } else {
        showError(whitelistUnlockError, response.error || "Incorrect password.");
      }
    });
  });

  function showError(element, message) {
    element.textContent = message;
    element.style.display = "block";
    setTimeout(() => {
      element.style.display = "none";
    }, 4000);
  }

  // Change Password Form Submission
  if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", (e) => {
      if (focusMode === "child") {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      const oldPass = changeOldPassword.value;
      const newPass = changeNewPassword.value;
      const confirmPass = changeConfirmPassword.value;

      if (newPass !== confirmPass) {
        showError(changePasswordError, "New passwords do not match.");
        return;
      }

      if (newPass.length < 4) {
        showError(changePasswordError, "New password must be at least 4 characters.");
        return;
      }

      chrome.runtime.sendMessage({
        type: "CHANGE_PASSWORD",
        oldPassword: oldPass,
        newPassword: newPass
      }, (response) => {
        if (response && response.success) {
          changeOldPassword.value = "";
          changeNewPassword.value = "";
          changeConfirmPassword.value = "";
          changePasswordError.style.display = "none";
          
          changePasswordSuccess.style.display = "block";
          setTimeout(() => {
            changePasswordSuccess.style.display = "none";
          }, 3000);
          
          syncProgress();
          refreshState();
        } else {
          showError(changePasswordError, response.error || "Failed to change password.");
        }
      });
    });
  }

  // --- FEEDBACK RATING HANDLERS ---
  let selectedRating = 0;
  let selectedThumb = null; // 'up' or 'down'

  // Thumb buttons
  if (btnThumbUp && btnThumbDown) {
    btnThumbUp.addEventListener("click", () => {
      selectedThumb = selectedThumb === "up" ? null : "up";
      updateThumbUI();
    });

    btnThumbDown.addEventListener("click", () => {
      selectedThumb = selectedThumb === "down" ? null : "down";
      updateThumbUI();
    });
  }

  function updateThumbUI() {
    if (selectedThumb === "up") {
      btnThumbUp.classList.add("active-up");
      btnThumbDown.classList.remove("active-down");
    } else if (selectedThumb === "down") {
      btnThumbDown.classList.add("active-down");
      btnThumbUp.classList.remove("active-up");
    } else {
      btnThumbUp.classList.remove("active-up");
      btnThumbDown.classList.remove("active-down");
    }
  }

  // Star buttons
  starBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const rating = parseInt(btn.dataset.rating, 10);
      selectedRating = selectedRating === rating ? 0 : rating;
      updateStarsUI();
    });
  });

  function updateStarsUI() {
    starBtns.forEach(btn => {
      const rating = parseInt(btn.dataset.rating, 10);
      if (rating <= selectedRating) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  // Submit feedback
  if (btnSubmitFeedback) {
    btnSubmitFeedback.addEventListener("click", async () => {
      const commentsText = feedbackComments ? feedbackComments.value.trim() : "";

      if (selectedRating === 0 && !selectedThumb && !commentsText) {
        if (feedbackError) {
          feedbackError.textContent = "Please rate the session, choose a thumb, or add a comment before submitting.";
          feedbackError.style.display = "block";
        }
        return;
      }
      if (feedbackError) {
        feedbackError.style.display = "none";
      }

      const feedback = {
        rating: selectedRating,
        thumb: selectedThumb,
        comments: commentsText,
        timestamp: Date.now()
      };

      // 1. Submit to server database asynchronously (fails silently if offline/unconfigured)
      try {
        fetch(backendPath("/api/feedback"), {
          method: "POST",
          headers: getFeedbackHeaders(),
          body: JSON.stringify({
            ...feedback,
            feedbackKey: getFeedbackKey()
          })
        }).catch(err => console.error("Failed to submit feedback to server:", err));
      } catch (e) {
        console.error("Feedback dispatch error:", e);
      }

      // 2. Save locally in extension storage
      const result = await chrome.storage.local.get("feedbackHistory");
      const history = result.feedbackHistory || [];
      history.push(feedback);
      
      await chrome.storage.local.set({ 
        feedbackHistory: history, 
        showFeedbackPrompt: false 
      });
      hasSubmittedSessionFeedback = true;
      await syncProgress();

      // Show success feedback
      feedbackSuccessMsg.style.display = "block";

      // Reset feedback form states
      selectedRating = 0;
      selectedThumb = null;
      if (feedbackComments) {
        feedbackComments.value = "";
      }
      updateThumbUI();
      updateStarsUI();

      setTimeout(() => {
        feedbackSuccessMsg.style.display = "none";
        window.close();
        refreshState();
      }, 1500);
    });
  }

  if (btnLaterFeedback) {
    btnLaterFeedback.addEventListener("click", async () => {
      // Snooze this prompt until the next focus session ends.
      await chrome.storage.local.set({
        showFeedbackPrompt: false,
        feedbackPromptDeferred: true
      });
      window.close();
    });
  }

  // Listen for session end from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "SESSION_ENDED") {
      isWhitelistUnlocked = false;
      refreshState();
      refreshSessionActivity();
    }
  });

  async function getOrCreateFeedbackUserId() {
    const result = await chrome.storage.local.get("feedbackUserId");
    if (result.feedbackUserId) {
      return result.feedbackUserId;
    }

    const newId = `fb_${crypto.randomUUID()}`;
    await chrome.storage.local.set({ feedbackUserId: newId });
    return newId;
  }

  function getFeedbackKey() {
    const email = typeof accountUser?.email === "string" ? accountUser.email.trim().toLowerCase() : "";
    return email ? `account:${email}` : feedbackUserId;
  }

  function getFeedbackHeaders() {
    return {
      "Content-Type": "application/json",
      ...(accountToken ? { Authorization: `Bearer ${accountToken}` } : {})
    };
  }

  async function loadSessionFeedbackState() {
    const result = await chrome.storage.local.get("feedbackHistory");
    hasSubmittedSessionFeedback = Array.isArray(result.feedbackHistory) && result.feedbackHistory.length > 0;
  }

  async function loadAccount() {
    const result = await chrome.storage.local.get(["accountToken", "accountUser"]);
    accountToken = result.accountToken || null;
    accountUser = result.accountUser || null;
    renderAccount();

    if (!accountToken) return;

    try {
      const response = await fetch(backendPath("/api/auth/profile"), {
        headers: { Authorization: `Bearer ${accountToken}` }
      });
      if (!response.ok) {
        if (response.status === 401) {
          accountToken = null;
          accountUser = null;
          await chrome.storage.local.remove(["accountToken", "accountUser"]);
          renderAccount();
          showError(accountError, "Your Google session expired. Sign in again to sync progress.");
          return;
        }
        console.warn("Account profile refresh failed; keeping stored login until logout.");
        return;
      }

      const data = await response.json();
      accountUser = data.user;
      await chrome.storage.local.set({ accountUser });
      await restoreProgress(data.progress);
      renderAccount();
    } catch (e) {
      console.error("Could not refresh account profile:", e);
    }
  }

  function renderAccount() {
    if (!accountForm || !btnAccountLogout) return;

    if (accountToken && accountUser) {
      accountForm.style.display = "none";
      btnAccountLogout.style.display = "inline-flex";
      if (accountStatusText) accountStatusText.textContent = `Signed in as ${accountUser.email}. Progress sync is on.`;
    } else {
      accountForm.style.display = "flex";
      btnAccountLogout.style.display = "none";
    }
  }

  async function accountRequest(path, payload) {
    let response;
    try {
      response = await fetch(backendPath(path), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      throw new Error("Could not reach the account server. Check your internet connection and try again.");
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const serverMessage = data.error || data.message;
      const normalizedServerMessage = typeof serverMessage === "string"
        ? serverMessage.toLowerCase()
        : "";
      if (path === "/api/auth/login" && (
        response.status === 404 ||
        normalizedServerMessage.includes("application not found")
      )) {
        throw new Error("Email or password is incorrect.");
      }

      if (serverMessage) {
        throw new Error(serverMessage);
      }

      const statusMessage = response.statusText ? ` ${response.statusText}` : "";
      throw new Error(`Account server error: ${response.status}${statusMessage}.`);
    }

    return data;
  }

  async function finishGoogleAccountLogin(data) {
    accountToken = data.token;
    accountUser = data.user;
    await chrome.storage.local.set({ accountToken, accountUser });
    await restoreProgress(data.progress);
    renderAccount();
    await refreshState();
    await syncProgress();
  }

  async function signInWithGoogle() {
    hideAccountError();
    try {
      const configResponse = await fetch(backendPath("/api/auth/config"));
      const config = await configResponse.json().catch(() => ({}));
      if (!configResponse.ok || !config.issuerBaseUrl || !config.clientId || !config.extensionRedirectUri) {
        throw new Error(config.error || "Google sign-in is not configured yet.");
      }

      const redirectUri = chrome.identity.getRedirectURL("callback");
      if (redirectUri !== config.extensionRedirectUri) {
        throw new Error("The extension OAuth callback does not match the server configuration.");
      }

      const state = createRandomString();
      const codeVerifier = createRandomString(48);
      const codeChallenge = await createCodeChallenge(codeVerifier);
      const authorizeUrl = new URL(`${config.issuerBaseUrl}/authorize`);
      authorizeUrl.search = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid profile email",
        connection: "google-oauth2",
        state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      }).toString();

      const callbackUrl = await chrome.identity.launchWebAuthFlow({
        url: authorizeUrl.toString(),
        interactive: true,
      });
      const callback = new URL(callbackUrl);
      if (callback.searchParams.get("state") !== state) {
        throw new Error("Google sign-in state validation failed.");
      }
      if (callback.searchParams.get("error")) {
        throw new Error(callback.searchParams.get("error_description") || "Google sign-in was cancelled.");
      }

      const code = callback.searchParams.get("code");
      if (!code) {
        throw new Error("Google did not return a sign-in code.");
      }

      const data = await accountRequest("/api/auth/google-login", {
        code,
        codeVerifier,
        redirectUri,
      });
      await finishGoogleAccountLogin(data);
    } catch (e) {
      showError(accountError, e.message);
    }
  }

  async function restoreProgress(progress) {
    if (!hasMeaningfulProgress(progress)) return;
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "RESTORE_PROGRESS", progress }, (response) => {
        if (!response || !response.success) {
          showError(accountError, (response && response.error) || "Could not restore progress.");
        }
        resolve();
      });
    });
  }

  function hasMeaningfulProgress(progress) {
    if (!progress || typeof progress !== "object") return false;
    const feedback = progress.permanentFeedback;
    return Boolean(
      (Array.isArray(progress.allowedUrls) && progress.allowedUrls.length > 0) ||
      (Array.isArray(progress.whitelistHistory) && progress.whitelistHistory.length > 0) ||
      (Array.isArray(progress.historyGroups) && progress.historyGroups.length > 0) ||
      (Array.isArray(progress.feedbackHistory) && progress.feedbackHistory.length > 0) ||
      (typeof progress.lockPassword === "string" && progress.lockPassword.length > 0) ||
      (typeof progress.parentPassword === "string" && progress.parentPassword.length > 0) ||
      (typeof progress.parentEmail === "string" && progress.parentEmail.length > 0) ||
      progress.childLinked === true ||
      progress.modeLocked === true ||
      progress.focusMode === "parent" ||
      progress.focusMode === "child" ||
      (feedback && typeof feedback === "object" && (
        Number(feedback.rating) > 0 ||
        feedback.thumb === "up" ||
        feedback.thumb === "down" ||
        (typeof feedback.comments === "string" && feedback.comments.length > 0)
      ))
    );
  }

  async function buildProgressPayload() {
    const result = await chrome.storage.local.get([
      "allowedUrls",
      "whitelistHistory",
      "historyGroups",
      "feedbackHistory",
      "password",
      "parentPassword",
      "parentEmail",
      "childLinked",
      "focusMode",
      "modeLocked",
      "permanentFeedback"
    ]);
    return {
      allowedUrls: result.allowedUrls || [],
      whitelistHistory: result.whitelistHistory || [],
      historyGroups: result.historyGroups || [],
      feedbackHistory: result.feedbackHistory || [],
      lockPassword: result.password || "",
      parentPassword: result.parentPassword || "",
      parentEmail: result.parentEmail || "",
      childLinked: !!result.childLinked,
      focusMode: result.focusMode || "self",
      modeLocked: !!result.modeLocked,
      permanentFeedback: result.permanentFeedback || permanentFeedback
    };
  }

  async function syncProgress() {
    if (!accountToken) {
      return {
        success: false,
        error: "Sign in with Google in Account Sync before saving a parent password."
      };
    }
    try {
      const progress = await buildProgressPayload();
      const response = await fetch(backendPath("/api/progress"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accountToken}`
        },
        body: JSON.stringify({ progress })
      });
      if (!response.ok) {
        if (response.status === 401) {
          accountToken = null;
          accountUser = null;
          await chrome.storage.local.remove(["accountToken", "accountUser"]);
          renderAccount();
          throw new Error("Your Google session expired. Sign in again.");
        }
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Account sync failed with status ${response.status}.`);
      }
      return { success: true };
    } catch (e) {
      console.error("Progress sync failed:", e);
      return {
        success: false,
        error: e.message || "Account sync failed."
      };
    }
  }

  async function clearAccount() {
    accountToken = null;
    accountUser = null;
    modeLocked = false;
    hideAccountError();
    if (focusModeSelect) {
      focusModeSelect.disabled = false;
    }
    await chrome.storage.local.remove(["accountToken", "accountUser", "modeLocked"]);
    renderAccount();
    await refreshState();
  }

  function hideAccountError() {
    if (accountError) {
      accountError.style.display = "none";
    }
  }

  if (btnAccountGoogle) {
    btnAccountGoogle.addEventListener("click", signInWithGoogle);
  }

  if (btnAccountLogout) {
    btnAccountLogout.addEventListener("click", clearAccount);
  }

  async function loadPermanentFeedback() {
    const result = await chrome.storage.local.get("permanentFeedback");
    permanentFeedback = {
      rating: Number(result.permanentFeedback && result.permanentFeedback.rating) || 0,
      thumb: result.permanentFeedback && (result.permanentFeedback.thumb === "up" || result.permanentFeedback.thumb === "down")
        ? result.permanentFeedback.thumb
        : null,
      comments: typeof (result.permanentFeedback && result.permanentFeedback.comments) === "string"
        ? result.permanentFeedback.comments
        : ""
    };
  }

  function bindPermanentFeedbackControls() {
    if (permThumbUp) {
      permThumbUp.addEventListener("click", () => {
        permanentFeedback.thumb = permanentFeedback.thumb === "up" ? null : "up";
        savePermanentFeedback();
      });
    }

    if (permThumbDown) {
      permThumbDown.addEventListener("click", () => {
        permanentFeedback.thumb = permanentFeedback.thumb === "down" ? null : "down";
        savePermanentFeedback();
      });
    }

    permStarBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const rating = parseInt(btn.dataset.rating, 10);
        permanentFeedback.rating = permanentFeedback.rating === rating ? 0 : rating;
        savePermanentFeedback();
      });
    });

    if (permFeedbackComments) {
      permFeedbackComments.addEventListener("input", () => {
        permanentFeedback.comments = permFeedbackComments.value;
        savePermanentFeedback(true);
      });
    }
  }

  function renderPermanentFeedback() {
    if (permFeedbackComments) {
      permFeedbackComments.value = permanentFeedback.comments || "";
    }

    if (permThumbUp && permThumbDown) {
      permThumbUp.classList.toggle("active-up", permanentFeedback.thumb === "up");
      permThumbDown.classList.toggle("active-down", permanentFeedback.thumb === "down");
    }

    permStarBtns.forEach((btn) => {
      const rating = parseInt(btn.dataset.rating, 10);
      btn.classList.toggle("active", rating <= permanentFeedback.rating && permanentFeedback.rating > 0);
    });
  }

  async function savePermanentFeedback(skipServer = false) {
    renderPermanentFeedback();
    await chrome.storage.local.set({ permanentFeedback });
    await syncProgress();

    if (!skipServer && accountToken) {
      try {
        await fetch(backendPath("/api/feedback"), {
          method: "POST",
          headers: getFeedbackHeaders(),
          body: JSON.stringify({
            rating: permanentFeedback.rating,
            thumb: permanentFeedback.thumb,
            comments: permanentFeedback.comments || "",
            feedbackKey: getFeedbackKey()
          })
        });
        if (permFeedbackSuccess) {
          permFeedbackSuccess.style.display = "block";
          setTimeout(() => {
            permFeedbackSuccess.style.display = "none";
          }, 1500);
        }
      } catch (e) {
        console.error("Failed to save permanent feedback:", e);
      }
    }
  }
});
