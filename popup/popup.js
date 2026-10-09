/*
 * NightShift popup controller.
 * Reflects saved settings in the UI and writes changes back to storage.
 * The content script listens for those changes and updates pages live.
 */

const DEFAULTS = {
  enabled: true,
  disabledSites: [],
  brightness: 1,
  contrast: 1,
  sepia: 0
};

const el = {
  global: document.getElementById("toggle-global"),
  site: document.getElementById("toggle-site"),
  siteHost: document.getElementById("site-host"),
  brightness: document.getElementById("brightness"),
  contrast: document.getElementById("contrast"),
  sepia: document.getElementById("sepia"),
  brightnessVal: document.getElementById("brightness-val"),
  contrastVal: document.getElementById("contrast-val"),
  sepiaVal: document.getElementById("sepia-val"),
  reset: document.getElementById("reset")
};

let currentHost = "";

function hostOf(url) {
  try {
    const u = new URL(url);
    // Only http/https pages can be styled; others have no usable host.
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return u.hostname || "";
  } catch (e) {
    return "";
  }
}

function pct(n) { return Math.round(Number(n) * 100) + "%"; }

async function getState() {
  return chrome.storage.local.get(DEFAULTS);
}

async function activeTabHost() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab && tab.url ? hostOf(tab.url) : "";
}

function render(state) {
  // Master switch
  el.global.checked = !!state.enabled;

  // Per-site switch
  const siteSupported = !!currentHost;
  const siteOff = state.disabledSites.includes(currentHost);
  el.site.checked = siteSupported && !siteOff;
  el.site.disabled = !siteSupported || !state.enabled;
  el.siteHost.textContent = siteSupported ? currentHost : "unavailable here";

  // Sliders
  el.brightness.value = state.brightness;
  el.contrast.value = state.contrast;
  el.sepia.value = state.sepia;
  el.brightnessVal.textContent = pct(state.brightness);
  el.contrastVal.textContent = pct(state.contrast);
  el.sepiaVal.textContent = pct(state.sepia);
}

async function init() {
  currentHost = await activeTabHost();
  const state = await getState();
  render(state);
}

// --- Event wiring ---

el.global.addEventListener("change", async () => {
  await chrome.storage.local.set({ enabled: el.global.checked });
  render(await getState());
});

el.site.addEventListener("change", async () => {
  if (!currentHost) return;
  const state = await getState();
  const set = new Set(state.disabledSites);
  if (el.site.checked) {
    set.delete(currentHost); // dark on
  } else {
    set.add(currentHost);    // dark off for this site
  }
  await chrome.storage.local.set({ disabledSites: Array.from(set) });
});

function bindSlider(input, output, key) {
  input.addEventListener("input", () => {
    output.textContent = pct(input.value);
  });
  input.addEventListener("change", async () => {
    await chrome.storage.local.set({ [key]: Number(input.value) });
  });
}

bindSlider(el.brightness, el.brightnessVal, "brightness");
bindSlider(el.contrast, el.contrastVal, "contrast");
bindSlider(el.sepia, el.sepiaVal, "sepia");

el.reset.addEventListener("click", async () => {
  await chrome.storage.local.set({ brightness: 1, contrast: 1, sepia: 0 });
  render(await getState());
});

init();
