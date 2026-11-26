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
  const urlParams = new URLSearchParams(window.location.search);
  const originalUrl = urlParams.get("url") || "https://google.com";
  const blockedUrlDisplay = document.getElementById("blocked-url-display");
  const countdownTimer = document.getElementById("countdown-timer");
  const quoteText = document.getElementById("quote-text");
  const quoteAuthor = document.getElementById("quote-author");
  const accessRequestSection = document.getElementById("access-request-section");
  const requestAccessButton = document.getElementById("request-access-button");
  const accessRequestStatus = document.getElementById("access-request-status");
  let blockedDomain = "";
  let timerInterval = null;

  try {
    const blockedUrl = new URL(originalUrl);
    blockedDomain = blockedUrl.hostname.toLowerCase().replace(/^www\./, "");
    blockedUrlDisplay.textContent = blockedUrl.hostname;
  } catch (error) {
    blockedUrlDisplay.textContent = originalUrl;
  }

  const randomQuote = FOCUS_QUOTES[Math.floor(Math.random() * FOCUS_QUOTES.length)];
  quoteText.textContent = `"${randomQuote.text}"`;
  quoteAuthor.textContent = `— ${randomQuote.author}`;

  checkStateAndStartTimer();

  function checkStateAndStartTimer() {
    chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
      if (chrome.runtime.lastError || !response || !response.success) {
        console.error("Could not reach background script.");
        return;
      }

      const state = response.state;
      if (state.focusMode === "child" && state.hasAccount && state.isFocusActive && blockedDomain && accessRequestSection) {
        accessRequestSection.hidden = false;
      }
      if (!state.isFocusActive || Date.now() >= state.sessionEndTime) {
        redirectToOriginal();
        return;
      }

      runTimer(state.sessionEndTime);
    });
  }

  if (requestAccessButton) {
    requestAccessButton.addEventListener("click", () => {
      requestAccessButton.disabled = true;
      accessRequestStatus.textContent = "Sending request...";
      chrome.runtime.sendMessage({ type: "REQUEST_SITE_ACCESS", domain: blockedDomain }, (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
          accessRequestStatus.textContent = response?.error || "Could not send the request. Check that the child device is online.";
          requestAccessButton.disabled = false;
          return;
        }
        accessRequestStatus.textContent = response.alreadyRequested
          ? "Your request is already waiting for your parent."
          : "Request sent. Your parent can review it in Parent mode.";
        requestAccessButton.textContent = "Request sent";
      });
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
      countdownTimer.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }

    update();
    timerInterval = setInterval(update, 1000);
  }

  function redirectToOriginal() {
    if (timerInterval) clearInterval(timerInterval);
    window.location.href = originalUrl;
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "SESSION_ENDED") redirectToOriginal();
  });
});
