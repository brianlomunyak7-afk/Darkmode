#!/usr/bin/env node
"use strict";
// Minimal static server for local preview. Serves build/site if present
// (fully functional, with the download), otherwise the raw website/ dir.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = fs.existsSync(path.join(__dirname, "..", "build", "site"))
  ? path.join(__dirname, "..", "build", "site")
  : path.join(__dirname, "..", "website");
const PORT = process.env.PORT || 8080;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".zip": "application/zip",
  ".ico": "image/x-icon"
};

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const file = path.join(ROOT, path.normalize(p));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end("Forbidden"); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end("Not found"); return; }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(PORT, () => console.log(`NightShift site: http://localhost:${PORT}  (serving ${path.relative(path.join(__dirname,".."), ROOT)})`));
