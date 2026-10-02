const DEFAULTS = {
  enabled: true,
  disabledSites: [],
  brightness: 1,
  contrast: 1,
  sepia: 0
};

function clamp(n, lo, hi, dflt) {
  n = Number(n);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
}

function sanitize(s) {
  s = s || {};
  const sites = Array.isArray(s.disabledSites)
    ? [...new Set(s.disabledSites.filter((x) => typeof x === "string" && x))]
    : [];
  return {
    enabled: typeof s.enabled === "boolean" ? s.enabled : DEFAULTS.enabled,
    disabledSites: sites,
    brightness: clamp(s.brightness, 0.5, 1.5, 1),
    contrast: clamp(s.contrast, 0.5, 1.5, 1),
    sepia: clamp(s.sepia, 0, 1, 0)
  };
}

function hostOf(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return u.hostname || "";
  } catch (e) {
    return "";
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  try {
    const current = await chrome.storage.local.get(DEFAULTS);
    await chrome.storage.local.set(sanitize(current));
  } catch (e) {
    console.warn("NightShift: could not seed settings", e);
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  try {
    const state = sanitize(await chrome.storage.local.get(DEFAULTS));

    if (command === "toggle-global") {
      await chrome.storage.local.set({ enabled: !state.enabled });
      return;
    }

    if (command === "toggle-site") {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const host = tabs && tabs[0] && tabs[0].url ? hostOf(tabs[0].url) : "";
      if (!host) return;
      const sites = new Set(state.disabledSites);
      if (sites.has(host)) sites.delete(host);
      else sites.add(host);
      await chrome.storage.local.set({ disabledSites: [...sites] });
    }
  } catch (e) {
    console.warn("NightShift: shortcut failed", e);
  }
});
