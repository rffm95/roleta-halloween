/*
 * Step 1 of the artwork pipeline: renders the 3D models (scripts/render3d/scene.js)
 * with three.js inside headless Chromium and saves them as raw images in .render-cache/.
 *
 *   npm i --no-save three@0.169.0 && node scripts/render-3d.cjs [name ...]
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CACHE = path.join(ROOT, '.render-cache');
fs.mkdirSync(CACHE, { recursive: true });

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/') {
    res.setHeader('content-type', 'text/html');
    return res.end(`<!doctype html><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script><script type="module" src="/scripts/render3d/scene.js"></script>`);
  }
  const f = path.join(ROOT, url);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.statusCode = 404; return res.end(); }
  res.setHeader('content-type', 'text/javascript');
  fs.createReadStream(f).pipe(res);
});

(async () => {
  await new Promise((r) => server.listen(4599, r));
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('PAGE ERROR', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto('http://localhost:4599/');
  await page.waitForFunction(() => window.ready, null, { timeout: 180000 });
  const all = await page.evaluate(() => window.assetNames);
  const names = process.argv.slice(2).length ? process.argv.slice(2) : all;
  for (const n of names) {
    const t = Date.now();
    const url = await page.evaluate((name) => window.renderAsset(name), n);
    const ext = url.startsWith('data:image/jpeg') ? 'jpg' : 'png';
    fs.writeFileSync(path.join(CACHE, `${n}.${ext}`), Buffer.from(url.split(',')[1], 'base64'));
    console.log(n, ext, Date.now() - t, 'ms');
  }
  await browser.close();
  server.close();
})();
