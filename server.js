const express = require("express");
const archiver = require("archiver");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files (the landing page)
app.use(express.static(path.join(__dirname, "public")));

const EXTENSION_DIR = path.join(__dirname, "extension");

// Download count tracker (in-memory for simplicity, resets on restart)
let downloadCount = 0;

// Download endpoint — dynamically zips the extension on request and tracks downloads
app.get("/download", (req, res) => {
  // Increment download tracker
  downloadCount++;
  console.log(`Download initiated. Total downloads: ${downloadCount}`);

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

// Stats API
app.get("/api/stats", (req, res) => {
  res.json({ downloads: downloadCount });
});

app.listen(PORT, () => {
  console.log(`AuraFocus site running on port ${PORT}`);
});
