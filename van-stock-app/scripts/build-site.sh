#!/usr/bin/env bash
# Builds the browser version into ../van-stock/app/ for the GitHub Pages site.
set -euo pipefail
cd "$(dirname "$0")/.."
BASE=/chest-rush-site/van-stock/app
OUT=../van-stock/app
rm -rf dist
EXPO_BASE_URL=$BASE npx expo export --platform web
EXPO_BASE_URL=$BASE node scripts/build-web-preview.js "$OUT/index.html"
cp assets/images/icon.png "$OUT/apple-touch-icon.png"
# GitHub Pages serves /restock from restock.html; send those back to the app.
for page in restock history more; do
  printf '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=./"><title>Van Stock</title>\n' > "$OUT/$page.html"
done
echo "Built $OUT"
