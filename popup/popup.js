const DEFAULTS = {
  enabled: true,
  disabledSites: [],
  brightness: 1,
  contrast: 1,
  sepia: 0
};

const $ = (id) => document.getElementById(id);
const el = {
  global: $("toggle-global"),
  site: $("toggle-site"),
  siteHost: $("site-host"),
  brightness: $("brightness"),
  contrast: $("contrast"),
  sepia: $("sepia"),
  brightnessVal: $("brightness-val"),
  contrastVal: $("contrast-val"),
  sepiaVal: $("sepia-val"),
  reset: $("reset")
};

let currentHost = "";

function clamp(n, lo, hi, dflt) {
  n = Number(n);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
}

function sanitize(s) {
  s = s || {};
  return {
    enabled: typeof s.enabled === "boolean" ? s.enabled : true,
    disabledSites: Array.isArray(s.disabledSites)
      ? s.disabledSites.filter((x) => typeof x === "string")
      : [],
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

const pct = (n) => Math.round(Number(n) * 100) + "%";

async function getState() {
  try {
    return sanitize(await chrome.storage.local.get(DEFAULTS));
  } catch (e) {
    return sanitize(null);
  }
}

async function save(patch) {
  try {
    await chrome.storage.local.set(patch);
  } catch (e) {
    console.warn("NightShift: could not save", e);
  }
}

async function activeTabHost() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs && tabs[0] && tabs[0].url ? hostOf(tabs[0].url) : "";
  } catch (e) {
    return "";
  }
}

function render(state) {
  el.global.checked = state.enabled;

  const supported = !!currentHost;
  el.site.checked = supported && !state.disabledSites.includes(currentHost);
  el.site.disabled = !supported || !state.enabled;
  el.siteHost.textContent = supported ? currentHost : "unavailable here";

  for (const key of ["brightness", "contrast", "sepia"]) {
    el[key].value = state[key];
    el[key + "Val"].textContent = pct(state[key]);
  }
}

el.global.addEventListener("change", async () => {
  await save({ enabled: el.global.checked });
  render(await getState());
});

el.site.addEventListener("change", async () => {
  if (!currentHost) return;
  const state = await getState();
  const sites = new Set(state.disabledSites);
  if (el.site.checked) sites.delete(currentHost);
  else sites.add(currentHost);
  await save({ disabledSites: [...sites] });
});

for (const key of ["brightness", "contrast", "sepia"]) {
  const input = el[key];
  const output = el[key + "Val"];
  input.addEventListener("input", () => { output.textContent = pct(input.value); });
  input.addEventListener("change", () => save({ [key]: Number(input.value) }));
}

el.reset.addEventListener("click", async () => {
  await save({ brightness: 1, contrast: 1, sepia: 0 });
  render(await getState());
});

(async () => {
  currentHost = await activeTabHost();
  render(await getState());
})();
