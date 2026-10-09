# Contributing to NightShift

Thanks for your interest! NightShift is a small, dependency-free browser
extension plus a static landing site.

## Local development

Load the extension unpacked:

1. `chrome://extensions` → enable **Developer mode**.
2. **Load unpacked** → select this repository folder.
3. After changing files, hit **Reload** on the extension card.

## Common tasks

| Command | What it does |
| --- | --- |
| `npm run validate` | Structural checks on the manifest and files |
| `npm test` | Run the test suite (`node --test`) |
| `npm run icons` | Regenerate PNG icons from `scripts/make_icons.py` |
| `npm run package` | Build `dist/nightshift-<version>.zip` |
| `npm run serve` | Preview the landing site locally |
| `npm run docker:up` | Build and serve the site via Docker |

## Guidelines

- Keep it dependency-free where practical — the extension ships plain JS/CSS.
- Bump the version in **both** `manifest.json` and `package.json` together; a
  test enforces they match.
- Run `npm test` before opening a pull request.
