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
const ADMIN_EMAIL = "aswath.ansh@gmail.com";
const ADMIN_PASSWORD_HASH = "$2b$10$9oHOHKn04LlVy/IFh9psuuWijpjpTctTR4W2kxRADSbfmKz7gPpmi";
const ADMIN_SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET || process.env.SECRET || "aurafocus-admin-session-secret";

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
  ? requiresAuth()
  : (req, res, next) => {
      res.status(503).json({ error: "Authentication is not configured." });
    };

// Support parsing JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

const EXTENSION_DIR = path.join(__dirname, "extension");
const DB_FILE = path.join(__dirname, "database.json");

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

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.redirect("/admin-login.html");
}

// Authentication routes
app.get("/login/google", (req, res) => {
  return res.oidc.login({
    returnTo: "/",
    authorizationParams: {
      connection: "google-oauth2",
    },
  });
});

app.get("/signup", (req, res) => {
  return res.oidc.login({
    returnTo: "/",
    authorizationParams: {
      screen_hint: "signup",
    },
  });
});

app.get("/profile", (req, res) => {
  if (!req.oidc.isAuthenticated()) {
    return res.status(401).json({ authenticated: false });
  }

  res.json(req.oidc.user);
});

app.post("/admin/login", async (req, res) => {
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
app.get("/download", requireAuthIfConfigured, (req, res) => {
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
app.post("/api/feedback", requireAuthIfConfigured, (req, res) => {
  const { rating, thumb, comments } = req.body || {};
  
  const cleanRating = parseInt(rating, 10) || 0;
  const cleanThumb = (thumb === "up" || thumb === "down") ? thumb : null;
  const cleanComments = typeof comments === "string" ? comments.trim() : "";

  const db = readDB();
  db.feedback = db.feedback || [];
  
  db.feedback.push({
    rating: cleanRating,
    thumb: cleanThumb,
    comments: cleanComments,
    timestamp: Date.now()
  });

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
