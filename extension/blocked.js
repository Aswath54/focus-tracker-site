// AuraFocus Blocked Page Logic (blocked.js)

const FOCUS_QUOTES = [
  { text: "Focus is a muscle, and you are building it right now.", author: "AuraFocus" },
  { text: "You don't need more time, you need more focus.", author: "Tim Ferriss" },
  { text: "The successful warrior is the average man, with laser-like focus.", author: "Bruce Lee" },
  { text: "Only through focus can you do world-class things, no matter how capable you are.", author: "Bill Gates" },
  { text: "Work hard in silence, let your success be your noise.", author: "Frank Ocean" },
  { text: "Starve your distractions, feed your focus.", author: "Unknown" },
  { text: "Your future self is watching you right now. Make them proud.", author: "Unknown" },
  { text: "He who runs after two hares catches neither.", author: "Roman Proverb" },
  { text: "Deep work is the superpower of the 21st century.", author: "Cal Newport" },
  { text: "Concentrate all your thoughts upon the work at hand. The sun's rays do not burn until brought to a focus.", author: "Alexander Graham Bell" }
];

document.addEventListener("DOMContentLoaded", () => {
  // Parse original URL from query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const originalUrl = urlParams.get("url") || "https://google.com";

  // Elements
  const blockedUrlDisplay = document.getElementById("blocked-url-display");
  const countdownTimer = document.getElementById("countdown-timer");
  const quoteText = document.getElementById("quote-text");
  const quoteAuthor = document.getElementById("quote-author");
  
  const bypassPasswordInput = document.getElementById("bypass-password");
  const btnBypass = document.getElementById("btn-bypass");
  const bypassError = document.getElementById("bypass-error");

  let timerInterval = null;

  // 1. Display cleaner hostname instead of full URL
  try {
    const urlObj = new URL(originalUrl);
    blockedUrlDisplay.textContent = urlObj.hostname;
  } catch (e) {
    blockedUrlDisplay.textContent = originalUrl;
  }

  // 2. Set random motivational quote
  const randomQuote = FOCUS_QUOTES[Math.floor(Math.random() * FOCUS_QUOTES.length)];
  quoteText.textContent = `"${randomQuote.text}"`;
  quoteAuthor.textContent = `— ${randomQuote.author}`;

  // Initialize password visibility toggles
  setupPasswordToggles();

  // 3. Initialize state and timer loop
  checkStateAndStartTimer();

  function checkStateAndStartTimer() {
    chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
      if (chrome.runtime.lastError || !response || !response.success) {
        console.error("Could not reach background script.");
        return;
      }

      const state = response.state;

      // If focus session is not active, redirect back immediately
      if (!state.isFocusActive || Date.now() >= state.sessionEndTime) {
        redirectToOriginal();
        return;
      }

      // Start countdown
      runTimer(state.sessionEndTime);
    });
  }

  function runTimer(endTime) {
    if (timerInterval) clearInterval(timerInterval);

    function update() {
      const remainingMs = endTime - Date.now();
      
      if (remainingMs <= 0) {
        clearInterval(timerInterval);
        redirectToOriginal();
        return;
      }

      const totalSeconds = Math.ceil(remainingMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      
      countdownTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    update();
    timerInterval = setInterval(update, 1000);
  }

  function redirectToOriginal() {
    if (timerInterval) clearInterval(timerInterval);
    // Redirect the active tab back to the original destination
    window.location.href = originalUrl;
  }

  // 4. Bypass (Unlock session)
  btnBypass.addEventListener("click", () => {
    performBypass();
  });

  bypassPasswordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      performBypass();
    }
  });

  function performBypass() {
    const password = bypassPasswordInput.value;
    if (!password) {
      showError("Password is required to deactivate the blocker.");
      return;
    }

    chrome.runtime.sendMessage({
      type: "STOP_SESSION",
      password: password
    }, (response) => {
      if (response && response.success) {
        bypassPasswordInput.value = "";
        bypassError.style.display = "none";
        redirectToOriginal();
      } else {
        showError(response.error || "Incorrect password. Stay focused!");
      }
    });
  }

  function showError(msg) {
    bypassError.textContent = msg;
    bypassError.style.display = "block";
    
    // Simple shake effect
    const card = document.querySelector(".glass-card");
    card.style.animation = "none";
    // Trigger reflow
    void card.offsetWidth;
    card.style.animation = "shake 0.4s ease-in-out";
    
    setTimeout(() => {
      bypassError.style.display = "none";
    }, 4000);
  }

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

  // Listen for session end from background (e.g. naturally expired or stopped from popup)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "SESSION_ENDED") {
      redirectToOriginal();
    }
  });
});
