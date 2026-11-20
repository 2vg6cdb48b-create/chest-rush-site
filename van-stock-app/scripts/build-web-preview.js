// Builds the browser version of the app as a single self-contained HTML file.
//
//   Preview page:  npx expo export --platform web
//                  node scripts/build-web-preview.js <output.html>
//
//   Website copy:  npm run build:site
//                  (exports with EXPO_BASE_URL set and writes ../van-stock/app/)
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const base = (process.env.EXPO_BASE_URL || '').replace(/\/$/, '');
const out = process.argv[2] || path.join(dist, 'van-stock-preview.html');

const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);

const mime = { '.png': 'image/png', '.ttf': 'font/ttf', '.otf': 'font/otf', '.jpg': 'image/jpeg' };
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const assetRe = new RegExp(`"(?:${escapeRe(base)})?(\\/assets\\/[^"]+)"`, 'g');

function inlineAssets(js) {
  return js.replace(assetRe, (whole, url) => {
    const file = path.join(dist, decodeURIComponent(url));
    if (!fs.existsSync(file)) return whole;
    const type = mime[path.extname(file)] || 'application/octet-stream';
    return `"data:${type};base64,${fs.readFileSync(file).toString('base64')}"`;
  });
}

const bundle = scripts
  .map((src) => fs.readFileSync(path.join(dist, src.slice(base.length)), 'utf8'))
  .map(inlineAssets)
  .join('\n;\n')
  .replace(/<\/script/gi, '<\\/script');

// The preview page can be served from any address, so start it on the app's first screen.
const startOnHome = base
  ? ''
  : `<script>
  (function () {
    try {
      if (!/^\\/(restock|history|more)?$/.test(location.pathname)) history.replaceState(null, '', '/');
    } catch (e) {}
  })();
</script>
`;

const styles = `<style>
  :root { --bg: #F2F4F7; --fg: #14181F; box-sizing: border-box; height: 100%; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #0B0D11; --fg: #F2F4F7; color-scheme: dark } }
  :root[data-theme="dark"] { --bg: #0B0D11; --fg: #F2F4F7; color-scheme: dark }
  body { margin: 0; height: 100%; overflow: hidden; background: var(--bg); color: var(--fg); }
  #root { display: flex; height: 100%; flex: 1; }
</style>`;

const content = `<title>Van Stock</title>
<meta name="description" content="Keep track of the stock in your van">
${styles}
<div id="root"></div>
${startOnHome}<script>
${bundle}
</script>
`;

// Phones may keep a copy of the page for a while (GitHub Pages allows 10 minutes), so the
// website copy checks for a newer build when it opens and reloads once if there is one.
const buildId = Date.now().toString(36);
const updateCheck = `<meta name="app-build" content="${buildId}">
<script>
  (function () {
    try {
      fetch('${base}/?build-check=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { return r.text(); })
        .then(function (t) {
          var m = t.match(/name="app-build" content="([^"]+)"/);
          if (!m || m[1] === '${buildId}') return;
          var key = 'reloaded-for-' + m[1];
          if (sessionStorage.getItem(key)) return;
          sessionStorage.setItem(key, '1');
          location.replace(location.pathname + '?v=' + m[1] + location.hash);
        })
        .catch(function () {});
    } catch (e) {}
  })();
</script>`;

// The preview host adds its own <html>/<head>/<body>; a website copy needs a full document.
const page = base
  ? `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Van Stock">
<meta name="theme-color" content="#1D5FD1">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<style>:root { padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }</style>
${updateCheck}
</head>
<body>
${content}</body>
</html>
`
  : content;

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, page);
console.log(`Wrote ${out} (${(page.length / 1024 / 1024).toFixed(1)} MB)`);
