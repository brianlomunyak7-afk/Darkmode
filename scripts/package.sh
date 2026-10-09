#!/usr/bin/env bash
# Package the extension into a distributable .zip (for the Chrome Web Store
# or manual sharing). Only the files the browser needs are included.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="$(node -p "require('./manifest.json').version" 2>/dev/null || python3 -c "import json;print(json.load(open('manifest.json'))['version'])")"
OUT="dist"
ZIP="$OUT/nightshift-${VERSION}.zip"

mkdir -p "$OUT"
rm -f "$ZIP"

# Files that make up the shippable extension.
INCLUDE=(manifest.json background content popup icons)

# Validate everything exists before zipping.
for item in "${INCLUDE[@]}"; do
  if [ ! -e "$item" ]; then
    echo "ERROR: expected '$item' is missing — aborting." >&2
    exit 1
  fi
done

zip -r -q -X "$ZIP" "${INCLUDE[@]}" -x '*.DS_Store'
echo "Packaged: $ZIP"
unzip -l "$ZIP" | tail -n +4 | head -n -2 || true
