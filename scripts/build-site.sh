#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="$(python3 -c "import json;print(json.load(open('manifest.json'))['version'])")"
SITE="build/site"

rm -rf "$SITE"
mkdir -p "$SITE/downloads"

cp website/index.html website/style.css website/app.js "$SITE/"
cp icons/icon-128.png "$SITE/"

bash scripts/package.sh >/dev/null
cp "dist/nightshift-${VERSION}.zip" "$SITE/downloads/"

printf '{"version":"%s"}\n' "$VERSION" > "$SITE/version.json"

echo "Built site at $SITE (version $VERSION)"
