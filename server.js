const express = require("express");
const archiver = require("archiver");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 3000;

// Support parsing JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express Session
app.use(session({
  secret: "secret-key-change-this", // TODO: Use environment variable in production
  resave: false,
  saveUninitialized: false
}));

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

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

// Passport configuration
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const db = readDB();
  const user = db.users.find(u => u.id === id);
  done(null, user);
});

// Local Strategy
passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
  const db = readDB();
  const user = db.users.find(u => u.email === email);
  if (!user) return done(null, false, { message: 'Incorrect email.' });
  
  bcrypt.compare(password, user.password, (err, isMatch) => {
    if (err) throw err;
    if (isMatch) return done(null, user);
    else return done(null, false, { message: 'Incorrect password.' });
  });
}));

// Google Strategy (needs clientID/Secret setup later)
passport.use(new GoogleStrategy({
    clientID: "YOUR_GOOGLE_CLIENT_ID",
    clientSecret: "YOUR_GOOGLE_CLIENT_SECRET",
    callbackURL: "/auth/google/callback"
  },
  (accessToken, refreshToken, profile, done) => {
    const db = readDB();
    let user = db.users.find(u => u.googleId === profile.id);
    if (!user) {
      user = {
        id: Date.now().toString(),
        googleId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName
      };
      db.users.push(user);
      writeDB(db);
    }
    return done(null, user);
  }
));

// Authentication routes
app.post("/register", (req, res) => {
  const { email, password } = req.body;
  const db = readDB();
  if (db.users.find(u => u.email === email)) {
    return res.status(400).json({ message: "User already exists." });
  }

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) throw err;
    db.users.push({
      id: Date.now().toString(),
      email,
      password: hashedPassword
    });
    writeDB(db);
    res.json({ success: true });
  });
});

app.post("/login", passport.authenticate("local"), (req, res) => {
  res.json({ success: true, user: req.user });
});

app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get("/auth/google/callback", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect("/");
  }
);

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect("/");
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

  let totalStars = 0;
  let ratedCount = 0;
  let thumbsUp = 0;
  let thumbsDown = 0;

  feedbackList.forEach(item => {
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

  const averageRating = ratedCount > 0 ? parseFloat((totalStars / ratedCount).toFixed(1)) : 5.0; // Default to 5.0 if no ratings yet

  res.json({
    downloads,
    averageRating,
    thumbsUp,
    thumbsDown,
    totalRatings: ratedCount
  });
});

app.listen(PORT, () => {
  console.log(`AuraFocus site running on port ${PORT}`);
});
