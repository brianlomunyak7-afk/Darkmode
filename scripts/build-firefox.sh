#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OUT="dist/firefox"
rm -rf "$OUT"
mkdir -p "$OUT"
cp -r background content popup icons "$OUT/"

python3 - "$OUT/manifest.json" <<'PY'
import json, sys
m = json.load(open("manifest.json"))
m["background"] = {"scripts": [m["background"]["service_worker"]]}
with open(sys.argv[1], "w") as f:
    json.dump(m, f, indent=2, ensure_ascii=False)
    f.write("\n")
PY

VERSION="$(python3 -c "import json;print(json.load(open('manifest.json'))['version'])")"
ZIP="dist/nightshift-firefox-${VERSION}.zip"
rm -f "$ZIP"
(cd "$OUT" && zip -r -q -X "../nightshift-firefox-${VERSION}.zip" .)
echo "Firefox build: $OUT"
echo "Firefox package: $ZIP"
