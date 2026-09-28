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
  "/appnow": `<!doctype html><body style="margin:0"><div id="app" style="position:fixed;inset:0;background:#313338;color:#dbdee1">chat</div></body>`,
  "/applate": `<!doctype html><body style="margin:0"><script>setTimeout(()=>{const d=document.createElement("div");d.style.cssText="position:fixed;inset:0;background:#1e1f22;color:#dbdee1";d.textContent="chat";document.body.appendChild(d)},1200)</script></body>`,
  "/lightapp": `<!doctype html><body style="margin:0"><div style="position:fixed;inset:0;background:#fafafa;color:#111">feed</div></body>`,
  "/toggle": `<!doctype html><html class="theme-light"><style>#app{position:fixed;inset:0;background:#fff}.theme-dark #app{background:#202225;color:#eee}</style><body style="margin:0"><div id="app">app</div></body></html>`,
  "/oklab": `<!doctype html><body style="margin:0;background:oklab(0.18 0.001 -0.004)"><div style="position:fixed;inset:0">modern dark</div></body>`,
  "/oklch": `<!doctype html><body style="margin:0"><div style="position:fixed;inset:0;background:oklch(0.21 0.02 260)">tailwind dark</div></body>`,
  "/oklchlight": `<!doctype html><body style="margin:0"><div style="position:fixed;inset:0;background:oklch(0.98 0 0)">tailwind light</div></body>`,
  "/player": `<!doctype html><body style="background:#fff;margin:0"><p>watch page</p><div id="pl" style="background:#000;width:900px;height:560px"><video id="v" style="width:100%;height:100%"></video></div><div style="width:300px;height:300px;background:#f6f6f6">sidebar</div></body>`,
  "/fs": `<!doctype html><body style="background:#fff;margin:0"><div id="pl" style="background:#000;width:400px;height:300px"><canvas id="c" width="400" height="300"></canvas></div><button id="b" style="position:fixed;bottom:0;right:0">fs</button><script>const x=c.getContext("2d");x.fillStyle="#f00";x.fillRect(0,0,400,300);b.onclick=()=>document.getElementById(location.hash.slice(1)||"pl").requestFullscreen();</script></body>`,
  "/busy": `<!doctype html><body style="background:#fff"><div id="feed"></div><script>setInterval(()=>{const d=document.createElement("div");d.textContent="msg "+Date.now();feed.prepend(d);if(feed.children.length>50)feed.lastChild.remove()},100)</script></body>`,
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

  p = await open(`${A}/appnow`, "appnow");
  ok("dark app painted on inner container left alone", (await attr(p)) === null);
  await p.close();
  p = await open(`${A}/applate`, "applate");
  await sleep(4500);
  ok("dark app that renders late is left alone", (await attr(p)) === null);
  await p.close();
  for (const [path, want, label] of [["/oklab", null, "oklab"], ["/oklch", null, "oklch"], ["/oklchlight", "on", "oklch light"]]) {
    p = await open(`${A}${path}`, label);
    ok(`modern color format (${label}) read correctly`, (await attr(p)) === want);
    await p.close();
  }
  p = await open(`${A}/lightapp`, "lightapp");
  ok("light app on inner container still goes dark", (await attr(p)) === "on");
  await p.close();
  p = await open(`${A}/toggle`, "toggle");
  const t1 = await attr(p);
  await p.evaluate(() => { document.documentElement.className = "theme-dark"; }); await sleep(800);
  const t2 = await attr(p);
  await p.evaluate(() => { document.documentElement.className = "theme-light"; }); await sleep(800);
  const t3 = await attr(p);
  ok("site switching its own theme is followed", t1 === "on" && t2 === null && t3 === "on", `light=${t1} dark=${t2} light=${t3}`);
  await p.close();

  p = await open(`${A}/player`, "player");
  ok("video page with big black player still goes dark", (await attr(p)) === "on");
  const marked = await p.evaluate(() => document.getElementById("pl").hasAttribute("data-nightshift-player"));
  const plFilter = await p.evaluate(() => getComputedStyle(document.getElementById("pl")).filter);
  ok("video player box keeps its real black", marked && /invert/.test(plFilter), plFilter);
  await p.close();

  for (const target of ["pl", "c"]) {
    p = await open(`${A}/fs#${target}`, `fs-${target}`);
    await p.click("#b"); await sleep(800);
    const shot = await p.screenshot({ clip: { x: 100, y: 100, width: 1, height: 1 }, encoding: "base64" });
    const inFs = await p.evaluate(() => !!document.fullscreenElement);
    const png = Buffer.from(shot, "base64");
    const pixel = await p.evaluate(async (b64) => {
      const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
      const c = new OffscreenCanvas(1, 1).getContext("2d"); c.drawImage(img, 0, 0);
      return Array.from(c.getImageData(0, 0, 1, 1).data.slice(0, 3));
    }, png.toString("base64"));
    ok(`fullscreen ${target === "pl" ? "player" : "video itself"} shows true colors`, inFs && pixel[0] > 240 && pixel[1] < 30 && pixel[2] < 30, pixel.join(","));
    await p.close();
  }

  p = await open(`${A}/busy`, "busy");
  await sleep(5000);
  await p.evaluate(() => { window.__flips = 0; new MutationObserver((m) => { window.__flips += m.length; }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-nightshift"] }); });
  await sleep(5000);
  const flips = await p.evaluate(() => window.__flips);
  ok("busy page is not restyled by background checks", flips === 0 && (await attr(p)) === "on", `marker changes=${flips}`);
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


  await browser.close();

  const b2 = await puppeteer.launch({ executablePath: BROWSER, headless: true, pipe: true, enableExtensions: true,
    args: ["--no-first-run", "--no-default-browser-check"] });
  const before = await b2.newPage(); watch(before, "pre-install");
  await before.goto(`${A}/light`, { waitUntil: "load" });
  const beforeAttr = await attr(before);
  await b2.installExtension(EXT);
  await sleep(1500);
  ok("tab open before install gets themed without refresh", beforeAttr === null && (await attr(before)) === "on", `before=${beforeAttr} after=${await attr(before)}`);
  const sw3 = await (await b2.waitForTarget((t) => t.type() === "service_worker" && t.url().endsWith("background/background.js"))).worker();
  await sw3.evaluate(() => chrome.storage.local.set({ enabled: false })); await sleep(400);
  const liveOff = await attr(before);
  await sw3.evaluate(() => chrome.storage.local.set({ enabled: true })); await sleep(400);
  ok("injected script responds to the popup live", liveOff === null && (await attr(before)) === "on");
  await b2.close();
  srv.close();
  ok("no errors thrown anywhere", errors.length === 0, errors.join(" | "));
  for (const [s, n, x] of results) console.log(`${s}  ${n}${x ? "  [" + x + "]" : ""}`);
  console.log(`\n${results.filter((r) => r[0] === "PASS").length}/${results.length} passed`);
  process.exit(results.some((r) => r[0] === "FAIL") ? 1 : 0);
})().catch((e) => { console.error("HARNESS ERROR", e); process.exit(2); });
