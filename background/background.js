/*
 * NightShift background service worker (MV3).
 * - Seeds default settings on install.
 * - Handles keyboard shortcuts for global + per-site toggles.
 */

const DEFAULTS = {
  enabled: true,
  disabledSites: [],
  brightness: 1,
  contrast: 1,
  sepia: 0
};

// Seed defaults without clobbering anything the user already set.
chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(DEFAULTS);
  await chrome.storage.local.set(Object.assign({}, DEFAULTS, current));
});

function hostOf(url) {
  try {
    return new URL(url).hostname || "";
  } catch (e) {
    return "";
  }
}

chrome.commands.onCommand.addListener(async (command) => {
  const state = await chrome.storage.local.get(DEFAULTS);

  if (command === "toggle-global") {
    await chrome.storage.local.set({ enabled: !state.enabled });
    return;
  }

  if (command === "toggle-site") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;
    const host = hostOf(tab.url);
    if (!host) return;

    const disabled = new Set(state.disabledSites || []);
    if (disabled.has(host)) {
      disabled.delete(host);
    } else {
      disabled.add(host);
    }
    await chrome.storage.local.set({ disabledSites: Array.from(disabled) });
  }
});
