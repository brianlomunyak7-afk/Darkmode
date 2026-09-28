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

  function parseColor(str) {
    const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?/.exec(str || "");
    if (!m) return null;
    let a = m[4] === undefined ? 1 : parseFloat(m[4]);
    if (m[4] && m[4].endsWith("%")) a /= 100;
    const [r, g, b] = [m[1], m[2], m[3]].map((x) => Number(x) / 255);
    return { lum: 0.2126 * r + 0.7152 * g + 0.0722 * b, a };
  }

  function detectNativeDark() {
    const root = document.documentElement;
    if (!root || !document.body) return;
    const had = root.getAttribute(ATTR) === "on";
    let dark = false;
    try {
      if (had) root.removeAttribute(ATTR);
      for (const node of [document.body, root]) {
        const c = parseColor(getComputedStyle(node).backgroundColor);
        if (c && c.a >= 0.5) { dark = c.lum < 0.25; break; }
      }
    } catch (e) {
      dark = false;
    } finally {
      if (had) root.setAttribute(ATTR, "on");
    }
    if (dark !== nativeDark) {
      nativeDark = dark;
      try { localStorage.setItem(CACHE_KEY, dark ? "1" : "0"); } catch (e) {}
      render();
    }
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", detectNativeDark, { once: true });
  } else {
    detectNativeDark();
  }

  try { addEventListener("load", detectNativeDark, { once: true }); } catch (e) {}

  try {
    addEventListener("pageshow", (e) => { if (e.persisted) refresh(); });
  } catch (e) {}
})();
