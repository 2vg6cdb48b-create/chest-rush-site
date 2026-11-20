// Builds a single self-contained HTML file of the app for previewing in a browser.
// Usage: npx expo export --platform web && node scripts/build-web-preview.js <output.html>
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const out = process.argv[2] || path.join(dist, 'van-stock-preview.html');

const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);

const mime = { '.png': 'image/png', '.ttf': 'font/ttf', '.otf': 'font/otf', '.jpg': 'image/jpeg' };
function inlineAssets(js) {
  return js.replace(/"(\/assets\/[^"]+)"/g, (whole, url) => {
    const file = path.join(dist, decodeURIComponent(url));
    if (!fs.existsSync(file)) return whole;
    const type = mime[path.extname(file)] || 'application/octet-stream';
    return `"data:${type};base64,${fs.readFileSync(file).toString('base64')}"`;
  });
}

const bundle = scripts
  .map((src) => inlineAssets(fs.readFileSync(path.join(dist, src), 'utf8')))
  .join('\n;\n')
  .replace(/<\/script/gi, '<\\/script');

const page = `<title>Van Stock</title>
<meta name="description" content="Browser preview of the Van Stock iPhone app">
<style>
  :root { --bg: #F2F4F7; --fg: #14181F; box-sizing: border-box; height: 100%; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #0B0D11; --fg: #F2F4F7; color-scheme: dark } }
  :root[data-theme="dark"] { --bg: #0B0D11; --fg: #F2F4F7; color-scheme: dark }
  body { height: 100%; overflow: hidden; background: var(--bg); color: var(--fg); }
  #root { display: flex; height: 100%; flex: 1; }
</style>
<div id="root"></div>
<script>
  // The app's screens are at "/", "/restock", "/history" and "/more". Start on "/" whatever address the page is served from.
  (function () {
    try {
      if (!/^\\/(restock|history|more)?$/.test(location.pathname)) history.replaceState(null, '', '/');
    } catch (e) {}
  })();
</script>
<script>
${bundle}
</script>
`;
fs.writeFileSync(out, page);
console.log(`Wrote ${out} (${(page.length / 1024 / 1024).toFixed(1)} MB)`);
