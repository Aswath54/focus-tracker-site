const express = require("express");
const archiver = require("archiver");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files (the landing page)
app.use(express.static(path.join(__dirname, "public")));

// Extension files to include in the zip
const EXTENSION_FILES = [
  "manifest.json",
  "background.js",
  "popup.html",
  "popup.css",
  "popup.js",
  "blocked.html",
  "blocked.css",
  "blocked.js",
  "icon.svg"
];

const EXTENSION_DIR = path.join(__dirname, "extension");

// Download endpoint — dynamically zips the extension on request
app.get("/download", (req, res) => {
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", "attachment; filename=AuraFocus-Extension.zip");

  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.on("error", (err) => {
    console.error("Archiver error:", err);
    res.status(500).send("Failed to create download.");
  });

  archive.pipe(res);

  // Add each extension file to the zip
  for (const file of EXTENSION_FILES) {
    const filePath = path.join(EXTENSION_DIR, file);
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: file });
    }
  }

  archive.finalize();
});

// Download count tracker (in-memory for simplicity, resets on restart)
let downloadCount = 0;
app.get("/api/stats", (req, res) => {
  res.json({ downloads: downloadCount });
});

// Increment on actual download
app.get("/download", (req, res, next) => {
  downloadCount++;
  next();
});

app.listen(PORT, () => {
  console.log(`AuraFocus site running on port ${PORT}`);
});
