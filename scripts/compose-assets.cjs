/*
 * Step 2 of the artwork pipeline (run after scripts/render-3d.cjs):
 *  - resizes the raw 3D renders from .render-cache/ into public/assets/
 *  - composes the wheel face (textures + 3D renders + text) into ONE image
 *
 * The generated images are committed, so the GitHub build does not need any of this.
 * On the TV nothing is computed: it shows images and rotates one of them with CSS.
 *
 *   node scripts/render-3d.cjs && node scripts/compose-assets.cjs
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CACHE = path.join(ROOT, '.render-cache');
const OUT = path.join(ROOT, 'public', 'assets');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const data = (f) => {
  const ext = path.extname(f).slice(1);
  return `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${fs.readFileSync(path.join(CACHE, f)).toString('base64')}`;
};

// name -> [width, height]
const RESIZE = {
  'ball.png': [400, 400],
  'padelball.png': [400, 400],
  'racket.png': [400, 500],
  'racket2.png': [400, 500],
  'gold.png': [460, 460],
  'goal-w.png': [500, 400],
  'corner-w.png': [400, 400],
  'net.png': [500, 328],
  'rim.png': [960, 960],
  'hub.png': [280, 280],
  'pointer.png': [160, 200],
};

// Slice i is centred at i*30+15 degrees clockwise from the top (same maths as the app).
const SLICES = [
  { kind: 'futebol', label: ['GOLO'], award: '3 FINOS', icon: 'ball.png', size: 150 },
  { kind: 'lose', ghost: 'padelball.png' },
  { kind: 'padel', label: ['SMASH'], award: '3 FINOS', icon: 'racket.png', size: 170, h: 1.25 },
  { kind: 'lose', ghost: 'ball.png' },
  { kind: 'futebol', label: ['PENÁLTI'], award: '1 FINO', icon: 'goal-w.png', size: 215, h: 0.8 },
  { kind: 'lose', ghost: 'padelball.png' },
  { kind: 'gold', label: ['PONTO', 'DE OURO'], award: 'RÉGUA', icon: 'crossed.png', size: 200 },
  { kind: 'lose', ghost: 'ball.png' },
  { kind: 'futebol', label: ['CANTO'], award: '3 FINOS', icon: 'corner-w.png', size: 190 },
  { kind: 'lose', ghost: 'padelball.png' },
  { kind: 'padel', label: ['BANDEJA'], award: '1 FINO', icon: 'racket2.png', size: 170, h: 1.25 },
  { kind: 'lose', ghost: 'ball.png' },
];

function wheelSVG() {
  const R = 600, seg = 30;
  const rad = (d) => (d * Math.PI) / 180;
  const P = (r, a) => `${(r * Math.sin(a)).toFixed(2)} ${(-r * Math.cos(a)).toFixed(2)}`;
  const slicePath = (r0, r1, pad = 0) => {
    const a0 = rad(-seg / 2 + pad), a1 = rad(seg / 2 - pad);
    return `M${P(r0, a0)} L${P(r1, a0)} A${r1} ${r1} 0 0 1 ${P(r1, a1)} L${P(r0, a1)} A${r0} ${r0} 0 0 0 ${P(r0, a0)} Z`;
  };
  const sp = slicePath(0, R);
  let slices = '';
  SLICES.forEach((s, i) => {
    const ang = i * seg + seg / 2;
    let body = '';
    if (s.kind === 'futebol') {
      body = `<path d="${sp}" fill="url(#pGrass)"/>
        <path d="${sp}" fill="url(#mow)"/>
        <path d="M-70 -215 A 105 105 0 0 1 70 -215" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="5"/>
        <path d="${slicePath(548, 553)}" fill="#fff" opacity="0.75"/>
        <path d="${sp}" fill="url(#sliceShade)"/>`;
    } else if (s.kind === 'padel') {
      body = `<path d="${sp}" fill="url(#pPadel)"/>
        <path d="M0 -160 L0 -240" stroke="#fff" stroke-opacity="0.55" stroke-width="5"/>
        <path d="${slicePath(548, 553)}" fill="#fff" opacity="0.75"/>
        <path d="${sp}" fill="url(#sliceShade)"/>`;
    } else if (s.kind === 'gold') {
      body = `<path d="${sp}" fill="url(#goldBase)"/>
        <path d="${slicePath(60, R, 9)}" fill="url(#goldShine)"/>
        <path d="${sp}" fill="url(#sliceShadeSoft)"/>`;
    } else {
      body = `<path d="${sp}" fill="#07090e"/>
        <path d="${sp}" fill="url(#pCarbon)" opacity="0.75"/>
        <path d="${sp}" fill="url(#loseShade)"/>
        <image href="${data(s.ghost)}" x="-62" y="-502" width="124" height="124" opacity="0.2" style="filter:grayscale(1)"/>
        <text y="-318" class="lt">TENTA</text>
        <text y="-268" class="lt2">OUTRA VEZ</text>`;
    }
    let extra = '';
    if (s.label) {
      const w = s.size, h = w * (s.h || 1);
      extra += `<image href="${data(s.icon)}" x="${-w / 2}" y="${-438 - h / 2}" width="${w}" height="${h}"/>`;
      const two = s.label.length > 1;
      const fs1 = two ? 46 : s.label[0].length > 6 ? 56 : 66;
      const cls = s.kind === 'gold' ? 'wtg' : 'wt';
      s.label.forEach((l, k) => { extra += `<text y="${(two ? -322 : -292) + k * 44}" class="${cls}" font-size="${fs1}">${l}</text>`; });
      extra += `<text y="${two ? -218 : -234}" class="${s.kind === 'gold' ? 'awg' : 'aw'}">${s.award}</text>`;
    }
    slices += `<g transform="rotate(${ang})">${body}${extra}</g>`;
  });
  let seps = '';
  for (let i = 0; i < 12; i++) {
    seps += `<g transform="rotate(${i * seg})">
      <rect x="-16" y="-${R}" width="32" height="${R - 100}" fill="url(#sepShadow)"/>
      <rect x="-4.5" y="-${R}" width="9" height="${R - 105}" fill="url(#sep)"/>
      <circle cx="0" cy="-560" r="11" fill="url(#peg)"/><circle cx="-3" cy="-564" r="3" fill="#fff" opacity="0.85"/>
    </g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-600 -600 1200 1200" width="1200" height="1200">
  <defs>
    <style>
      text{text-anchor:middle;paint-order:stroke;stroke-linejoin:round}
      .wt{font-family:'Bebas Neue';fill:#fff;letter-spacing:2px;stroke:#04060a;stroke-opacity:.7;stroke-width:8px}
      .wtg{font-family:'Bebas Neue';fill:#2a1900;letter-spacing:2px;stroke:#fff3b8;stroke-opacity:.55;stroke-width:3px}
      .aw{font-family:'Oswald';font-weight:700;font-size:38px;fill:url(#goldText);letter-spacing:1px;stroke:#04060a;stroke-opacity:.8;stroke-width:8px}
      .awg{font-family:'Oswald';font-weight:700;font-size:48px;fill:#fff;letter-spacing:2px;stroke:#3a2400;stroke-width:9px}
      .lt{font-family:'Bebas Neue';font-size:54px;fill:#d5dbe6;letter-spacing:4px}
      .lt2{font-family:'Oswald';font-weight:700;font-size:28px;fill:#7f8aa0;letter-spacing:3px}
    </style>
    <pattern id="pGrass" width="330" height="330" patternUnits="userSpaceOnUse"><image href="${data('tex-grass.jpg')}" width="330" height="330"/></pattern>
    <pattern id="pPadel" width="330" height="330" patternUnits="userSpaceOnUse"><image href="${data('tex-padel.jpg')}" width="330" height="330"/></pattern>
    <pattern id="pCarbon" width="64" height="64" patternUnits="userSpaceOnUse"><image href="${data('tex-carbon.png')}" width="64" height="64"/></pattern>
    <radialGradient id="mow" cx="0" cy="0" r="600" gradientUnits="userSpaceOnUse" spreadMethod="repeat">
      <stop offset="0" stop-color="#fff" stop-opacity="0.08"/><stop offset="0.0999" stop-color="#fff" stop-opacity="0.08"/>
      <stop offset="0.1" stop-color="#000" stop-opacity="0.14"/><stop offset="0.2" stop-color="#000" stop-opacity="0.14"/>
    </radialGradient>
    <radialGradient id="sliceShade" cx="0" cy="0" r="600" gradientUnits="userSpaceOnUse">
      <stop offset="0.1" stop-color="#000" stop-opacity="0.7"/><stop offset="0.45" stop-color="#000" stop-opacity="0.12"/>
      <stop offset="0.8" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.4"/>
    </radialGradient>
    <radialGradient id="sliceShadeSoft" cx="0" cy="0" r="600" gradientUnits="userSpaceOnUse">
      <stop offset="0.1" stop-color="#2a1500" stop-opacity="0.75"/><stop offset="0.4" stop-color="#2a1500" stop-opacity="0"/>
      <stop offset="0.88" stop-color="#2a1500" stop-opacity="0"/><stop offset="1" stop-color="#2a1500" stop-opacity="0.45"/>
    </radialGradient>
    <radialGradient id="loseShade" cx="0" cy="0" r="600" gradientUnits="userSpaceOnUse">
      <stop offset="0.1" stop-color="#000" stop-opacity="0.85"/><stop offset="0.6" stop-color="#101827" stop-opacity="0.25"/><stop offset="1" stop-color="#000" stop-opacity="0.6"/>
    </radialGradient>
    <linearGradient id="goldBase" x1="-160" y1="0" x2="160" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#9a6a06"/><stop offset="0.3" stop-color="#f1c232"/><stop offset="0.5" stop-color="#fff2a8"/>
      <stop offset="0.7" stop-color="#eeb92a"/><stop offset="1" stop-color="#946305"/>
    </linearGradient>
    <linearGradient id="goldShine" x1="-60" y1="0" x2="60" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.3"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="goldText" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff6c2"/><stop offset="0.5" stop-color="#ffd24a"/><stop offset="1" stop-color="#f0a818"/>
    </linearGradient>
    <linearGradient id="sep" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#6b4a06"/><stop offset="0.35" stop-color="#fff3b0"/><stop offset="0.6" stop-color="#e2b030"/><stop offset="1" stop-color="#5a3d04"/>
    </linearGradient>
    <linearGradient id="sepShadow" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="0.5" stop-color="#000" stop-opacity="0.55"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="peg" cx="35%" cy="30%" r="75%">
      <stop offset="0" stop-color="#fff6c2"/><stop offset="0.45" stop-color="#e9b530"/><stop offset="1" stop-color="#5a3d04"/>
    </radialGradient>
  </defs>
  <rect x="-600" y="-600" width="1200" height="1200" fill="#05070c"/>
  ${slices}
  ${seps}
  <circle r="596" fill="none" stroke="#05070c" stroke-width="10"/>
  <circle r="118" fill="#05070c"/>
</svg>`;
}

function raysSVG() {
  let rays = '';
  for (let i = 0; i < 18; i++) rays += `<path d="M0 0 L-30 -400 L30 -400 Z" transform="rotate(${i * 20})"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-400 -400 800 800" width="800" height="800">
    <defs><radialGradient id="rg" cx="0" cy="0" r="400" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffe9a0" stop-opacity="0.85"/><stop offset="0.5" stop-color="#ffd24a" stop-opacity="0.3"/><stop offset="1" stop-color="#ffd24a" stop-opacity="0"/>
    </radialGradient></defs><g fill="url(#rg)">${rays}</g></svg>`;
}

const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Oswald:wght@700&display=swap" rel="stylesheet">`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const shot = async (html, file, w, h, jpeg, waitTitle) => {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(`<!doctype html><html><head>${FONTS}<style>html,body{margin:0;background:transparent}svg,img,canvas{display:block}</style></head><body>${html}</body></html>`, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    if (waitTitle) await page.waitForFunction(() => document.title === 'ok');
    await page.waitForTimeout(400);
    const out = path.join(OUT, file);
    await page.screenshot({ path: out, type: jpeg ? 'jpeg' : 'png', quality: jpeg || undefined, omitBackground: !jpeg, clip: { x: 0, y: 0, width: w, height: h } });
    console.log(file, (fs.statSync(out).size / 1024).toFixed(0) + 'KB');
  };
  // high-quality downscale of the supersampled 3D renders
  for (const [file, [w, h]] of Object.entries(RESIZE)) {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(`<!doctype html><style>html,body{margin:0;background:transparent}canvas{display:block}</style><canvas id="c" width="${w}" height="${h}"></canvas>`);
    await page.evaluate(async ([src, w, h]) => {
      const i = new Image(); i.src = src; await i.decode();
      const g = document.getElementById('c').getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(i, 0, 0, w, h);
    }, [data(file), w, h]);
    const out = path.join(OUT, file);
    await page.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
    console.log(file, (fs.statSync(out).size / 1024).toFixed(0) + 'KB');
  }
  fs.copyFileSync(path.join(CACHE, 'scene.jpg'), path.join(OUT, 'scene.jpg'));
  await shot(wheelSVG(), 'wheel.jpg', 1200, 1200, 88);
  await shot(raysSVG(), 'rays.png', 800, 800);
  await browser.close();
})();
