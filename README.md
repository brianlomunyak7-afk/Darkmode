# NightShift

A free, persistent dark mode for the web. It darkens every site you visit to
reduce eye strain, remembers your choice across pages and restarts, and lets
you fine-tune the look or turn it off per site.

## Features

- **One master switch** — dark mode on or off for all sites.
- **Per-site control** — keep a site light (or dark) independently.
- **Tuning** — brightness, contrast, and warmth (sepia) sliders.
- **Persistent** — settings are saved and survive browser restarts.
- **Keyboard shortcuts**
  - `Alt+Shift+D` — toggle dark mode for all sites
  - `Alt+Shift+S` — toggle dark mode for the current site
- **Smart color handling** — inverts page colors while keeping photos and
  videos looking normal.

## How it works

The content script runs on every page at load and adds a class to the page
when dark mode should be on. The CSS then inverts the page's colors (and
rotates the hue so blues stay blue), while re-inverting images and video so
media still looks right. Your preferences live in the browser's local
storage, so the extension needs no account and no network access.

## Install (load unpacked)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked** and select this folder (`DarkMode`).
4. Pin NightShift and click its icon to open the controls.

Works in Chrome, Edge, Brave, and other Chromium browsers.

## Project layout

- `manifest.json` — extension configuration (Manifest V3).
- `background/background.js` — sets defaults, handles keyboard shortcuts.
- `content/darkmode.css` — the dark-mode styling engine.
- `content/darkmode.js` — applies settings to each page, updates live.
- `popup/` — the toolbar popup UI (HTML, CSS, controller).

## Notes

- Browser internal pages (`chrome://`, the extensions gallery, etc.) cannot be
  styled by any extension, so dark mode will not apply there.
- A site that is already dark may look odd when inverted; use the **This site**
  toggle to keep it as-is.
