// AuraFocus Landing Page JS

// Animate the mock timer in the browser mockup
(function animateMockTimer() {
  const timerEl = document.querySelector(".mock-timer");
  if (!timerEl) return;
  
  let totalSeconds = 18 * 60 + 42;
  
  setInterval(() => {
    if (totalSeconds <= 0) totalSeconds = 25 * 60;
    totalSeconds--;
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    timerEl.textContent = `${m}:${s}`;
  }, 1000);
})();

// Track download button clicks
document.querySelectorAll("[id$='-download-btn']").forEach(btn => {
  btn.addEventListener("click", () => {
    // Optionally track via analytics
    btn.textContent = "Downloading...";
    setTimeout(() => {
      btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download AuraFocus Free`;
    }, 2500);
  });
});

// Smooth scroll for nav links
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener("click", e => {
    const target = document.querySelector(link.getAttribute("href"));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

// Scroll reveal animation
const revealEls = document.querySelectorAll(".feature-card, .step, .usage-card, .allowed-category, .cta-card");
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translateY(0)";
    }
  });
}, { threshold: 0.1 });

revealEls.forEach(el => {
  el.style.opacity = "0";
  el.style.transform = "translateY(24px)";
  el.style.transition = "opacity 0.5s ease, transform 0.5s ease";
  observer.observe(el);
});

// Tab Switching for Guides (Installation vs Daily Usage)
(function handleTabSwitching() {
  const tabs = document.querySelectorAll(".tab-btn");
  const contents = document.querySelectorAll(".tab-content");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      // Remove active class from all tabs
      tabs.forEach(t => t.classList.remove("active"));
      // Add active class to clicked tab
      tab.classList.add("active");

      // Hide all contents
      contents.forEach(c => c.classList.remove("active"));
      // Show matching content
      const targetContent = document.getElementById(tab.dataset.tab);
      if (targetContent) {
        targetContent.classList.add("active");
        
        // Trigger resize event to make sure any scroll reveals / intersection observers re-assess positions
        window.dispatchEvent(new Event('resize'));
      }
    });
  });
})();

// Fetch and render live stats from the backend database
async function renderLiveStats() {
  try {
    const response = await fetch("/api/stats");
    if (response.ok) {
      const data = await response.json();
      
      const downloadsEl = document.getElementById("stat-downloads");
      const starsEl = document.getElementById("stat-stars");
      const thumbsEl = document.getElementById("stat-thumbs");
      const averagePillEl = document.getElementById("feedback-average-pill");
      const thumbsPillEl = document.getElementById("feedback-thumbs-pill");
      
      if (downloadsEl) downloadsEl.textContent = data.downloads.toLocaleString();
      if (starsEl) starsEl.textContent = `${data.averageRating.toFixed(1)} ★`;
      if (thumbsEl) thumbsEl.textContent = data.thumbsUp.toLocaleString();
      if (averagePillEl) averagePillEl.textContent = `${data.averageRating.toFixed(1)} stars`;
      if (thumbsPillEl) thumbsPillEl.textContent = `${data.thumbsUp.toLocaleString()} thumbs up`;
    }
  } catch (e) {
    console.error("Failed to load live stats:", e);
  }
}

(function fetchLiveStats() {
  renderLiveStats();
  setInterval(renderLiveStats, 30000);
})();

// Render the authenticated user state in the nav.
(async function renderAuthState() {
  const authSection = document.getElementById("auth-section");
  const loginBtn = document.getElementById("login-btn");
  const signupBtn = document.getElementById("signup-btn");
  const logoutBtn = document.getElementById("logout-btn");
  if (!authSection || !loginBtn || !logoutBtn) return;

  try {
    const response = await fetch("/profile");
    if (!response.ok) return;

    const user = await response.json();
    const label = document.createElement("span");
    label.textContent = `Hello, ${user.name || user.email || "friend"}`;
    label.style.marginRight = "10px";
    label.style.fontSize = "0.95rem";
    label.style.opacity = "0.9";

    loginBtn.style.display = "none";
    if (signupBtn) signupBtn.style.display = "none";
    logoutBtn.style.display = "inline-flex";
    authSection.prepend(label);
  } catch (e) {
    console.error("Failed to load auth state:", e);
  }
})();
