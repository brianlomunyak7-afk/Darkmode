# Changelog

All notable changes to NightShift are documented here.
This project adheres to [Semantic Versioning](https://semver.org/).

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
