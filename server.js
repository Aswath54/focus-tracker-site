require("dotenv").config({ quiet: true });
const express = require("express");
const archiver = require("archiver");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const { auth, requiresAuth } = require("express-openid-connect");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_EMAIL = normalizeEnv(process.env.ADMIN_EMAIL).toLowerCase();
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || "";
const ADMIN_SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET || process.env.SECRET || "aurafocus-admin-session-secret";

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
  res.redirect("/admin-login.html");
});

const EXTENSION_DIR = path.join(__dirname, "extension");
const DB_FILE = path.join(__dirname, "database.json");

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

function isAdminConfigured() {
  return Boolean(ADMIN_EMAIL && ADMIN_PASSWORD_HASH);
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
    feedbackHistory: Array.isArray(source.feedbackHistory) ? source.feedbackHistory.slice(-100) : [],
    lockPassword: typeof source.lockPassword === "string" ? source.lockPassword : "",
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
  return res.redirect("/admin-login.html");
});

app.get("/signup", (req, res) => {
  return res.redirect("/admin-login.html");
});

app.get("/profile", (req, res) => {
  return res.redirect("/admin-login.html");
});

app.get("/auth/complete-signup", requireAuthIfConfigured, (req, res) => {
  return res.redirect("/admin-login.html");
});

app.get("/auth/complete-login", requireAuthIfConfigured, (req, res) => {
  return res.redirect("/admin-login.html");
});

app.post("/auth/local/signup", (req, res) => {
  const { email, password } = req.body || {};
  const result = upsertLocalUser(email, password);
  if (!result.ok) {
    return res.status(400).json({ error: result.message });
  }

  req.session.localUser = {
    email: normalizeEmail(email),
    name: normalizeEmail(email),
  };
  return res.json({ success: true });
});

app.post("/auth/local/login", async (req, res) => {
  const { email, password } = req.body || {};
  const user = findUserByEmail(email);
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const isValid = await bcrypt.compare(typeof password === "string" ? password : "", user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  req.session.localUser = {
    email: normalizeEmail(user.email),
    name: normalizeEmail(user.email),
  };
  return res.json({ success: true });
});

app.post("/api/auth/signup", (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Use a valid email and an 8+ character password." });
  }

  const db = readDB();
  db.users = Array.isArray(db.users) ? db.users : [];
  if (db.users.some((user) => normalizeEmail(user.email) === normalizedEmail)) {
    return res.status(409).json({ error: "That email already has an account." });
  }

  const user = {
    email: normalizedEmail,
    passwordHash: bcrypt.hashSync(password, 10),
    provider: "extension",
    extensionToken: createExtensionToken(),
    progress: sanitizeProgress({}),
    createdAt: Date.now(),
  };
  db.users.push(user);
  writeDB(db);

  res.json({ token: user.extensionToken, user: { email: user.email }, progress: user.progress });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  const db = readDB();
  db.users = Array.isArray(db.users) ? db.users : [];
  const user = db.users.find((item) => normalizeEmail(item.email) === normalizeEmail(email));
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const isValid = await bcrypt.compare(typeof password === "string" ? password : "", user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  user.extensionToken = user.extensionToken || createExtensionToken();
  user.progress = sanitizeProgress(user.progress || {});
  writeDB(db);

  res.json({ token: user.extensionToken, user: { email: user.email }, progress: user.progress });
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

app.post("/auth/local/logout", (req, res) => {
  if (req.session) {
    delete req.session.localUser;
  }
  res.json({ success: true });
});

app.post("/admin/login", async (req, res) => {
  if (!isAdminConfigured()) {
    return res.status(503).json({ error: "Admin login is not configured." });
  }

  const { email, password } = req.body || {};
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const candidatePassword = typeof password === "string" ? password : "";

  const isPasswordValid = await bcrypt.compare(candidatePassword, ADMIN_PASSWORD_HASH);
  if (normalizedEmail !== ADMIN_EMAIL || !isPasswordValid) {
    return res.status(401).json({ error: "Invalid admin credentials." });
  }

  req.session.isAdmin = true;
  req.session.adminEmail = ADMIN_EMAIL;
  return res.json({ success: true });
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
  const cleanFeedbackKey = normalizeFeedbackKey(feedbackKey);

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
