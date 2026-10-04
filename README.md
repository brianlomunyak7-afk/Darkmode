# NightShift 🌙

A free, persistent dark mode for the web. It darkens every site you visit to
reduce eye strain, remembers your choice across pages and restarts, and lets
you fine-tune the look or turn it off per site. No account, no tracking, no
network access.

## Features

- **One master switch** — dark mode on or off for all sites.
- **Per-site control** — keep a site light (or dark) independently.
- **Tuning** — brightness, contrast, and warmth (sepia) sliders.
- **Persistent & private** — settings are saved locally and survive restarts.
- **Keyboard shortcuts**
  - `Alt+Shift+D` — toggle dark mode for all sites
  - `Alt+Shift+S` — toggle dark mode for the current site
- **Smart color handling** — inverts page colors while keeping photos and
  videos looking normal.

## Install (use it yourself)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked** and select this folder.
4. Pin NightShift and click the moon to open the controls.

Works in Chrome, Edge, Brave, Opera, Vivaldi, and other Chromium browsers. You
can use it this way indefinitely without ever deploying anything.

### Firefox (version 121 or newer)

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on** and pick `manifest.json` in this folder.
3. If dark mode doesn't apply, open `about:addons`, choose NightShift, and
   allow **Access your data for all websites** under Permissions. Firefox
   asks for site access separately.

Temporary add-ons are removed when Firefox restarts. For a permanent install,
sign the package for free on addons.mozilla.org (it can stay unlisted).

### Safari

Safari needs a Mac with Xcode. Run
`xcrun safari-web-extension-converter /path/to/DarkMode` to wrap it as a Safari
extension.

## Lightweight by design

- One permission (`storage`) plus site access. No tracking, no network.
- No frameworks or libraries. The whole extension is about 18 KB zipped.
- Dark mode is a single CSS filter, so pages aren't rewritten element by element.
- The background script only wakes for keyboard shortcuts and install.

## How it works

A content script runs on every page at load and marks the page when dark
mode should be on. The CSS then inverts the page's colors (rotating the hue so
blues stay blue) while re-inverting images and video so media still looks
right. Preferences live in the browser's local storage, so the extension needs
no account and no network access.

It also handles the awkward cases:

- **Already-dark sites are left alone,** so they don't get flipped to bright.
- **Embedded frames follow the page they sit in,** so turning a site off turns
  off its embeds too.
- **Printing is never inverted.**
- **Bad or old saved settings are repaired** instead of breaking anything.
- **If the extension updates or reloads,** open pages keep their look and
  nothing throws.

## Project layout

```
manifest.json            Extension config (Manifest V3)
background/background.js  Defaults + keyboard shortcuts
content/darkmode.css     The dark-mode styling engine
content/darkmode.js      Applies settings per page, live updates
popup/                   Toolbar popup UI (html, css, controller)
icons/                   Generated moon icons (16/32/48/128)
website/                 Landing page (served by Docker)
docker/                  nginx config for the site
scripts/                 Icon generation, packaging, site build, local serve
tests/                   Structural test suite (node --test)
```

## Developer commands

| Command | What it does |
| --- | --- |
| `npm run validate` | Structural checks on the manifest and files |
| `npm test` | Run the structural test suite |
| `npm run test:e2e -- /usr/bin/brave-browser` | Run the real-browser test (needs `npm install` first) |
| `npm run icons` | Regenerate PNG icons |
| `npm run package` | Build `dist/nightshift-<version>.zip` for sharing/stores |
| `npm run serve` | Preview the landing site at http://localhost:8080 |
| `npm run build` | icons + validate + package in one step |

## Deploy the landing site (optional)

The site advertises NightShift and hosts the downloadable package. Deploying is
entirely optional — the extension works without it.

```bash
docker compose up -d --build     # build + serve on http://localhost:8080
docker compose down              # stop
```

The Docker build packages the extension, assembles the web root, and serves it
with nginx. The homepage, `version.json`, and the download zip are all served
statically.

## Privacy

NightShift collects nothing and makes no network requests. See
[PRIVACY.md](PRIVACY.md). Browser internal pages (`chrome://`, the extensions
gallery, etc.) cannot be styled by any extension, so dark mode will not apply
there.

## License

[MIT](LICENSE).
