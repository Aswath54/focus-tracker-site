require("dotenv").config({ quiet: true });
const express = require("express");
const archiver = require("archiver");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const { auth, requiresAuth } = require("express-openid-connect");

let nodemailer;
try {
  nodemailer = require("nodemailer");
} catch (error) {
  nodemailer = null;
}

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_EMAIL = normalizeEnv(process.env.ADMIN_EMAIL).toLowerCase();
const ADMIN_SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET || process.env.SECRET || "aurafocus-admin-session-secret";
const AUTH0_EXTENSION_ID = normalizeEnv(process.env.AUTH0_EXTENSION_ID);
const PASSWORD_RESET_TOKEN_TTL_MS = 1000 * 60 * 60;
const PASSWORD_RESET_REQUEST_COOLDOWN_MS = 1000 * 60;
const passwordResetRequestTimes = new Map();

app.set("trust proxy", 1);

const authEnv = {
  secret: process.env.SECRET,
  baseURL: process.env.BASE_URL,
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  issuerBaseURL: process.env.ISSUER_BASE_URL,
};
const authEnvKeys = Object.keys(authEnv);
const hasFullAuthConfig = authEnvKeys.every((key) => Boolean(authEnv[key]));
const hasPartialAuthConfig = authEnvKeys.some((key) => Boolean(authEnv[key])) && !hasFullAuthConfig;

if (hasFullAuthConfig) {
  app.use(
    auth({
      authRequired: false,
      auth0Logout: true,
      ...authEnv,
    })
  );
} else {
  if (hasPartialAuthConfig) {
    const missingKeys = authEnvKeys.filter((key) => !authEnv[key]);
    console.warn(
      `Auth disabled: missing required Auth0 env vars: ${missingKeys.join(", ")}`
    );
  } else {
    console.warn("Auth disabled: no Auth0 env vars detected.");
  }

  app.use((req, res, next) => {
    req.oidc = {
      isAuthenticated: () => false,
      user: null,
      login: () => {
        res.status(503).send("Authentication is not configured.");
      },
    };
    next();
  });
}

const requireAuthIfConfigured = hasFullAuthConfig
  ? (req, res, next) => {
      if (req.session && req.session.localUser) {
        return next();
      }
      return requiresAuth()(req, res, next);
    }
  : (req, res, next) => {
      if (req.session && req.session.localUser) {
        return next();
      }
      res.status(503).json({ error: "Authentication is not configured." });
    };

// Support parsing JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});
app.use(
  session({
    secret: ADMIN_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 12,
    },
  })
);

// Serve static files (the landing page)
app.use(express.static(path.join(__dirname, "public")));

app.get(["/", "/index.html", "/login.html", "/register.html"], (req, res) => {
  if (req.path === "/login.html" || req.path === "/register.html") {
    return res.sendFile(path.join(__dirname, "public", "login.html"));
  }
  return res.sendFile(path.join(__dirname, "public", "index.html"));
});

const EXTENSION_DIR = path.join(__dirname, "extension");
const DB_FILE = process.env.DB_FILE || path.join(__dirname, "database.json");

function normalizeEnv(value) {
  return typeof value === "string" ? value.trim() : "";
}

// Helper to read the persistent database
function readDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error reading database file:", e);
  }
  return { downloads: 0, feedback: [], users: [] };
}

// Helper to write to the persistent database
function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("Error writing to database file:", e);
  }
}

function getFeedbackStats(feedbackList) {
  let totalStars = 0;
  let ratedCount = 0;
  let thumbsUp = 0;
  let thumbsDown = 0;

  feedbackList.forEach((item) => {
    if (item.rating > 0) {
      totalStars += item.rating;
      ratedCount++;
    }
    if (item.thumb === "up") {
      thumbsUp++;
    } else if (item.thumb === "down") {
      thumbsDown++;
    }
  });

  return {
    averageRating: ratedCount > 0 ? parseFloat((totalStars / ratedCount).toFixed(1)) : 5.0,
    totalRatings: ratedCount,
    thumbsUp,
    thumbsDown,
  };
}

function normalizeFeedbackKey(value) {
  return typeof value === "string" ? value.trim() : "";
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.redirect("/admin-login.html");
}

function isAppAuthenticated(req) {
  return (req.oidc && req.oidc.isAuthenticated && req.oidc.isAuthenticated()) || Boolean(req.session && req.session.localUser);
}

function buildProfile(req) {
  if (req.session && req.session.localUser) {
    return {
      email: req.session.localUser.email,
      name: req.session.localUser.name || req.session.localUser.email,
      authProvider: "local",
    };
  }

  return req.oidc && req.oidc.user ? { ...req.oidc.user, authProvider: "google" } : null;
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function isValidEmail(email) {
  return typeof email === "string" && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function resetTokenMatches(expectedHash, actualHash) {
  if (typeof expectedHash !== "string" || typeof actualHash !== "string") {
    return false;
  }

  const expected = Buffer.from(expectedHash, "hex");
  const actual = Buffer.from(actualHash, "hex");
  return expected.length === actual.length && expected.length > 0 && crypto.timingSafeEqual(expected, actual);
}

function getPasswordResetBaseUrl(req) {
  const configuredBaseUrl = normalizeEnv(process.env.PASSWORD_RESET_BASE_URL || process.env.BASE_URL);
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    return "";
  }

  return `${req.protocol}://${req.get("host")}`.replace(/\/+$/, "");
}

function getAuth0ExtensionRedirectUri() {
  const configuredRedirectUri = normalizeEnv(process.env.AUTH0_EXTENSION_REDIRECT_URI);
  if (configuredRedirectUri) {
    return configuredRedirectUri;
  }

  return AUTH0_EXTENSION_ID
    ? `https://${AUTH0_EXTENSION_ID}.chromiumapp.org/callback`
    : "";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getPasswordResetTransporter() {
  const smtpHost = normalizeEnv(process.env.SMTP_HOST);
  if (!smtpHost || !nodemailer) {
    return null;
  }

  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpUser = normalizeEnv(process.env.SMTP_USER);
  const smtpPass = process.env.SMTP_PASS || "";
  const transportOptions = {
    host: smtpHost,
    port: smtpPort,
    secure: process.env.SMTP_SECURE === "true" || smtpPort === 465,
  };

  if (smtpUser || smtpPass) {
    transportOptions.auth = { user: smtpUser, pass: smtpPass };
  }

  return nodemailer.createTransport(transportOptions);
}

async function sendPasswordResetEmail(email, resetUrl) {
  const transporter = getPasswordResetTransporter();
  const from = normalizeEnv(
    process.env.PASSWORD_RESET_FROM || process.env.SMTP_FROM || process.env.SMTP_USER
  );

  if (!transporter || !from) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Password reset email is not configured.");
    }

    console.log(`[development] Password reset link for ${email}: ${resetUrl}`);
    return;
  }

  const safeUrl = escapeHtml(resetUrl);
  await transporter.sendMail({
    from,
    to: email,
    subject: "Reset your AuraFocus password",
    text: [
      "We received a request to reset your AuraFocus password.",
      "",
      `Reset your password here: ${resetUrl}`,
      "",
      "This link expires in one hour and can only be used once.",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: `
      <p>We received a request to reset your AuraFocus password.</p>
      <p><a href="${safeUrl}">Reset your password</a></p>
      <p>This link expires in one hour and can only be used once.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });
}

function isPasswordResetRateLimited(req, email) {
  const now = Date.now();
  const clientKey = req.ip || req.socket.remoteAddress || "unknown";
  const keys = [`ip:${clientKey}`, `email:${email}`];

  for (const key of keys) {
    const lastRequestedAt = passwordResetRequestTimes.get(key) || 0;
    if (now - lastRequestedAt < PASSWORD_RESET_REQUEST_COOLDOWN_MS) {
      return true;
    }
  }

  keys.forEach((key) => passwordResetRequestTimes.set(key, now));
  if (passwordResetRequestTimes.size > 10000) {
    for (const [key, timestamp] of passwordResetRequestTimes) {
      if (now - timestamp >= PASSWORD_RESET_REQUEST_COOLDOWN_MS) {
        passwordResetRequestTimes.delete(key);
      }
    }
  }

  return false;
}

function clearPasswordResetFields(user) {
  delete user.passwordResetTokenHash;
  delete user.passwordResetExpiresAt;
}

function findUserByResetToken(users, token) {
  if (typeof token !== "string" || token.length < 32 || token.length > 256) {
    return null;
  }

  const tokenHash = hashResetToken(token);
  const now = Date.now();
  return users.find((user) => {
    const expiresAt = Number(user.passwordResetExpiresAt);
    return (
      user.passwordResetTokenHash &&
      expiresAt > now &&
      resetTokenMatches(user.passwordResetTokenHash, tokenHash)
    );
  }) || null;
}

function isRegisteredUser(email) {
  const db = readDB();
  const users = Array.isArray(db.users) ? db.users : [];
  return users.some((user) => normalizeEmail(user.email) === normalizeEmail(email));
}

function registerUser(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return false;
  }

  const db = readDB();
  db.users = Array.isArray(db.users) ? db.users : [];

  if (!db.users.some((user) => normalizeEmail(user.email) === normalizedEmail)) {
    db.users.push({
      email: normalizedEmail,
      createdAt: Date.now(),
    });
    writeDB(db);
  }

  return true;
}

function findUserByEmail(email) {
  const db = readDB();
  const users = Array.isArray(db.users) ? db.users : [];
  return users.find((user) => normalizeEmail(user.email) === normalizeEmail(email)) || null;
}

function findUserByToken(token) {
  if (typeof token !== "string" || !token.trim()) {
    return null;
  }

  const db = readDB();
  const users = Array.isArray(db.users) ? db.users : [];
  return users.find((user) => user.extensionToken === token.trim()) || null;
}

function createExtensionToken() {
  return `af_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

function getBearerToken(req) {
  const header = req.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function sanitizeProgress(progress) {
  const source = progress && typeof progress === "object" ? progress : {};
  return {
    allowedUrls: Array.isArray(source.allowedUrls)
      ? source.allowedUrls.filter((item) => typeof item === "string").slice(0, 200)
      : [],
    whitelistHistory: Array.isArray(source.whitelistHistory)
      ? source.whitelistHistory
          .filter((item) => item && typeof item.domain === "string")
          .slice(0, 50)
          .map((item) => ({
            domain: item.domain,
            timestamp: Number(item.timestamp) || Date.now(),
          }))
      : [],
    historyGroups: Array.isArray(source.historyGroups)
      ? [...new Set(source.historyGroups.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim().slice(0, 32)))].slice(0, 30)
      : [],
    feedbackHistory: Array.isArray(source.feedbackHistory) ? source.feedbackHistory.slice(-100) : [],
    lockPassword: typeof source.lockPassword === "string" ? source.lockPassword : "",
    parentPassword: typeof source.parentPassword === "string" ? source.parentPassword : "",
    parentEmail: typeof source.parentEmail === "string" ? source.parentEmail.trim().toLowerCase().slice(0, 254) : "",
    childLinked: Boolean(source.childLinked),
    focusMode: ["self", "parent", "child"].includes(source.focusMode) ? source.focusMode : "self",
    modeLocked: Boolean(source.modeLocked),
    permanentFeedback:
      source.permanentFeedback && typeof source.permanentFeedback === "object"
        ? {
            rating: Number(source.permanentFeedback.rating) || 0,
            thumb:
              source.permanentFeedback.thumb === "up" || source.permanentFeedback.thumb === "down"
                ? source.permanentFeedback.thumb
                : null,
            comments: typeof source.permanentFeedback.comments === "string" ? source.permanentFeedback.comments : "",
          }
        : { rating: 0, thumb: null, comments: "" },
    updatedAt: Date.now(),
  };
}

function sanitizeFocusSession(session) {
  const source = session && typeof session === "object" ? session : {};
  const sessionId = typeof source.sessionId === "string" ? source.sessionId.trim().slice(0, 128) : "";
  const endTime = Number(source.endTime);
  if (!sessionId || !Number.isFinite(endTime) || endTime <= Date.now()) {
    return null;
  }

  return {
    sessionId,
    endTime,
    startedAt: Number(source.startedAt) || Date.now(),
    allowedUrls: Array.isArray(source.allowedUrls)
      ? source.allowedUrls.filter((item) => typeof item === "string").slice(0, 200)
      : [],
  };
}

function requireExtensionUser(req, res, next) {
  const user = findUserByToken(getBearerToken(req));
  if (!user) {
    return res.status(401).json({ error: "Please log in again." });
  }

  req.extensionUser = user;
  next();
}

function upsertLocalUser(email, password) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) {
    return { ok: false, message: "Email and password are required." };
  }

  const db = readDB();
  db.users = Array.isArray(db.users) ? db.users : [];
  const existingUser = db.users.find((user) => normalizeEmail(user.email) === normalizedEmail);
  const passwordHash = bcrypt.hashSync(password, 10);

  if (existingUser) {
    existingUser.passwordHash = passwordHash;
    existingUser.provider = existingUser.provider === "google" ? "hybrid" : "local";
    existingUser.updatedAt = Date.now();
  } else {
    db.users.push({
      email: normalizedEmail,
      passwordHash,
      provider: "local",
      createdAt: Date.now(),
    });
  }

  writeDB(db);
  return { ok: true };
}

// Authentication routes
app.get("/login/google", (req, res) => {
  if (!hasFullAuthConfig) {
    return res.status(503).send("Google authentication is not configured.");
  }

  return res.oidc.login({
    returnTo: "/",
    authorizationParams: {
      connection: "google-oauth2",
      scope: "openid profile email",
    },
  });
});

app.get("/signup", (req, res) => {
  return res.redirect("/login.html");
});

app.get("/profile", (req, res) => {
  return res.redirect("/");
});

app.get("/auth/complete-signup", requireAuthIfConfigured, (req, res) => {
  return res.redirect("/");
});

app.get("/auth/complete-login", requireAuthIfConfigured, (req, res) => {
  return res.redirect("/");
});

app.get("/admin/login/google", (req, res) => {
  if (!hasFullAuthConfig || !ADMIN_EMAIL) {
    return res.status(503).send("Google admin authentication is not configured.");
  }

  return res.oidc.login({
    returnTo: "/admin/auth/complete",
    authorizationParams: {
      connection: "google-oauth2",
      prompt: "select_account",
      scope: "openid profile email",
    },
  });
});

app.get("/admin/auth/complete", requireAuthIfConfigured, (req, res) => {
  const signedInEmail = normalizeEmail(req.oidc && req.oidc.user && req.oidc.user.email);
  if (!signedInEmail || signedInEmail !== ADMIN_EMAIL) {
    if (res.oidc && typeof res.oidc.logout === "function") {
      return res.oidc.logout({ returnTo: "/admin-login.html?error=unauthorized" });
    }
    return res.status(403).send("This Google account is not authorized for the admin console.");
  }

  req.session.isAdmin = true;
  req.session.adminEmail = signedInEmail;
  return res.redirect("/admin");
});

app.post("/auth/local/signup", (req, res) => {
  return res.status(410).json({ error: "Google sign-in is required." });
});

app.post("/auth/local/login", async (req, res) => {
  return res.status(410).json({ error: "Google sign-in is required." });
});

app.get("/api/auth/config", (req, res) => {
  const extensionRedirectUri = getAuth0ExtensionRedirectUri();
  if (!hasFullAuthConfig || !process.env.CLIENT_ID || !extensionRedirectUri) {
    return res.status(503).json({ error: "Google authentication is not configured." });
  }

  return res.json({
    issuerBaseUrl: authEnv.issuerBaseURL,
    clientId: authEnv.clientID,
    extensionRedirectUri,
  });
});

app.post("/api/auth/google-login", async (req, res) => {
  const code = typeof (req.body && req.body.code) === "string" ? req.body.code.trim() : "";
  const codeVerifier = typeof (req.body && req.body.codeVerifier) === "string"
    ? req.body.codeVerifier.trim()
    : "";
  const redirectUri = typeof (req.body && req.body.redirectUri) === "string"
    ? req.body.redirectUri.trim()
    : "";
  const expectedRedirectUri = getAuth0ExtensionRedirectUri();

  if (!hasFullAuthConfig || !code || !codeVerifier || !redirectUri || redirectUri !== expectedRedirectUri) {
    return res.status(400).json({ error: "Invalid Google sign-in request." });
  }

  try {
    const tokenResponse = await fetch(`${authEnv.issuerBaseURL}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: authEnv.clientID,
        client_secret: authEnv.clientSecret,
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
      }),
    });
    const tokenData = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || !tokenData.access_token) {
      return res.status(401).json({ error: "Google sign-in could not be completed." });
    }

    const profileResponse = await fetch(`${authEnv.issuerBaseURL}/userinfo`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileResponse.json().catch(() => ({}));
    const email = normalizeEmail(profile.email);
    if (!profileResponse.ok || !profile.sub || !isValidEmail(email) || profile.email_verified === false) {
      return res.status(401).json({ error: "Google did not return a verified email address." });
    }

    const db = readDB();
    db.users = Array.isArray(db.users) ? db.users : [];
    let user = db.users.find((item) => item.auth0Subject === profile.sub);
    if (!user) {
      user = db.users.find((item) => normalizeEmail(item.email) === email);
    }

    if (!user) {
      user = {
        email,
        provider: "google",
        auth0Subject: profile.sub,
        extensionToken: createExtensionToken(),
        progress: sanitizeProgress({}),
        createdAt: Date.now(),
      };
      db.users.push(user);
    } else {
      user.email = email;
      user.provider = "google";
      user.auth0Subject = profile.sub;
      user.extensionToken = user.extensionToken || createExtensionToken();
      user.progress = sanitizeProgress(user.progress || {});
      user.updatedAt = Date.now();
    }

    // Google is the only user-facing login provider; old local password hashes are no longer used.
    delete user.passwordHash;
    clearPasswordResetFields(user);
    writeDB(db);

    return res.json({
      token: user.extensionToken,
      user: { email: user.email, name: profile.name || user.email },
      progress: user.progress,
    });
  } catch (error) {
    console.error("Google extension sign-in failed:", error.message);
    return res.status(502).json({ error: "Google sign-in is temporarily unavailable." });
  }
});

const passwordResetResponse = {
  message: "If an account exists for that email, a password reset link has been sent.",
};

app.post("/api/auth/forgot-password", async (req, res) => {
  const email = normalizeEmail(req.body && req.body.email);

  // Always return the same response so this endpoint cannot be used to discover accounts.
  if (!isValidEmail(email) || isPasswordResetRateLimited(req, email)) {
    return res.status(202).json(passwordResetResponse);
  }

  const db = readDB();
  db.users = Array.isArray(db.users) ? db.users : [];
  const user = db.users.find((item) => normalizeEmail(item.email) === email);

  if (!user || !user.passwordHash) {
    return res.status(202).json(passwordResetResponse);
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  user.passwordResetTokenHash = hashResetToken(resetToken);
  user.passwordResetExpiresAt = Date.now() + PASSWORD_RESET_TOKEN_TTL_MS;
  user.updatedAt = Date.now();
  writeDB(db);

  const baseUrl = getPasswordResetBaseUrl(req);
  if (!baseUrl) {
    clearPasswordResetFields(user);
    writeDB(db);
    console.error("Password reset request rejected because PASSWORD_RESET_BASE_URL or BASE_URL is missing.");
    return res.status(202).json(passwordResetResponse);
  }

  const resetUrl = new URL("/reset-password.html", `${baseUrl}/`);
  resetUrl.searchParams.set("token", resetToken);

  try {
    await sendPasswordResetEmail(email, resetUrl.toString());
  } catch (error) {
    // Do not leave a usable token behind when delivery fails.
    const currentDb = readDB();
    const currentUser = currentDb.users && currentDb.users.find(
      (item) => normalizeEmail(item.email) === email
    );
    if (currentUser && currentUser.passwordResetTokenHash === user.passwordResetTokenHash) {
      clearPasswordResetFields(currentUser);
      writeDB(currentDb);
    }
    console.error("Password reset email could not be sent:", error.message);
  }

  return res.status(202).json(passwordResetResponse);
});

app.post("/api/auth/reset-password", (req, res) => {
  const token = typeof (req.body && req.body.token) === "string" ? req.body.token.trim() : "";
  const password = req.body && req.body.password;

  if (typeof password !== "string" || password.length < 8 || password.length > 256) {
    return res.status(400).json({ error: "Use a password between 8 and 256 characters." });
  }

  const db = readDB();
  db.users = Array.isArray(db.users) ? db.users : [];
  const user = findUserByResetToken(db.users, token);
  if (!user) {
    return res.status(400).json({ error: "This reset link is invalid or expired. Request a new one." });
  }

  user.passwordHash = bcrypt.hashSync(password, 12);
  user.provider = user.provider === "google" ? "hybrid" : (user.provider || "local");
  // Rotating this token invalidates extension sessions created before the reset.
  user.extensionToken = createExtensionToken();
  user.updatedAt = Date.now();
  clearPasswordResetFields(user);
  writeDB(db);

  return res.json({ success: true, message: "Your password has been reset. You can now log in." });
});

app.post("/api/auth/signup", (req, res) => {
  return res.status(410).json({ error: "Google sign-in is required." });
});

app.post("/api/auth/login", async (req, res) => {
  return res.status(410).json({ error: "Google sign-in is required." });
});

app.get("/api/auth/profile", requireExtensionUser, (req, res) => {
  res.json({
    user: { email: req.extensionUser.email },
    progress: sanitizeProgress(req.extensionUser.progress || {}),
  });
});

app.post("/api/progress", requireExtensionUser, (req, res) => {
  const db = readDB();
  db.users = Array.isArray(db.users) ? db.users : [];
  const user = db.users.find((item) => item.extensionToken === req.extensionUser.extensionToken);
  if (!user) {
    return res.status(401).json({ error: "Please log in again." });
  }

  user.progress = sanitizeProgress(req.body && req.body.progress);
  user.updatedAt = Date.now();
  writeDB(db);
  res.json({ success: true, progress: user.progress });
});

app.get("/api/focus-session", requireExtensionUser, (req, res) => {
  const db = readDB();
  db.users = Array.isArray(db.users) ? db.users : [];
  const user = db.users.find((item) => item.extensionToken === req.extensionUser.extensionToken);
  if (!user) {
    return res.status(401).json({ error: "Please log in again." });
  }

  const session = sanitizeFocusSession(user.activeFocusSession);
  if (!session && user.activeFocusSession) {
    delete user.activeFocusSession;
    user.updatedAt = Date.now();
    writeDB(db);
  }
  return res.json({
    active: Boolean(session),
    session,
    childLinked: Boolean(user.progress && user.progress.childLinked),
  });
});

app.post("/api/focus-session/start", requireExtensionUser, (req, res) => {
  if (!req.body || req.body.focusMode !== "parent") {
    return res.status(403).json({ error: "Only Parent mode can start a child session." });
  }

  const durationSeconds = Number(req.body.durationSeconds);
  if (!Number.isFinite(durationSeconds) || durationSeconds < 60 || durationSeconds > 720 * 60) {
    return res.status(400).json({ error: "Choose a duration between 1 minute and 12 hours." });
  }

  const db = readDB();
  db.users = Array.isArray(db.users) ? db.users : [];
  const user = db.users.find((item) => item.extensionToken === req.extensionUser.extensionToken);
  if (!user) {
    return res.status(401).json({ error: "Please log in again." });
  }

  if (!user.progress || !user.progress.childLinked) {
    return res.status(409).json({ error: "Complete child sync before starting a child session." });
  }

  const existingSession = sanitizeFocusSession(user.activeFocusSession);
  if (existingSession) {
    return res.status(409).json({ error: "A child focus session is already running.", session: existingSession });
  }

  const startedAt = Date.now();
  const focusSession = {
    sessionId: `focus_${startedAt.toString(36)}_${crypto.randomBytes(8).toString("hex")}`,
    startedAt,
    endTime: startedAt + Math.round(durationSeconds * 1000),
    allowedUrls: Array.isArray(req.body.allowedUrls)
      ? req.body.allowedUrls.filter((item) => typeof item === "string").slice(0, 200)
      : [],
  };
  user.activeFocusSession = focusSession;
  user.updatedAt = startedAt;
  writeDB(db);
  return res.json({ success: true, session: focusSession });
});

app.post("/api/focus-session/stop", requireExtensionUser, (req, res) => {
  if (!req.body || req.body.focusMode !== "parent") {
    return res.status(403).json({ error: "Only Parent mode can stop a child session." });
  }

  const db = readDB();
  db.users = Array.isArray(db.users) ? db.users : [];
  const user = db.users.find((item) => item.extensionToken === req.extensionUser.extensionToken);
  if (!user) {
    return res.status(401).json({ error: "Please log in again." });
  }

  delete user.activeFocusSession;
  user.updatedAt = Date.now();
  writeDB(db);
  return res.json({ success: true });
});

app.post("/auth/local/logout", (req, res) => {
  if (req.session) {
    delete req.session.localUser;
  }
  res.json({ success: true });
});

app.post("/admin/login", async (req, res) => {
  return res.status(410).json({ error: "Use Google sign-in for the admin console." });
});

app.post("/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get("/admin", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("/api/admin/feedback", requireAdmin, (req, res) => {
  const db = readDB();
  const feedback = (db.feedback || [])
    .slice()
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  res.json({
    feedback,
    stats: getFeedbackStats(feedback),
  });
});

// Download endpoint — dynamically zips the extension on request and tracks downloads
app.get("/download", (req, res) => {
  // Increment download tracker persistently
  const db = readDB();
  db.downloads = (db.downloads || 0) + 1;
  writeDB(db);
  console.log(`Download initiated. Total downloads: ${db.downloads}`);

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", "attachment; filename=AuraFocus-Extension.zip");

  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.on("error", (err) => {
    console.error("Archiver error:", err);
    if (!res.headersSent) {
      res.status(500).send("Failed to create download.");
    }
  });

  archive.pipe(res);

  // Dynamically archive the entire extension directory (excluding nothing)
  if (fs.existsSync(EXTENSION_DIR)) {
    archive.directory(EXTENSION_DIR, false);
  } else {
    console.error(`Extension directory not found at: ${EXTENSION_DIR}`);
  }

  archive.finalize();
});

// Submit feedback from extension popup
app.post("/api/feedback", (req, res) => {
  const { rating, thumb, comments, feedbackKey } = req.body || {};
  
  const cleanRating = parseInt(rating, 10) || 0;
  const cleanThumb = (thumb === "up" || thumb === "down") ? thumb : null;
  const cleanComments = typeof comments === "string" ? comments.trim() : "";
  const authenticatedUser = findUserByToken(getBearerToken(req));
  const accountFeedbackKey = authenticatedUser
    ? `account:${normalizeEmail(authenticatedUser.email)}`
    : "";
  const cleanFeedbackKey = accountFeedbackKey || normalizeFeedbackKey(feedbackKey);

  const db = readDB();
  db.feedback = db.feedback || [];

  const nextEntry = {
    rating: cleanRating,
    thumb: cleanThumb,
    comments: cleanComments,
    timestamp: Date.now(),
    feedbackKey: cleanFeedbackKey || null,
  };

  if (cleanFeedbackKey) {
    const existingIndex = db.feedback.findIndex((item) => normalizeFeedbackKey(item.feedbackKey) === cleanFeedbackKey);
    if (existingIndex >= 0) {
      db.feedback[existingIndex] = {
        ...db.feedback[existingIndex],
        ...nextEntry,
        firstSeenAt: db.feedback[existingIndex].firstSeenAt || db.feedback[existingIndex].timestamp || Date.now(),
      };
    } else {
      db.feedback.push({
        ...nextEntry,
        firstSeenAt: Date.now(),
      });
    }
  } else {
    db.feedback.push({
      ...nextEntry,
      firstSeenAt: Date.now(),
    });
  }

  writeDB(db);
  console.log(`Feedback received! Rating: ${cleanRating}, Thumb: ${cleanThumb}, Comment Length: ${cleanComments.length}`);
  res.json({ success: true });
});

// Stats API — Returns dynamic downloads count, average star rating, and total thumbs up/down
app.get("/api/stats", (req, res) => {
  const db = readDB();
  const downloads = db.downloads || 0;
  const feedbackList = db.feedback || [];
  const stats = getFeedbackStats(feedbackList);

  res.json({
    downloads,
    averageRating: stats.averageRating,
    thumbsUp: stats.thumbsUp,
    thumbsDown: stats.thumbsDown,
    totalRatings: stats.totalRatings
  });
});

app.listen(PORT, () => {
  console.log(`AuraFocus site running on port ${PORT}`);
});
