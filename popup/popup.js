function enableDarkMode() {
  document.documentElement.classList.add("nightshift-dark");
}

function disableDarkMode() {
  document.documentElement.classList.remove("nightshift-dark");
}

// Check the saved global NightShift state
chrome.storage.local.get("enabled", (result) => {
  if (result.enabled === true) {
    enableDarkMode();
  }
});

// Listen for changes while the page is open
chrome.storage.onChanged.addListener((changes) => {
  if (!changes.enabled) return;

  if (changes.enabled.newValue === true) {
    enableDarkMode();
  } else {
    disableDarkMode();
  }
});