"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(path.join(ROOT, p));

const manifest = JSON.parse(read("manifest.json"));

test("manifest is valid JSON and MV3", () => {
  assert.strictEqual(manifest.manifest_version, 3);
  assert.ok(manifest.name && manifest.version);
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
});

test("manifest version matches package.json", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.strictEqual(manifest.version, pkg.version,
    "manifest.json and package.json versions must match");
});

test("background service worker exists", () => {
  assert.ok(manifest.background && manifest.background.service_worker);
  assert.ok(exists(manifest.background.service_worker),
    "service worker file is missing");
});

test("popup file exists and is non-empty", () => {
  const popup = manifest.action.default_popup;
  assert.ok(exists(popup), "popup html missing");
  assert.ok(read(popup).trim().length > 0, "popup html is empty");
});

test("content script css + js files exist", () => {
  for (const cs of manifest.content_scripts) {
    for (const f of [...(cs.css || []), ...(cs.js || [])]) {
      assert.ok(exists(f), `content script resource missing: ${f}`);
    }
  }
});

test("all declared icons exist and are non-trivial", () => {
  const groups = [manifest.icons, manifest.action.default_icon];
  for (const g of groups) {
    assert.ok(g, "icon set missing from manifest");
    for (const [size, p] of Object.entries(g)) {
      assert.ok(exists(p), `icon missing: ${p}`);
      const bytes = fs.statSync(path.join(ROOT, p)).size;
      assert.ok(bytes > 100, `icon ${p} looks empty (${bytes} bytes)`);
      assert.ok(["16", "32", "48", "128"].includes(size));
    }
  }
});

test("popup references its css and js", () => {
  const html = read("popup/popup.html");
  assert.match(html, /popup\.css/, "popup.html must link popup.css");
  assert.match(html, /popup\.js/, "popup.html must load popup.js");
});

test("content css only activates behind the nightshift-on class", () => {
  const css = read("content/darkmode.css");
  assert.match(css, /html\[data-nightshift="on"\]/,
    "dark styles must be scoped so disabled pages are untouched");
});

test("keyboard commands are declared", () => {
  assert.ok(manifest.commands["toggle-global"]);
  assert.ok(manifest.commands["toggle-site"]);
});

test("permissions stay minimal (lightweight)", () => {
  assert.deepStrictEqual(manifest.permissions, ["storage"],
    "only storage is needed; site access comes from host_permissions");
});

test("background works in Chromium and Firefox", () => {
  const bg = manifest.background;
  assert.ok(bg.service_worker, "Chromium needs service_worker");
  assert.ok(Array.isArray(bg.scripts) && bg.scripts.includes(bg.service_worker),
    "Firefox needs background.scripts pointing at the same file");
});

test("Firefox add-on id is declared", () => {
  assert.ok(manifest.browser_specific_settings?.gecko?.id);
});

test("content script also covers blank and sandboxed frames", () => {
  const cs = manifest.content_scripts[0];
  assert.strictEqual(cs.all_frames, true);
  assert.strictEqual(cs.match_about_blank, true);
});

test("runtime scripts guard every async browser call", () => {
  for (const f of ["background/background.js", "popup/popup.js"]) {
    const src = read(f);
    assert.ok((src.match(/try \{/g) || []).length >= 2, `${f} should wrap browser calls`);
  }
});
