// Builds the browser version of the app as a single self-contained HTML file.
//
//   Preview page:  npx expo export --platform web
//                  node scripts/build-web-preview.js <output.html>
//
//   Website copy:  npm run build:site
//                  (exports with EXPO_BASE_URL set and writes ../gas-records/app/)
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const base = (process.env.EXPO_BASE_URL || '').replace(/\/$/, '');
const out = process.argv[2] || path.join(dist, 'gas-records-preview.html');

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
      if (!/^\\/(due|settings)?$/.test(location.pathname)) history.replaceState(null, '', '/');
    } catch (e) {}
  })();
</script>
`;

const styles = `<style>
  :root { --bg: #F3F4F7; --fg: #14181F; box-sizing: border-box; height: 100%; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #0A0F1A; --fg: #F2F4F7; color-scheme: dark } }
  :root[data-theme="dark"] { --bg: #0A0F1A; --fg: #F2F4F7; color-scheme: dark }
  body { margin: 0; height: 100%; overflow: hidden; background: var(--bg); color: var(--fg); }
  #root { display: flex; height: 100%; flex: 1; }
</style>`;

const content = `<title>NG Gas Records</title>
<meta name="description" content="Landlord gas safety records (CP12) on your phone">
${styles}
<div id="root"></div>
${startOnHome}<script>
${bundle}
</script>
`;

// The preview host adds its own <html>/<head>/<body>; a website copy needs a full document.
const page = base
  ? `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="NG Gas Records">
<meta name="theme-color" content="#E4501A">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<style>:root { padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }</style>
</head>
<body>
${content}</body>
</html>
`
  : content;

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, page);
console.log(`Wrote ${out} (${(page.length / 1024 / 1024).toFixed(1)} MB)`);
