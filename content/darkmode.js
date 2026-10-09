/*
 * NightShift content script.
 * Runs at document_start in every frame. Reads saved settings and
 * toggles the dark-mode class / CSS variables on <html>. Updates live
 * when settings change, so the popup reflects instantly.
 */

(() => {
  "use strict";

  const DEFAULTS = {
    enabled: true,       // master switch
    disabledSites: [],   // hostnames explicitly excluded
    brightness: 1,       // 0.5 - 1.5
    contrast: 1,         // 0.5 - 1.5
    sepia: 0             // 0 - 1 (warmth, easier on the eyes)
  };

  // Derive this frame's hostname. Fall back gracefully for about:blank etc.
  let host = "";
  try {
    host = location.hostname || "";
  } catch (e) {
    host = "";
  }

  const root = document.documentElement;

  function shouldApply(s) {
    if (!s.enabled) return false;
    if (host && Array.isArray(s.disabledSites) && s.disabledSites.includes(host)) {
      return false;
    }
    return true;
  }

  function clamp(n, lo, hi, dflt) {
    n = Number(n);
    if (!isFinite(n)) return dflt;
    return Math.min(hi, Math.max(lo, n));
  }

  function apply(settings) {
    const s = Object.assign({}, DEFAULTS, settings || {});

    // Push tuning values as CSS variables regardless, so they're ready.
    root.style.setProperty("--ns-brightness", clamp(s.brightness, 0.5, 1.5, 1));
    root.style.setProperty("--ns-contrast", clamp(s.contrast, 0.5, 1.5, 1));
    root.style.setProperty("--ns-sepia", clamp(s.sepia, 0, 1, 0));

    if (shouldApply(s)) {
      root.classList.add("nightshift-on");
    } else {
      root.classList.remove("nightshift-on");
    }
  }

  // Initial read. storage.local is async; applied as soon as it resolves.
  try {
    chrome.storage.local.get(DEFAULTS, apply);
  } catch (e) {
    // Extension context not available (rare); nothing to do.
  }

  // Live updates while the page is open.
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      chrome.storage.local.get(DEFAULTS, apply);
    });
  } catch (e) {
    /* ignore */
  }
})();
