// AuraFocus Popup Logic (popup.js)

document.addEventListener("DOMContentLoaded", async () => {
  // Elements
  const statusDot = document.getElementById("status-dot");
  const statusLabel = document.getElementById("status-label");
  
  const secSetupPassword = document.getElementById("sec-setup-password");
  const secActiveSession = document.getElementById("sec-active-session");
  const secIdleSession = document.getElementById("sec-idle-session");
  const secWhitelist = document.getElementById("sec-whitelist");
  
  // Password Setup Elements
  const passwordSetupForm = document.getElementById("password-setup-form");
  const newPasswordInput = document.getElementById("new-password");
  const confirmPasswordInput = document.getElementById("confirm-password");
  const passwordSetupError = document.getElementById("password-setup-error");
  
  // Timer Elements
  const countdownText = document.getElementById("countdown-text");
  const presetBtns = document.querySelectorAll(".preset-btn");
  const customMinutesInput = document.getElementById("custom-minutes");
  const btnSetCustom = document.getElementById("btn-set-custom");
  const btnStartFocus = document.getElementById("btn-start-focus");
  
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

  // Local popup states
  let activeDurationSeconds = 1500; // Default 25m
  let isWhitelistUnlocked = false; // Temp unlock for this popup instance
  let countdownInterval = null;
  let currentAllowedUrls = [];

  // Initialize view
  setupPasswordToggles();
  await refreshState();

  // --- STATE AND VIEW MANAGEMENT ---
  async function refreshState() {
    chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
      if (chrome.runtime.lastError || !response || !response.success) {
        console.error("Could not fetch state from background service.");
        return;
      }
      
      const state = response.state;
      currentAllowedUrls = state.allowedUrls;
      
      // Render Whitelist
      renderWhitelist(currentAllowedUrls);
      secWhitelist.style.display = "block";
      secChangePassword.style.display = state.hasPassword ? "block" : "none";

      // 1. Password Check
      if (!state.hasPassword) {
        showSection(secSetupPassword);
        secWhitelist.style.display = "none"; // Hide whitelist during setup
        secChangePassword.style.display = "none";
        updateStatus(false, "Setup");
        return;
      }

      // 2. Active Session Check
      const now = Date.now();
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
            secWhitelist.style.display = "block"; // Restore whitelist
            secChangePassword.style.display = "block";
          }
        });
        stopLocalCountdown();
        
        // Whitelist is completely unlocked in idle mode
        whitelistLockOverlay.style.display = "none";
        whitelistUnlockInputContainer.style.display = "none";
      }
    });
  }

  function showSection(sectionToShow) {
    [secSetupPassword, secActiveSession, secIdleSession, secFeedback].forEach(sec => {
      sec.style.display = sec === sectionToShow ? "block" : "none";
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

    chrome.runtime.sendMessage({ type: "SET_PASSWORD", password: newPass }, (response) => {
      if (response && response.success) {
        newPasswordInput.value = "";
        confirmPasswordInput.value = "";
        passwordSetupError.style.display = "none";
        refreshState();
      } else {
        showError(passwordSetupError, response.error || "Failed to set password.");
      }
    });
  });

  // --- TIMER PRESENTATION ---
  presetBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      presetBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeDurationSeconds = parseInt(btn.dataset.seconds, 10);
      
      // Update custom input display to match preset
      customMinutesInput.value = Math.round(activeDurationSeconds / 60);
    });
  });

  btnSetCustom.addEventListener("click", () => {
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

  // Stop session (Unlock)
  btnUnlock.addEventListener("click", () => {
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
    addWhitelistItem();
  });

  newSiteInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      addWhitelistItem();
    }
  });

  async function addWhitelistItem() {
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
    const updatedUrls = [...currentAllowedUrls];
    updatedUrls.splice(index, 1);
    saveWhitelist(updatedUrls);
  }

  function saveWhitelist(updatedUrls) {
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
      const feedback = {
        rating: selectedRating,
        thumb: selectedThumb,
        comments: feedbackComments ? feedbackComments.value.trim() : "",
        timestamp: Date.now()
      };

      const result = await chrome.storage.local.get("feedbackHistory");
      const history = result.feedbackHistory || [];
      history.push(feedback);
      
      await chrome.storage.local.set({ 
        feedbackHistory: history, 
        showFeedbackPrompt: false 
      });

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
});
