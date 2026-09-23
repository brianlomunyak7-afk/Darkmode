function enableDarkMode() {
  document.documentElement.classList.add("nightshift-dark");
}

function disableDarkMode() {
  document.documentElement.classList.remove("nightshift-dark");
}

chrome.storage.local.get(["enabled"], (result) => {
  if (result.enabled) {
    enableDarkMode();
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "enable") {
    enableDarkMode();
  }

  if (message.action === "disable") {
    disableDarkMode();
  }
});