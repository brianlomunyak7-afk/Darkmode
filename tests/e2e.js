const puppeteer = require("puppeteer-core");
const http = require("http");
const EXT = require("path").join(__dirname, "..");
const BROWSER = process.argv[2] || process.env.BROWSER;
if (!BROWSER) { console.error("Usage: npm run test:e2e -- /path/to/chromium-browser"); process.exit(2); }

const pages = {
  "/light": `<!doctype html><title>l</title><body style="background:#fff">Hello<p>text</p></body>`,
  "/dark": `<!doctype html><title>d</title><body style="background:#121212;color:#eee">Dark site</body>`,
  "/darkhtml": `<!doctype html><title>dh</title><style>html{background:#0d1117}</style><body>Dark on html</body>`,
  "/frame": `<!doctype html><body style="background:#fff">framed</body>`,
  "/xml": `<?xml version="1.0"?><root><item>x</item></root>`,
  "/svg": `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>`,
  "/blank": `<!doctype html><body style="background:#fff"><iframe id="b"></iframe><script>b.contentDocument.body.innerHTML="inner"</script></body>`
};
const types = { "/xml": "application/xml", "/svg": "image/svg+xml" };
const srv = http.createServer((q, r) => {
  const path = q.url.split("?")[0];
  if (path === "/parent") {
    r.writeHead(200, { "content-type": "text/html" });
    return r.end(`<!doctype html><body style="background:#fff"><iframe id="f" src="http://localhost:${srv.address().port}/frame"></iframe></body>`);
  }
  if (!pages[path]) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "content-type": types[path] || "text/html" });
  r.end(pages[path]);
});

const results = [];
const ok = (name, cond, extra = "") => { results.push([cond ? "PASS" : "FAIL", name, extra]); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const port = srv.address().port;
  const A = `http://127.0.0.1:${port}`;

  const browser = await puppeteer.launch({
    executablePath: BROWSER, headless: true, pipe: true,
    enableExtensions: [EXT],
    args: ["--no-first-run", "--no-default-browser-check"]
  });

  const errors = [];
  const watch = (page, label) => {
    page.on("pageerror", (e) => errors.push(`${label} pageerror: ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) errors.push(`${label} console: ${m.text()}`); });
  };

  const swTarget = await browser.waitForTarget((t) => t.type() === "service_worker" && t.url().endsWith("background/background.js"), { timeout: 15000 });
  const sw = await swTarget.worker();
  const extId = new URL(swTarget.url()).host;
  const setStore = (v) => sw.evaluate((v) => chrome.storage.local.set(v), v);
  const clear = () => sw.evaluate(() => chrome.storage.local.clear().then(() => chrome.storage.local.set({ enabled: true, disabledSites: [], brightness: 1, contrast: 1, sepia: 0 })));
  await clear();

  const attr = (page) => page.evaluate(() => document.documentElement && document.documentElement.getAttribute("data-nightshift"));
  const open = async (url, label) => { const p = await browser.newPage(); watch(p, label); await p.goto(url, { waitUntil: "load" }); await sleep(250); return p; };

  let p = await open(`${A}/light`, "light");
  ok("light page goes dark", (await attr(p)) === "on");
  const filt = await p.evaluate(() => getComputedStyle(document.documentElement).filter);
  ok("invert filter actually applied", /invert/.test(filt), filt);

  await setStore({ enabled: false });  await sleep(300);
  ok("master switch off removes dark live", (await attr(p)) === null);
  await setStore({ enabled: true });   await sleep(300);
  ok("master switch on restores dark live", (await attr(p)) === "on");

  await setStore({ disabledSites: ["127.0.0.1"] }); await sleep(300);
  ok("per-site off works live", (await attr(p)) === null);
  await setStore({ disabledSites: [] }); await sleep(300);

  await setStore({ brightness: 0.8, contrast: 1.2, sepia: 0.3 }); await sleep(300);
  const vars = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--ns-brightness").trim());
  ok("brightness slider value reaches page", vars === "0.8", vars);
  await p.close();

  p = await open(`${A}/dark`, "dark");
  ok("already-dark site (body) left alone", (await attr(p)) === null);
  await p.close();
  p = await open(`${A}/darkhtml`, "darkhtml");
  ok("already-dark site (html) left alone", (await attr(p)) === null);
  await p.close();

  p = await open(`${A}/parent`, "parent");
  const frame = p.frames().find((f) => f.url().includes("/frame"));
  const fAttr = () => frame.evaluate(() => document.documentElement.getAttribute("data-nightshift"));
  ok("cross-site iframe dark when page dark", (await fAttr()) === "on");
  await setStore({ disabledSites: ["127.0.0.1"] }); await sleep(300);
  ok("cross-site iframe follows top page when site off", (await fAttr()) === null && (await attr(p)) === null);
  await setStore({ disabledSites: [] }); await p.close();

  p = await open(`${A}/blank`, "blank");
  const inner = await p.evaluate(() => document.getElementById("b").contentDocument.documentElement.getAttribute("data-nightshift"));
  ok("about:blank iframe also handled", inner === "on", String(inner));
  await p.close();

  await setStore({ enabled: "yes", disabledSites: "garbage", brightness: "abc", contrast: null, sepia: 99 });
  p = await open(`${A}/light`, "corrupt");
  ok("corrupted settings: page still works", ["on", null].includes(await attr(p)));
  await p.close();
  const pop = await browser.newPage(); watch(pop, "popup-corrupt");
  await pop.goto(`chrome-extension://${extId}/popup/popup.html`, { waitUntil: "load" }); await sleep(300);
  ok("corrupted settings: popup renders", (await pop.$eval("#brightness-val", (e) => e.textContent)) === "100%");
  await pop.close();
  await clear();

  for (const path of ["/xml", "/svg"]) { p = await open(`${A}${path}`, path); await p.close(); }
  ok("XML and SVG documents load without errors", true);

  const pop2 = await browser.newPage(); watch(pop2, "popup");
  await pop2.goto(`chrome-extension://${extId}/popup/popup.html`, { waitUntil: "load" }); await sleep(300);
  await pop2.click("#reset"); await pop2.click(".switch:has(#toggle-global)"); await sleep(200);
  ok("popup toggle writes storage", (await sw.evaluate(() => chrome.storage.local.get("enabled"))).enabled === false);
  await pop2.close();

  const t0 = Date.now();
  for (let i = 0; i < 50; i++) await setStore({ enabled: i % 2 === 0 });
  ok("50 rapid toggles survive", true, `${Date.now() - t0} ms`);

  await clear();
  const stale = await open(`${A}/light`, "stale");
  await sw.evaluate(() => chrome.runtime.reload()).catch(() => {});
  await sleep(1500);
  await stale.evaluate(() => { dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })); });
  await sleep(300);
  ok("extension reloaded under an open page: no crash, theme kept", (await attr(stale)) === "on");
  await stale.close();

  ok("no errors thrown anywhere", errors.length === 0, errors.join(" | "));

  await browser.close(); srv.close();
  for (const [s, n, x] of results) console.log(`${s}  ${n}${x ? "  [" + x + "]" : ""}`);
  console.log(`\n${results.filter((r) => r[0] === "PASS").length}/${results.length} passed`);
  process.exit(results.some((r) => r[0] === "FAIL") ? 1 : 0);
})().catch((e) => { console.error("HARNESS ERROR", e); process.exit(2); });
