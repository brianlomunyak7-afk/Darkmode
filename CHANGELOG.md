# Changelog

All notable changes to NightShift are documented here.
This project adheres to [Semantic Versioning](https://semver.org/).

## [0.5.0] - Works on more sites

### Fixed
- Discord and other dark apps were flipped to bright. Detection now samples
  what is painted on screen instead of only the page root and body.
- Modern CSS color formats (oklab, oklch and others) were not understood,
  which hid dark backgrounds on many current sites.
- YouTube video pages stayed light because the big black player looked like a
  dark page. Media and players are now ignored when judging the page.
- Video players turned white around the video. They now keep their real black.
- Fullscreen video showed washed-out colors.

### Added
- Rechecks for apps that render late, and for sites that switch their own theme.
- Tests for these cases, plus a check that busy pages are never restyled by
  background checks.

## [0.4.1] - Clean Chrome load

### Fixed
- Chrome no longer shows the "background.scripts requires manifest version 2"
  warning. The Firefox-only key now lives in a separate Firefox build.
- Tabs that were open before install or update are themed right away, without
  a refresh.

### Added
- `npm run firefox` builds `dist/firefox/` and a Firefox zip.
- Guard so the content script never runs twice in the same page.

## [0.4.0] - Crash-proofing

### Added
- Already-dark sites are detected and left alone instead of being inverted.
- Embedded frames follow the top page's per-site setting.
- Blank and sandboxed frames are covered (`match_about_blank`).
- Printing always uses the original colors.
- Real-browser end-to-end test (`npm run test:e2e`), 18 checks.

### Changed
- Every browser call in the content script, background, and popup is guarded,
  so a stale extension context, missing page root, or non-HTML document can't
  throw.
- Stored settings are validated and repaired on install, in the popup, and in
  shortcuts.
- Dark mode uses a `data-nightshift` attribute instead of a class, because many
  sites overwrite the root element's classes.
- Live updates apply only the changed values instead of re-reading storage.

## [0.3.0] - Lightweight and cross-browser

### Added
- Firefox support (121+): background scripts fallback and add-on id.
- Firefox slider styling in the popup.
- Tests that keep permissions minimal and the manifest cross-browser.

### Changed
- Dropped the unused `scripting` and `tabs` permissions.
- Content script now ignores storage changes unrelated to NightShift.

## [0.2.0] - Full product

### Added
- Color-inversion dark-mode engine that works across arbitrary sites while
  keeping images and video looking normal.
- Popup UI with master toggle, per-site toggle, and brightness/contrast/warmth
  sliders.
- Background service worker with keyboard shortcuts (`Alt+Shift+D`,
  `Alt+Shift+S`).
- Real moon icons at 16/32/48/128 px, generated from `scripts/make_icons.py`.
- Landing website and Docker (nginx) deployment to serve it and host the
  packaged download.
- Packaging script, structural test suite, and GitHub Actions CI.

### Changed
- Moved the dark-mode CSS/JS out of `popup/` into `content/`, where the
  manifest expects them.

## [0.1.0] - Initial sketch
- First skeleton: manifest and an empty popup.
