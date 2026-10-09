#!/usr/bin/env bash
# Assemble the public website into build/site:
#   - static pages from website/
#   - the app icon
#   - the packaged extension under downloads/
#   - version.json so the page can link the right download
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="$(python3 -c "import json;print(json.load(open('manifest.json'))['version'])")"
SITE="build/site"

rm -rf "$SITE"
mkdir -p "$SITE/downloads"

cp website/index.html website/style.css website/app.js "$SITE/"
cp icons/icon-128.png "$SITE/"

# Ensure the package exists, then publish it.
bash scripts/package.sh >/dev/null
cp "dist/nightshift-${VERSION}.zip" "$SITE/downloads/"

printf '{"version":"%s"}\n' "$VERSION" > "$SITE/version.json"

echo "Built site at $SITE (version $VERSION)"
