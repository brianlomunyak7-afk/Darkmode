(() => {
  "use strict";

  const ext = globalThis.chrome;
  if (!ext || !ext.storage || !ext.storage.local) return;

  try {
    if (typeof globalThis.__nightshiftAlive === "function" && globalThis.__nightshiftAlive()) return;
  } catch (e) {}
  globalThis.__nightshiftAlive = () => {
    try { return !!(ext.runtime && ext.runtime.id); } catch (e) { return false; }
  };

  const DEFAULTS = {
    enabled: true,
    disabledSites: [],
    brightness: 1,
    contrast: 1,
    sepia: 0
  };
  const ATTR = "data-nightshift";

  const isTop = (() => { try { return window.top === window; } catch (e) { return false; } })();

  function topHost() {
    if (isTop) { try { return location.hostname || ""; } catch (e) { return ""; } }
    try { return window.top.location.hostname || ""; } catch (e) {}
    try {
      const a = location.ancestorOrigins;
      if (a && a.length) return new URL(a[a.length - 1]).hostname || "";
    } catch (e) {}
    try { if (document.referrer) return new URL(document.referrer).hostname || ""; } catch (e) {}
    try { return location.hostname || ""; } catch (e) { return ""; }
  }

  const host = topHost();
  const CACHE_KEY = "nightshift:native-dark";

  let state = Object.assign({}, DEFAULTS);
  let nativeDark = false;
  try { nativeDark = localStorage.getItem(CACHE_KEY) === "1"; } catch (e) {}

  function alive() {
    try { return !!(ext.runtime && ext.runtime.id); } catch (e) { return false; }
  }

  function clamp(n, lo, hi, dflt) {
    n = Number(n);
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
  }

  function sites(v) {
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  }

  function wanted(s) {
    if (!s.enabled || nativeDark) return false;
    return !(host && sites(s.disabledSites).includes(host));
  }

  function apply(s) {
    const root = document.documentElement;
    if (!root) return false;
    try {
      if (root.style && typeof root.style.setProperty === "function") {
        root.style.setProperty("--ns-brightness", clamp(s.brightness, 0.5, 1.5, 1));
        root.style.setProperty("--ns-contrast", clamp(s.contrast, 0.5, 1.5, 1));
        root.style.setProperty("--ns-sepia", clamp(s.sepia, 0, 1, 0));
      }
      if (wanted(s)) root.setAttribute(ATTR, "on");
      else root.removeAttribute(ATTR);
    } catch (e) {}
    return true;
  }

  function render() {
    if (!apply(state)) {
      document.addEventListener("DOMContentLoaded", () => apply(state), { once: true });
    }
  }

  let probe = null;
  const colorCache = new Map();

  function canvasRgba(str) {
    if (!probe) {
      const c = typeof OffscreenCanvas === "function" ? new OffscreenCanvas(1, 1) : document.createElement("canvas");
      probe = c.getContext("2d", { willReadFrequently: true });
    }
    if (!probe) return null;
    probe.fillStyle = "#010203";
    probe.fillStyle = str;
    if (probe.fillStyle === "#010203" && !/^#010203$/i.test(str)) return null;
    probe.clearRect(0, 0, 1, 1);
    probe.fillRect(0, 0, 1, 1);
    const d = probe.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  }

  function parseColor(str) {
    if (!str || str === "transparent") return null;
    if (colorCache.has(str)) return colorCache.get(str);
    let rgba = null;
    const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/.exec(str);
    if (m) {
      let a = m[4] === undefined ? 1 : parseFloat(m[4]);
      if (m[4] && m[4].endsWith("%")) a /= 100;
      rgba = [Number(m[1]), Number(m[2]), Number(m[3]), a];
    } else {
      try { rgba = canvasRgba(str); } catch (e) { rgba = null; }
    }
    let res = null;
    if (rgba) {
      const [r, g, b] = rgba.slice(0, 3).map((x) => x / 255);
      res = { lum: 0.2126 * r + 0.7152 * g + 0.0722 * b, a: rgba[3] };
    }
    if (colorCache.size > 256) colorCache.clear();
    colorCache.set(str, res);
    return res;
  }

  const MEDIA = new Set(["IMG", "VIDEO", "CANVAS", "PICTURE", "SVG", "IFRAME", "EMBED", "OBJECT"]);
  const PLAYER = "data-nightshift-player";

  let rootInfo = { bg: "", scheme: "" };

  function readRootInfo() {
    const root = document.documentElement;
    const had = root.getAttribute(ATTR) === "on";
    try {
      if (had) root.removeAttribute(ATTR);
      const cs = getComputedStyle(root);
      rootInfo = { bg: cs.backgroundColor, scheme: cs.colorScheme };
    } catch (e) {
    } finally {
      if (had) root.setAttribute(ATTR, "on");
    }
  }

  function bgOf(n) {
    return parseColor(n === document.documentElement ? rootInfo.bg : getComputedStyle(n).backgroundColor);
  }

  function paintedBg(el, area) {
    if (MEDIA.has(String(el.tagName).toUpperCase())) return undefined;
    const body = document.body;
    const root = document.documentElement;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const c = bgOf(n);
      if (!c || c.a < 0.5) continue;
      if (n === body || n === root) return c;
      const r = n.getBoundingClientRect();
      const size = r.width * r.height;
      if (size < 0.03 * area) continue;
      if ((n.hasAttribute(PLAYER) || n.getElementsByTagName("video").length) && size < 0.75 * area) return undefined;
      return c;
    }
    if (body && el === root) {
      const c = parseColor(getComputedStyle(body).backgroundColor);
      if (c && c.a >= 0.5) return c;
    }
    return null;
  }

  function hasOwnText(el) {
    for (const n of el.childNodes) {
      if (n.nodeType === 3 && n.data.trim()) return true;
    }
    return false;
  }

  function looksDark() {
    const root = document.documentElement;
    let dark = 0;
    let light = 0;
    let textDark = 0;
    let textLight = 0;
    const w = innerWidth;
    const h = innerHeight;
    if (w > 0 && h > 0 && typeof document.elementFromPoint === "function") {
      for (const fy of [0.15, 0.5, 0.85]) {
        for (const fx of [0.15, 0.5, 0.85]) {
          const el = document.elementFromPoint(w * fx, h * fy);
          if (!el) continue;
          const c = paintedBg(el, w * h);
          if (c) { if (c.lum < 0.25) dark++; else light++; }
          if (hasOwnText(el)) {
            const t = parseColor(getComputedStyle(el).color);
            if (t && t.a >= 0.5) { if (t.lum > 0.6) textDark++; else if (t.lum < 0.35) textLight++; }
          }
        }
      }
    }
    if (dark + light >= 2) return dark > light;
    if (dark + light + textDark + textLight > 0) return dark + textDark > light + textLight;
    for (const node of [document.body, root]) {
      if (!node) continue;
      const c = bgOf(node);
      if (c && c.a >= 0.5) return c.lum < 0.25;
    }
    return rootInfo.scheme === "dark";
  }

  function markPlayers() {
    const vids = document.getElementsByTagName("video");
    const limit = Math.min(vids.length, 20);
    for (let i = 0; i < limit; i++) {
      let n = vids[i].parentElement;
      for (let depth = 0; n && n !== document.body && depth < 6; depth++, n = n.parentElement) {
        if (n.hasAttribute(PLAYER)) break;
        const c = parseColor(getComputedStyle(n).backgroundColor);
        if (c && c.a >= 0.5 && c.lum < 0.15) { n.setAttribute(PLAYER, ""); break; }
      }
    }
  }

  function detectNativeDark(full) {
    if (!document.documentElement || !document.body) return;
    if (full !== false) readRootInfo();
    let dark = false;
    try {
      markPlayers();
      dark = looksDark();
    } catch (e) {
      dark = false;
    }
    if (dark !== nativeDark) {
      nativeDark = dark;
      try { localStorage.setItem(CACHE_KEY, dark ? "1" : "0"); } catch (e) {}
      render();
    }
  }

  let pending = 0;
  function scheduleDetect(delay) {
    clearTimeout(pending);
    pending = setTimeout(detectNativeDark, delay);
  }

  let quietTimer = 0;
  let firstChange = 0;
  function onDomChange() {
    const now = Date.now();
    if (!firstChange) firstChange = now;
    clearTimeout(quietTimer);
    const wait = now - firstChange > 3000 ? 0 : 800;
    quietTimer = setTimeout(() => { firstChange = 0; detectNativeDark(false); }, wait);
  }

  function watchThemeSwitches() {
    if (typeof MutationObserver !== "function") return;
    try {
      const obs = new MutationObserver(() => scheduleDetect(250));
      const opts = { attributes: true, attributeFilter: ["class", "data-theme", "data-color-mode", "data-bs-theme", "theme"] };
      obs.observe(document.documentElement, opts);
      if (document.body) obs.observe(document.body, opts);
      new MutationObserver(onDomChange).observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {}
  }

  function refresh() {
    if (!alive()) return;
    try {
      ext.storage.local.get(DEFAULTS, (stored) => {
        if (ext.runtime && ext.runtime.lastError) return;
        state = Object.assign({}, DEFAULTS, stored || {});
        render();
      });
    } catch (e) {}
  }

  refresh();

  try {
    ext.storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || !changes) return;
      let touched = false;
      for (const key in changes) {
        if (!(key in DEFAULTS)) continue;
        const v = changes[key].newValue;
        state[key] = v === undefined ? DEFAULTS[key] : v;
        touched = true;
      }
      if (touched) render();
    });
  } catch (e) {}

  function onReady() {
    detectNativeDark();
    watchThemeSwitches();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady, { once: true });
  } else {
    onReady();
  }
  try {
    addEventListener("load", () => {
      detectNativeDark();
      setTimeout(detectNativeDark, 1500);
      setTimeout(detectNativeDark, 4000);
    }, { once: true });
  } catch (e) {}

  try {
    addEventListener("pageshow", (e) => { if (e.persisted) refresh(); });
  } catch (e) {}
})();
