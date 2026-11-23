#!/usr/bin/env bash
# Builds the browser version into ../gas-records/app/ for the GitHub Pages site.
set -euo pipefail
cd "$(dirname "$0")/.."
BASE=/chest-rush-site/gas-records/app
OUT=../gas-records/app
rm -rf dist
EXPO_BASE_URL=$BASE npx expo export --platform web
EXPO_BASE_URL=$BASE node scripts/build-web-preview.js "$OUT/index.html"
cp assets/images/icon.png "$OUT/apple-touch-icon.png"
# GitHub Pages serves /due from due.html; send those back to the app.
for page in invoices due settings; do
  printf '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=./"><title>NG Gas Records</title>\n' > "$OUT/$page.html"
done
echo "Built $OUT"
