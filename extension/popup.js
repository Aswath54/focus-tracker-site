// AuraFocus Popup Logic (popup.js)
const BACKEND_URL = "https://focus-tracker-site-production.up.railway.app"; // Update this with your Railway URL!

document.addEventListener("DOMContentLoaded", async () => {
  // Elements
  const statusDot = document.getElementById("status-dot");
  const statusLabel = document.getElementById("status-label");
  const accountForm = document.getElementById("account-form");
  const accountEmail = document.getElementById("account-email");
  const accountPassword = document.getElementById("account-password");
  const accountStatusText = document.getElementById("account-status-text");
  const accountError = document.getElementById("account-error");
  const btnAccountSignup = document.getElementById("btn-account-signup");
  const btnAccountLogout = document.getElementById("btn-account-logout");
  const parentControlPanel = document.getElementById("parent-control-panel");
  const childSyncPanel = document.getElementById("child-sync-panel");
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
  const secWhitelist = document.getElementById("sec-whitelist");
  
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
  const parentPresetBtns = document.querySelectorAll(".parent-preset-btn");
  const parentCustomMinutesInput = document.getElementById("parent-custom-minutes");
  const btnParentSetCustom = document.getElementById("btn-parent-set-custom");
  const btnParentStartFocus = document.getElementById("btn-parent-start-focus");
  
  // Unlock Elements
  const unlockPasswordInput = document.getElementById("unlock-password-input");
  const btnUnlock = document.getElementById("btn-unlock");
  const unlockError = document.getElementById("unlock-error");
  
  // Whitelist Elements
  const newSiteInput = document.getElementById("new-site-input");
  const btnAddSite = document.getElementById("btn-add-site");
  const whitelistList = document.getElementById("whitelist-list");
  const whitelistActionError = document.getElementById("whitelist-action-error");
  
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
  const feedbackSuccessMsg = document.getElementById("feedback-success-msg");
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
  let childSyncUnlocked = false;
  let modeLocked = false;
  let parentDurationSeconds = 1500;
  let permanentFeedback = {
    rating: 0,
    thumb: null,
    comments: ""
  };

  // Initialize view
  setupPasswordToggles();
  await loadAccount();
  await loadPermanentFeedback();
  await refreshState();
  feedbackUserId = await getOrCreateFeedbackUserId();
  bindPermanentFeedbackControls();

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
      syncProgress();
      const isChildMode = focusMode === "child";
      const isParentMode = focusMode === "parent";
      const showParentOnlyPanels = isParentMode;
      
      // Render Whitelist
      renderWhitelist(currentAllowedUrls);
      if (focusModeSelect) {
        focusModeSelect.value = focusMode;
        focusModeSelect.disabled = modeLocked;
      }
      secWhitelist.style.display = showParentOnlyPanels ? "none" : isChildMode ? "none" : "block";
      secChangePassword.style.display = showParentOnlyPanels ? "none" : state.hasPassword && !isChildMode ? "block" : "none";
      if (parentControlPanel) {
        parentControlPanel.style.display = isParentMode ? "block" : "none";
      }
      if (childSyncPanel) {
        childSyncPanel.style.display = isParentMode ? "none" : state.focusMode === "child" && !childSyncUnlocked ? "block" : "none";
      }
      if (parentTimerPanel) {
        parentTimerPanel.style.display = "none";
      }

      // 1. Password Check
      if (!state.hasPassword) {
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
        showSection(null);
        if (secSetupPassword) secSetupPassword.style.display = "none";
        if (secActiveSession) secActiveSession.style.display = "none";
        if (secIdleSession) secIdleSession.style.display = "none";
        if (secFeedback) secFeedback.style.display = "none";
        if (secWhitelist) secWhitelist.style.display = "none";
        if (secChangePassword) secChangePassword.style.display = "none";
        if (parentControlPanel) parentControlPanel.style.display = "block";
        if (childSyncPanel) childSyncPanel.style.display = "none";
        if (parentTimerPanel) parentTimerPanel.style.display = "none";
        updateStatus(false, "Parent");
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
          if (res.showFeedbackPrompt) {
            showSection(secFeedback);
            updateStatus(false, "Feedback");
            secWhitelist.style.display = "none"; // Hide whitelist during feedback
            secChangePassword.style.display = "none";
          } else {
            showSection(secIdleSession);
            updateStatus(false, "Idle");
            secWhitelist.style.display = showParentOnlyPanels ? "none" : isChildMode ? "none" : "block"; // Restore whitelist
            secChangePassword.style.display = showParentOnlyPanels ? "none" : isChildMode ? "none" : "block";
          }
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
      });
      if (parentControlPanel) {
        parentControlPanel.style.display = focusMode === "parent" ? "block" : "none";
      }
      if (childSyncPanel) {
        childSyncPanel.style.display = focusMode === "child" && !childSyncUnlocked ? "block" : "none";
      }
      if (parentTimerPanel) {
        parentTimerPanel.style.display = focusMode === "parent" ? "block" : "none";
      }
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
      }, (response) => {
        if (response && response.success) {
          childSyncUnlocked = true;
          modeLocked = false;
          if (childSyncPassword) childSyncPassword.value = "";
          childSyncError.style.display = "none";
          if (childSyncSuccess) {
            childSyncSuccess.style.display = "block";
            setTimeout(() => childSyncSuccess.style.display = "none", 2500);
          }
          if (childSyncPanel) childSyncPanel.style.display = "none";
          if (focusModeSelect) {
            focusModeSelect.disabled = false;
          }
          chrome.storage.local.set({ modeLocked: false });
          updateFocusModeHelp();
          renderAccount();
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
        parentPassword: parentPass
      }, (response) => {
        if (response && response.success) {
          parentPassword = parentPass;
          if (parentPasswordInput) parentPasswordInput.value = "";
          if (parentPasswordConfirm) parentPasswordConfirm.value = "";
          parentPasswordError.style.display = "none";
          if (parentPasswordSuccess) {
            parentPasswordSuccess.style.display = "block";
            setTimeout(() => parentPasswordSuccess.style.display = "none", 2500);
          }
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
    chrome.runtime.sendMessage({
      type: "START_SESSION",
      durationSeconds: activeDurationSeconds,
      allowedUrls: currentAllowedUrls
    }, (response) => {
      if (response && response.success) {
        refreshState();
      } else {
        alert(response.error || "Could not start session.");
      }
    });
  });

  if (btnParentStartFocus) {
    btnParentStartFocus.addEventListener("click", () => {
      if (focusMode !== "parent") return;
      chrome.runtime.sendMessage({
        type: "START_SESSION",
        durationSeconds: parentDurationSeconds,
        allowedUrls: currentAllowedUrls
      }, (response) => {
        if (response && response.success) {
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
    history.unshift({ domain: domain, timestamp: Date.now() });
    
    // Limit to last 50 items
    if (history.length > 50) {
      history = history.slice(0, 50);
    }
    
    await chrome.storage.local.set({ whitelistHistory: history });
    renderHistory(historySearch ? historySearch.value.trim() : "");
  }

  async function addSiteDirectly(domain) {
    if (currentAllowedUrls.includes(domain)) {
      showError(whitelistActionError, "Domain already in whitelist.");
      return;
    }
    const updatedUrls = [...currentAllowedUrls, domain];
    saveWhitelist(updatedUrls);
    addToWhitelistHistory(domain); // Bring to the top of history
  }

  async function renderHistory(filterText = "") {
    if (!historyList) return;
    historyList.innerHTML = "";

    const result = await chrome.storage.local.get("whitelistHistory");
    const history = result.whitelistHistory || [];

    // Filter out currently active whitelisted domains
    let filteredHistory = history.filter(item => !currentAllowedUrls.includes(item.domain));

    // Filter by search text if any
    if (filterText) {
      const lowerFilter = filterText.toLowerCase();
      filteredHistory = filteredHistory.filter(item => item.domain.includes(lowerFilter));
    }

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

    filteredHistory.forEach(item => {
      const li = document.createElement("li");
      li.className = "site-item";

      const span = document.createElement("span");
      span.className = "site-domain";
      span.textContent = item.domain;
      span.title = item.domain;

      const addBtn = document.createElement("button");
      addBtn.className = "btn-add-history";
      addBtn.textContent = "Add";
      addBtn.addEventListener("click", () => {
        addSiteDirectly(item.domain);
      });

      li.appendChild(span);
      li.appendChild(addBtn);
      historyList.appendChild(li);
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

      const feedback = {
        rating: selectedRating,
        thumb: selectedThumb,
        comments: commentsText,
        timestamp: Date.now()
      };

      // 1. Submit to server database asynchronously (fails silently if offline/unconfigured)
      try {
        fetch(`${BACKEND_URL}/api/feedback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            ...feedback,
            feedbackKey: feedbackUserId
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

  // Listen for session end from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "SESSION_ENDED") {
      isWhitelistUnlocked = false;
      refreshState();
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

  async function loadAccount() {
    const result = await chrome.storage.local.get(["accountToken", "accountUser"]);
    accountToken = result.accountToken || null;
    accountUser = result.accountUser || null;
    renderAccount();

    if (!accountToken) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${accountToken}` }
      });
      if (!response.ok) {
        await clearAccount();
        return;
      }

      const data = await response.json();
      accountUser = data.user;
      await chrome.storage.local.set({ accountUser });
      renderAccount();
    } catch (e) {
      console.error("Could not refresh account profile:", e);
    }
  }

  function renderAccount() {
    if (!accountForm || !accountStatusText || !btnAccountLogout) return;

    if (accountToken && accountUser) {
      accountForm.style.display = "none";
      btnAccountLogout.style.display = "inline-flex";
      accountStatusText.textContent = `Signed in as ${accountUser.email}. Progress sync is on.`;
    } else {
      accountForm.style.display = "flex";
      btnAccountLogout.style.display = "none";
      accountStatusText.textContent = childSyncUnlocked
        ? "Child sync unlocked. You can log in to restore progress on this device."
        : "Log in to restore your progress on another browser.";
    }
  }

  async function accountRequest(path, payload) {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Account request failed.");
    }
    return data;
  }

  async function submitAccount(path) {
    hideAccountError();
    const email = accountEmail.value.trim();
    const password = accountPassword.value;
    if (!email || password.length < 8) {
      showError(accountError, "Enter an email and an 8+ character password.");
      return;
    }

    try {
      const data = await accountRequest(path, { email, password });
      accountToken = data.token;
      accountUser = data.user;
      await chrome.storage.local.set({ accountToken, accountUser });
      await restoreProgress(data.progress);
      if (data.progress && data.progress.modeLocked) {
        modeLocked = true;
      }
      accountEmail.value = "";
      accountPassword.value = "";
      renderAccount();
      await refreshState();
      await syncProgress();
    } catch (e) {
      showError(accountError, e.message);
    }
  }

  async function restoreProgress(progress) {
    if (!progress) return;
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "RESTORE_PROGRESS", progress }, (response) => {
        if (!response || !response.success) {
          showError(accountError, (response && response.error) || "Could not restore progress.");
        }
        resolve();
      });
    });
  }

  async function buildProgressPayload() {
    const result = await chrome.storage.local.get([
      "allowedUrls",
      "whitelistHistory",
      "feedbackHistory",
      "password",
      "parentPassword",
      "focusMode",
      "modeLocked",
      "permanentFeedback"
    ]);
    return {
      allowedUrls: result.allowedUrls || [],
      whitelistHistory: result.whitelistHistory || [],
      feedbackHistory: result.feedbackHistory || [],
      lockPassword: result.password || "",
      parentPassword: result.parentPassword || "",
      focusMode: result.focusMode || "self",
      modeLocked: !!result.modeLocked,
      permanentFeedback: result.permanentFeedback || permanentFeedback
    };
  }

  async function syncProgress() {
    if (!accountToken) return;
    try {
      const progress = await buildProgressPayload();
      await fetch(`${BACKEND_URL}/api/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accountToken}`
        },
        body: JSON.stringify({ progress })
      });
    } catch (e) {
      console.error("Progress sync failed:", e);
    }
  }

  async function clearAccount() {
    accountToken = null;
    accountUser = null;
    modeLocked = false;
    if (focusModeSelect) {
      focusModeSelect.disabled = false;
    }
    await chrome.storage.local.remove(["accountToken", "accountUser", "modeLocked"]);
    renderAccount();
  }

  function hideAccountError() {
    if (accountError) {
      accountError.style.display = "none";
    }
  }

  if (accountForm) {
    accountForm.addEventListener("submit", (event) => {
      event.preventDefault();
      submitAccount("/api/auth/login");
    });
  }

  if (btnAccountSignup) {
    btnAccountSignup.addEventListener("click", () => {
      submitAccount("/api/auth/signup");
    });
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
    renderPermanentFeedback();
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
        await fetch(`${BACKEND_URL}/api/feedback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            rating: permanentFeedback.rating,
            thumb: permanentFeedback.thumb,
            comments: permanentFeedback.comments || "",
            feedbackKey: feedbackUserId
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
