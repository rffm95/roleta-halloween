// Runs inside headless Chromium (see ../render-assets.cjs). Builds real 3D models with
// three.js and renders them ONCE to images. The TV never runs any 3D: it only shows images.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const SS = 2; // supersampling

let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const pmrem = new THREE.PMREMGenerator(renderer);
const ENV = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;

// ------------------------------------------------------------------ textures
const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tex = (canvas, color = true, rx = 1, ry = 1) => {
  const t = new THREE.CanvasTexture(canvas);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 8;
  return t;
};

function turfCanvas(size, base, blades, strokes, len) {
  const c = mkCanvas(size, size), g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  g.lineCap = 'round';
  for (let i = 0; i < strokes; i++) {
    const x = rnd() * size, y = rnd() * size, a = -Math.PI / 2 + (rnd() - 0.5) * 1.6, l = len * (0.4 + rnd());
    g.strokeStyle = blades[Math.floor(rnd() * blades.length)];
    g.globalAlpha = 0.35 + rnd() * 0.5;
    g.lineWidth = 0.8 + rnd() * 1.4;
    for (const ox of [0, size, -size]) for (const oy of [0, size, -size]) {
      if (x + ox < -20 || x + ox > size + 20 || y + oy < -20 || y + oy > size + 20) continue;
      g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); g.stroke();
    }
  }
  g.globalAlpha = 1;
  return c;
}
const grassC = turfCanvas(1024, '#1f6a1f', ['#2f8f2a', '#3fa63a', '#1a5a1a', '#57b84d', '#267a23', '#144d16'], 90000, 11);
const padelC = turfCanvas(1024, '#1a55b8', ['#2468d6', '#1c4fa8', '#3b82f6', '#17479a', '#5b9bf5', '#cfe0ff'], 70000, 6);

function carbonCanvas() {
  const c = mkCanvas(256, 256), g = c.getContext('2d');
  g.fillStyle = '#0c0d10'; g.fillRect(0, 0, 256, 256);
  const s = 16;
  for (let y = 0; y < 256; y += s) for (let x = 0; x < 256; x += s) {
    const k = ((x / s) + (y / s)) % 4;
    const gr = g.createLinearGradient(x, y, x + s, y + s);
    if (k < 2) { gr.addColorStop(0, '#2b2e35'); gr.addColorStop(1, '#101114'); }
    else { gr.addColorStop(0, '#16171b'); gr.addColorStop(1, '#30333b'); }
    g.fillStyle = gr; g.fillRect(x + 0.5, y + 0.5, s - 1, s - 1);
  }
  return c;
}
const carbonC = carbonCanvas();

// --- football: exact truncated-icosahedron panels computed per texel
function footballTextures() {
  const W = 2048, H = 1024;
  const phi = (1 + Math.sqrt(5)) / 2;
  const iv = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) iv.push([0, a, b * phi], [a, b * phi, 0], [b * phi, 0, a]);
  const n3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
  const faces = iv.map((v) => ({ n: n3(v), h: 2.32744, pent: true }));
  for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) for (let k = j + 1; k < 12; k++) {
    const d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
    if (Math.abs(d(iv[i], iv[j]) - 2) < 0.01 && Math.abs(d(iv[j], iv[k]) - 2) < 0.01 && Math.abs(d(iv[i], iv[k]) - 2) < 0.01) {
      faces.push({ n: n3([iv[i][0] + iv[j][0] + iv[k][0], iv[i][1] + iv[j][1] + iv[k][1], iv[i][2] + iv[j][2] + iv[k][2]]), h: 2.26728, pent: false });
    }
  }
  const col = mkCanvas(W, H), bump = mkCanvas(W, H), rough = mkCanvas(W, H);
  const gc = col.getContext('2d'), gb = bump.getContext('2d'), gr = rough.getContext('2d');
  const ic = gc.createImageData(W, H), ib = gb.createImageData(W, H), ir = gr.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    const th = (y + 0.5) / H * Math.PI, st = Math.sin(th), ct = Math.cos(th);
    for (let x = 0; x < W; x++) {
      const ph = (x + 0.5) / W * Math.PI * 2;
      const dx = st * Math.cos(ph), dy = ct, dz = st * Math.sin(ph);
      let b1 = 0, b2 = 0, bi = 0;
      for (let f = 0; f < 32; f++) {
        const F = faces[f], v = (dx * F.n[0] + dy * F.n[1] + dz * F.n[2]) / F.h;
        if (v > b1) { b2 = b1; b1 = v; bi = f; } else if (v > b2) b2 = v;
      }
      const edge = (b1 - b2) * 60; // 0 at seam
      const seam = Math.min(1, edge / 0.55);
      const o = (y * W + x) * 4;
      const grain = (rnd() - 0.5) * 10;
      const pent = faces[bi].pent;
      const base = pent ? 22 : 236;
      const v = base * (0.45 + 0.55 * seam) + grain;
      ic.data[o] = v; ic.data[o + 1] = v; ic.data[o + 2] = pent ? v + 2 : v + 1; ic.data[o + 3] = 255;
      const bh = 255 * (1 - Math.pow(1 - seam, 2.2)) - 6 + (rnd() - 0.5) * 14;
      ib.data[o] = ib.data[o + 1] = ib.data[o + 2] = bh; ib.data[o + 3] = 255;
      const rg = pent ? 95 : 120;
      ir.data[o] = ir.data[o + 1] = ir.data[o + 2] = rg + (1 - seam) * 100; ir.data[o + 3] = 255;
    }
  }
  gc.putImageData(ic, 0, 0); gb.putImageData(ib, 0, 0); gr.putImageData(ir, 0, 0);
  return { map: tex(col), bumpMap: tex(bump, false), roughnessMap: tex(rough, false) };
}
const FB = footballTextures();

function padelBallTextures() {
  const W = 1024, H = 512, N = 360;
  const curve = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    curve.push([0.75 * Math.cos(t) + 0.25 * Math.cos(3 * t), 0.75 * Math.sin(t) - 0.25 * Math.sin(3 * t), 0.866 * Math.sin(2 * t)]);
  }
  const col = mkCanvas(W, H), bump = mkCanvas(W, H);
  const gc = col.getContext('2d'), gb = bump.getContext('2d');
  const ic = gc.createImageData(W, H), ib = gb.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    const th = (y + 0.5) / H * Math.PI, st = Math.sin(th), ct = Math.cos(th);
    for (let x = 0; x < W; x++) {
      const ph = (x + 0.5) / W * Math.PI * 2;
      const dx = st * Math.cos(ph), dy = ct, dz = st * Math.sin(ph);
      let best = -1;
      for (let i = 0; i < N; i++) { const c = curve[i], d = dx * c[0] + dy * c[1] + dz * c[2]; if (d > best) best = d; }
      const ang = Math.acos(Math.min(1, best));
      const s = Math.min(1, Math.max(0, (ang - 0.035) / 0.03)); // 0 on the seam
      const n = rnd();
      const o = (y * W + x) * 4;
      const f = 0.82 + n * 0.3;
      ic.data[o] = (176 * f) * s + 238 * (1 - s);
      ic.data[o + 1] = (222 * f) * s + 240 * (1 - s);
      ic.data[o + 2] = (8 * f) * s + 225 * (1 - s);
      ic.data[o + 3] = 255;
      const bh = (120 + n * 135) * s + 60 * (1 - s);
      ib.data[o] = ib.data[o + 1] = ib.data[o + 2] = bh; ib.data[o + 3] = 255;
    }
  }
  gc.putImageData(ic, 0, 0); gb.putImageData(ib, 0, 0);
  return { map: tex(col), bumpMap: tex(bump, false) };
}
const PB = padelBallTextures();

function netTexture(color = '#ffffff', lw = 5) {
  const c = mkCanvas(64, 64), g = c.getContext('2d');
  g.strokeStyle = color; g.lineWidth = lw;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(64, 0); g.moveTo(0, 0); g.lineTo(0, 64); g.stroke();
  return c;
}
const netC = netTexture('#ffffff', 5);
const meshC = netTexture('#aab4c0', 7);

// correct straight-alpha output for transparent materials on a transparent canvas
const fixA = (m) => { m.blending = THREE.CustomBlending; m.blendSrc = THREE.SrcAlphaFactor; m.blendDst = THREE.OneMinusSrcAlphaFactor; m.blendSrcAlpha = THREE.OneFactor; m.blendDstAlpha = THREE.OneMinusSrcAlphaFactor; return m; };

// ------------------------------------------------------------------ models
function football(r = 1) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, 96, 64),
    new THREE.MeshPhysicalMaterial({ ...FB, bumpScale: 3.2, roughness: 1, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.35, envMapIntensity: 0.9 })
  );
  m.castShadow = true;
  m.rotation.set(0.5, 0.9, 0.2);
  return m;
}
function padelBall(r = 1) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, 64, 48),
    new THREE.MeshPhysicalMaterial({ ...PB, bumpScale: 2.2, roughness: 0.95, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color('#e6ff5a'), envMapIntensity: 0.45 })
  );
  m.castShadow = true;
  m.rotation.set(0.6, 0.4, 0.5);
  return m;
}

function racketFaceCanvas(accent, gold) {
  const W = 600, H = 1040, c = mkCanvas(W, H), g = c.getContext('2d');
  if (gold) {
    const gr = g.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, '#fff1a8'); gr.addColorStop(0.5, '#e0aa25'); gr.addColorStop(1, '#a8740a');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  } else {
    g.fillStyle = g.createPattern(carbonC, 'repeat'); g.save(); g.scale(0.5, 0.5); g.fillRect(0, 0, W * 2, H * 2); g.restore();
  }
  // graphics: sweeping bands across the head
  g.save();
  g.translate(W / 2, 330); g.rotate(-0.55);
  g.fillStyle = accent; g.fillRect(-500, 40, 1000, 92);
  g.fillStyle = gold ? '#fffbe0' : '#ffffff'; g.fillRect(-500, 146, 1000, 16);
  g.fillStyle = accent; g.globalAlpha = 0.55; g.fillRect(-500, 176, 1000, 30);
  g.restore();
  g.fillStyle = gold ? '#3a2600' : '#ffffff';
  g.font = '900 54px Arial'; g.textAlign = 'center';
  g.save(); g.translate(W / 2, 640); g.fillText('CHEERS', 0, 0); g.restore();
  return c;
}

function racket({ accent = '#c6f432', gold = false } = {}) {
  const grp = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(-0.2, -0.95);
  s.bezierCurveTo(-0.3, -0.45, -1.32, 0.0, -1.32, 1.05);
  s.bezierCurveTo(-1.32, 1.95, -0.75, 2.5, 0, 2.5);
  s.bezierCurveTo(0.75, 2.5, 1.32, 1.95, 1.32, 1.05);
  s.bezierCurveTo(1.32, 0.0, 0.3, -0.45, 0.2, -0.95);
  s.lineTo(-0.2, -0.95);
  // throat opening
  const th = new THREE.Path();
  th.moveTo(0, -0.62); th.bezierCurveTo(-0.12, -0.3, -0.5, -0.08, -0.62, 0.06);
  th.quadraticCurveTo(0, -0.12, 0.62, 0.06); th.bezierCurveTo(0.5, -0.08, 0.12, -0.3, 0, -0.62);
  s.holes.push(th);
  const sp = 0.235;
  for (let row = 0; row < 9; row++) for (let colI = -5; colI <= 5; colI++) {
    const x = colI * sp + (row % 2 ? sp / 2 : 0), y = 0.42 + row * sp * 0.9;
    const ex = x / 0.98, ey = (y - 1.22) / 1.0;
    if (ex * ex + ey * ey > 0.86) continue;
    const h = new THREE.Path(); h.absarc(x, y, 0.062, 0, Math.PI * 2, true); s.holes.push(h);
  }
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 4, curveSegments: 20 });
  geo.translate(0, 0, -0.15);
  const ft = tex(racketFaceCanvas(accent, gold));
  ft.repeat.set(1 / 3, 1 / 5.2); ft.offset.set(0.5, 2.6 / 5.2);
  const face = gold
    ? new THREE.MeshPhysicalMaterial({ map: ft, metalness: 1, roughness: 0.22, clearcoat: 0.6, envMapIntensity: 1.5 })
    : new THREE.MeshPhysicalMaterial({ map: ft, metalness: 0.25, roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 1.3 });
  const side = new THREE.MeshPhysicalMaterial({ color: gold ? '#c99412' : '#0d0e11', metalness: gold ? 1 : 0.4, roughness: gold ? 0.25 : 0.3, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.4 });
  const head = new THREE.Mesh(geo, [face, side]);
  head.castShadow = true;
  grp.add(head);
  // handle with grip
  const gc = mkCanvas(64, 64), gg = gc.getContext('2d');
  gg.fillStyle = gold ? '#17181c' : '#1b1c20'; gg.fillRect(0, 0, 64, 64);
  gg.strokeStyle = '#000'; gg.lineWidth = 5; gg.beginPath(); gg.moveTo(-8, 40); gg.lineTo(72, 8); gg.moveTo(-8, 72); gg.lineTo(72, 40); gg.moveTo(-8, 8); gg.lineTo(72, -24); gg.stroke();
  gg.strokeStyle = '#3a3c44'; gg.lineWidth = 2; gg.beginPath(); gg.moveTo(-8, 34); gg.lineTo(72, 2); gg.moveTo(-8, 66); gg.lineTo(72, 34); gg.stroke();
  const gt = tex(gc, true, 1, 6);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.215, 1.75, 24), new THREE.MeshStandardMaterial({ map: gt, bumpMap: gt, bumpScale: 2, roughness: 0.75 }));
  handle.scale.z = 0.8; handle.position.y = -1.8; handle.castShadow = true;
  grp.add(handle);
  const capM = new THREE.MeshPhysicalMaterial({ color: gold ? '#e0aa25' : accent, metalness: gold ? 1 : 0.1, roughness: 0.3, clearcoat: 1 });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.12, 24), capM);
  cap.scale.z = 0.8; cap.position.y = -2.7; grp.add(cap);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.12, 24), capM);
  collar.scale.z = 0.8; collar.position.y = -0.95; grp.add(collar);
  return grp;
}

const whiteGloss = () => new THREE.MeshPhysicalMaterial({ color: '#f4f6f8', roughness: 0.3, clearcoat: 0.8, envMapIntensity: 1 });
function netPlane(w, h, cell = 0.14, canvas = netC, opacity = 0.9) {
  const t = tex(canvas, true, w / cell, h / cell);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), fixA(new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false })));
  return m;
}
function goal(w = 7.32, h = 2.44, d = 1.9) {
  const g = new THREE.Group(), r = 0.07, mat = whiteGloss();
  const bar = (len) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 20), mat); m.castShadow = true; return m; };
  const l = bar(h); l.position.set(-w / 2, h / 2, 0); g.add(l);
  const rr = bar(h); rr.position.set(w / 2, h / 2, 0); g.add(rr);
  const top = bar(w + r * 2); top.rotation.z = Math.PI / 2; top.position.set(0, h, 0); g.add(top);
  const back = netPlane(w, h * 1.02); back.position.set(0, h / 2, -d); back.rotation.x = 0.0; g.add(back);
  // sloped back: top is shallower than bottom
  const topD = d * 0.45;
  const roof = netPlane(w, topD); roof.rotation.x = -Math.PI / 2; roof.position.set(0, h, -topD / 2); g.add(roof);
  const slope = netPlane(w, Math.hypot(h, d - topD)); slope.position.set(0, h / 2, -(d + topD) / 2); slope.rotation.x = -Math.atan2(d - topD, h); g.remove(back); g.add(slope);
  for (const sx of [-1, 1]) {
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0, h); sh.lineTo(-topD, h); sh.lineTo(-d, 0); sh.lineTo(0, 0);
    const t = tex(netC, true, 1 / 0.14, 1 / 0.14);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), fixA(new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })));
    m.rotation.y = -Math.PI / 2; m.position.set(sx * w / 2, 0, 0); g.add(m);
  }
  return g;
}

function grassDisc(radius, canvas = grassC, rep = 3) {
  const a = mkCanvas(256, 256), g = a.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 60, 128, 128, 128);
  gr.addColorStop(0, '#fff'); gr.addColorStop(0.6, '#fff'); gr.addColorStop(1, '#000');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const at = new THREE.CanvasTexture(a);
  const t = tex(canvas, true, rep, rep);
  const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 64), fixA(new THREE.MeshStandardMaterial({ map: t, alphaMap: at, transparent: true, roughness: 1 })));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true;
  return m;
}
const line = (w, d, x, z, op = 0.92) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: '#f3f6f8', transparent: true, opacity: op }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.012, z); return m;
};

// ------------------------------------------------------------------ render helpers
function baseScene({ key = [-2.5, 9, 4.5], keyI = 2.6, env = 0.9, shadow = true } = {}) {
  const sc = new THREE.Scene();
  sc.environment = ENV; sc.environmentIntensity = env;
  const k = new THREE.DirectionalLight('#fff7e6', keyI);
  k.position.set(...key); k.castShadow = true;
  k.shadow.mapSize.set(2048, 2048); k.shadow.radius = 9; k.shadow.blurSamples = 20; k.shadow.bias = -0.0005;
  const c = k.shadow.camera; c.left = -8; c.right = 8; c.top = 8; c.bottom = -8; c.far = 40;
  sc.add(k);
  const rim = new THREE.DirectionalLight('#9cc4ff', 1.6); rim.position.set(5, 4, -6); sc.add(rim);
  if (shadow) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), fixA(new THREE.ShadowMaterial({ opacity: 0.42 })));
    p.rotation.x = -Math.PI / 2; p.receiveShadow = true; p.name = 'shadowPlane'; sc.add(p);
  }
  return sc;
}
function shoot(sc, cam, w, h, type = 'image/png') {
  renderer.setPixelRatio(1);
  renderer.setSize(w * SS, h * SS, false);
  renderer.setClearColor(0x000000, 0);
  cam.aspect = w / h; cam.updateProjectionMatrix();
  renderer.render(sc, cam);
  return renderer.domElement.toDataURL(type, 0.92);
}
const persp = (fov, pos, look) => { const c = new THREE.PerspectiveCamera(fov, 1, 0.1, 300); c.position.set(...pos); c.lookAt(...look); return c; };

// ------------------------------------------------------------------ assets
const A = {};

A['ball'] = () => {
  const sc = baseScene(); const b = football(1); b.position.y = 1; sc.add(b);
  return shoot(sc, persp(24, [0, 2.2, 6.6], [0, 0.93, 0]), 512, 512);
};
A['padelball'] = () => {
  const sc = baseScene(); const b = padelBall(1); b.position.y = 1; sc.add(b);
  return shoot(sc, persp(24, [0, 2.2, 6.6], [0, 0.93, 0]), 512, 512);
};
A['racket'] = () => {
  const sc = baseScene({ shadow: false, key: [-3, 5, 8] });
  const r = racket(); r.rotation.set(-0.15, 0.5, -0.38); sc.add(r);
  const b = padelBall(0.42); b.position.set(1.45, -1.9, 0.6); sc.add(b);
  return shoot(sc, persp(24, [0, 0.2, 15.5], [0.1, -0.15, 0]), 512, 640);
};
A['racket2'] = () => {
  const sc = baseScene({ shadow: false, key: [-3, 5, 8] });
  const r = racket({ accent: '#ff3d8b' }); r.rotation.set(-0.1, -0.45, 0.42); sc.add(r);
  const b = padelBall(0.42); b.position.set(-1.5, 1.7, 0.5); sc.add(b);
  const b2 = padelBall(0.42); b2.position.set(-1.75, -1.75, 0.3); b2.rotation.y = 2; sc.add(b2);
  return shoot(sc, persp(24, [0, 0.2, 15.5], [-0.15, -0.15, 0]), 512, 640);
};
const crossed = (gold) => () => {
  const sc = baseScene({ shadow: false, key: [-3, 5, 8], env: 1.3 });
  const r1 = racket(gold ? { accent: '#7a4f00', gold: true } : { accent: '#c6f432' }); r1.rotation.set(0, 0.25, 0.62); r1.position.set(0, 0.1, -0.25); sc.add(r1);
  const r2 = racket(gold ? { accent: '#7a4f00', gold: true } : { accent: '#ff3d8b' }); r2.rotation.set(0, -0.25, -0.62); r2.position.set(0, 0.1, 0.25); sc.add(r2);
  const b = padelBall(0.62); b.position.set(0, -1.55, 0.9); sc.add(b);
  return shoot(sc, persp(24, [0, 0.2, 16], [0, -0.1, 0]), 640, 640);
};
A['gold'] = crossed(true);
A['crossed'] = crossed(false);
const goalShot = (ground) => () => {
  const sc = baseScene({ shadow: false, key: [-6, 9, 8] });
  if (ground) { sc.add(grassDisc(6.2)); sc.add(line(8.2, 0.12, 0, 0)); }
  sc.add(ground ? goal() : goal(4.4, 2.44, 1.7));
  const b = football(ground ? 0.42 : 0.5); b.position.set(ground ? 1.7 : 0.9, ground ? 0.42 : 0.5, 1.6); sc.add(b);
  return shoot(sc, ground ? persp(26, [-5.2, 3.0, 13.5], [0.1, 1.05, -0.4]) : persp(17, [-5.0, 2.6, 13.5], [0.1, 1.2, -0.3]), 640, 512);
};
A['goal'] = goalShot(true);
A['goal-w'] = goalShot(false);
const cornerShot = (ground) => () => {
  const sc = baseScene({ shadow: false, key: [-5, 8, 6] });
  if (ground) sc.add(grassDisc(2.6, grassC, 1.6));
  const arc = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.03, 48, 1, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#f3f6f8', side: THREE.DoubleSide }));
  arc.rotation.x = -Math.PI / 2; arc.rotation.z = 0; arc.position.set(-0.9, 0.012, 0.3); if (ground) sc.add(arc);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.3, 16), whiteGloss());
  pole.position.set(-0.9, 1.15, 0.3); pole.castShadow = true; sc.add(pole);
  const fc = mkCanvas(128, 128), g = fc.getContext('2d');
  g.fillStyle = '#e11d2a'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#ffd21f'; g.fillRect(0, 0, 64, 64); g.fillRect(64, 64, 64, 64);
  const fg = new THREE.PlaneGeometry(0.95, 0.68, 24, 8);
  const p = fg.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + 0.475; p.setZ(i, Math.sin(x * 7) * 0.07 * x * 2); p.setY(i, p.getY(i) - x * 0.07); }
  fg.computeVertexNormals();
  const flag = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ map: tex(fc), side: THREE.DoubleSide, roughness: 0.7 }));
  flag.position.set(-0.9 + 0.475, 1.92, 0.3); flag.castShadow = true; sc.add(flag);
  const b = football(0.36); b.position.set(-0.05, 0.36, 0.75); sc.add(b);
  return shoot(sc, persp(ground ? 26 : 22, [1.6, 2.4, 6.6], [-0.35, ground ? 0.95 : 1.15, 0.3]), 512, 512);
};
A['corner'] = cornerShot(true);
A['corner-w'] = cornerShot(false);
A['net'] = () => {
  const sc = baseScene({ shadow: false, key: [-5, 8, 6] });
  sc.add(grassDisc(3.4, padelC, 2));
  sc.add(line(6, 0.08, 0, 0));
  const n = netPlane(5, 0.82, 0.07, netC, 0.8); n.position.set(0, 0.45, 0); sc.add(n);
  const band = new THREE.Mesh(new THREE.BoxGeometry(5, 0.09, 0.03), whiteGloss()); band.position.set(0, 0.88, 0); sc.add(band);
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 0.1), new THREE.MeshPhysicalMaterial({ color: '#15171c', metalness: 0.8, roughness: 0.3 }));
    post.position.set(sx * 2.5, 0.5, 0); sc.add(post);
  }
  const b = padelBall(0.2); b.position.set(0.6, 0.2, 0.9); sc.add(b);
  return shoot(sc, persp(26, [-2.2, 1.9, 7.2], [0, 0.45, 0]), 640, 420);
};

// --- gold rim of the wheel (static overlay, top-down)
A['rim'] = () => {
  const sc = new THREE.Scene(); sc.environment = ENV; sc.environmentIntensity = 1.25;
  const k = new THREE.DirectionalLight('#fff3d0', 2.2); k.position.set(-3, 6, 4); sc.add(k);
  const gold = new THREE.MeshPhysicalMaterial({ color: '#e9b530', metalness: 1, roughness: 0.2, envMapIntensity: 1.4 });
  const dark = new THREE.MeshPhysicalMaterial({ color: '#0d0f14', metalness: 0.85, roughness: 0.32, clearcoat: 0.7 });
  const add = (geo, mat, y = 0) => { const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.position.y = y; sc.add(m); return m; };
  // outer gold tube, dark channel, inner gold lip
  add(new THREE.TorusGeometry(1.0, 0.03, 24, 240), gold, 0.02);
  add(new THREE.RingGeometry(0.915, 1.0, 240), new THREE.MeshStandardMaterial({ color: '#07090d', metalness: 0, roughness: 0.7, envMapIntensity: 0.25 }), 0);
  add(new THREE.TorusGeometry(0.915, 0.016, 20, 240), gold, 0.02);
  // sockets for the 24 bulbs
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const s = new THREE.Mesh(new THREE.TorusGeometry(0.021, 0.006, 12, 24), gold);
    s.rotation.x = -Math.PI / 2; s.position.set(Math.sin(a) * 0.958, 0.03, -Math.cos(a) * 0.958); sc.add(s);
  }
  const cam = new THREE.OrthographicCamera(-1.06, 1.06, 1.06, -1.06, 0.1, 20); cam.position.set(0, 5, 0); cam.lookAt(0, 0, 0);
  renderer.setPixelRatio(1); renderer.setSize(1000 * SS, 1000 * SS, false); renderer.setClearColor(0, 0);
  renderer.render(sc, cam);
  return renderer.domElement.toDataURL('image/png');
};

// --- hub: football sitting in a gold ring (static overlay)
A['hub'] = () => {
  const sc = new THREE.Scene(); sc.environment = ENV; sc.environmentIntensity = 1.2;
  const k = new THREE.DirectionalLight('#fff3d0', 2.4); k.position.set(-3, 6, 4); sc.add(k);
  const gold = new THREE.MeshPhysicalMaterial({ color: '#e9b530', metalness: 1, roughness: 0.2, envMapIntensity: 1.4 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.11, 24, 120), gold); ring.rotation.x = -Math.PI / 2; sc.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.035, 16, 120), gold); ring2.rotation.x = -Math.PI / 2; sc.add(ring2);
  const plate = new THREE.Mesh(new THREE.CircleGeometry(1.2, 64), new THREE.MeshPhysicalMaterial({ color: '#0d0f14', metalness: 0.9, roughness: 0.3 })); plate.rotation.x = -Math.PI / 2; plate.position.y = -0.02; sc.add(plate);
  const b = football(0.93); b.rotation.set(-1.1, 0.3, 0.4); b.position.y = 0.2; sc.add(b);
  const cam = new THREE.OrthographicCamera(-1.3, 1.3, 1.3, -1.3, 0.1, 20); cam.position.set(0, 5, 0); cam.lookAt(0, 0, 0);
  renderer.setPixelRatio(1); renderer.setSize(360 * SS, 360 * SS, false); renderer.setClearColor(0, 0);
  renderer.render(sc, cam);
  return renderer.domElement.toDataURL('image/png');
};

// --- pointer: bevelled gold arrow with a ruby
A['pointer'] = () => {
  const sc = new THREE.Scene(); sc.environment = ENV; sc.environmentIntensity = 1.5;
  const k = new THREE.DirectionalLight('#fff3d0', 3); k.position.set(-2, 5, 6); sc.add(k);
  const grp = new THREE.Group();
  const s = new THREE.Shape(); s.moveTo(-0.62, 1); s.lineTo(0.62, 1); s.quadraticCurveTo(0.74, 1, 0.74, 0.86); s.lineTo(0.74, 0.3); s.lineTo(0, -1.05); s.lineTo(-0.74, 0.3); s.lineTo(-0.74, 0.86); s.quadraticCurveTo(-0.74, 1, -0.62, 1);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.25, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 6 });
  grp.add(new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: '#ffcb45', metalness: 1, roughness: 0.24, envMapIntensity: 1.6 })));
  const s2 = new THREE.Shape(); s2.moveTo(-0.36, 0.7); s2.lineTo(0.36, 0.7); s2.lineTo(0.36, 0.3); s2.lineTo(0, -0.42); s2.lineTo(-0.36, 0.3); s2.lineTo(-0.36, 0.7);
  const g2 = new THREE.ExtrudeGeometry(s2, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 5 });
  const ruby = new THREE.Mesh(g2, new THREE.MeshPhysicalMaterial({ color: '#b00014', metalness: 0.75, roughness: 0.05, clearcoat: 1, envMapIntensity: 2 })); ruby.position.z = 0.36; grp.add(ruby);
  grp.rotation.x = -0.55; sc.add(grp);
  const cam = new THREE.OrthographicCamera(-1, 1, 1.25, -1.25, 0.1, 20); cam.position.set(0, 0, 6); cam.lookAt(0, 0, 0);
  renderer.setPixelRatio(1); renderer.setSize(200 * SS, 250 * SS, false); renderer.setClearColor(0, 0);
  renderer.render(sc, cam);
  return renderer.domElement.toDataURL('image/png');
};

// --- background: night arena, football pitch on the left, padel court on the right
A['scene'] = () => {
  const W = 1920, H = 1080;
  const sc = new THREE.Scene();
  sc.background = new THREE.Color('#02040a');
  sc.fog = new THREE.Fog('#050a16', 22, 70);
  sc.environment = ENV; sc.environmentIntensity = 0.1;
  sc.add(new THREE.HemisphereLight('#6f8fc8', '#0a1a0a', 0.5));
  const spot = (x, z, tx, tz, col, I) => {
    const s = new THREE.SpotLight(col, I, 90, 0.5, 0.7, 1.1);
    s.position.set(x, 20, z); s.target.position.set(tx, 0, tz); s.castShadow = true;
    s.shadow.mapSize.set(2048, 2048); s.shadow.radius = 6; s.shadow.bias = -0.0004;
    sc.add(s, s.target);
  };
  spot(-17, 4, -8, -8, '#fff4d6', 190);
  spot(17, 4, 8, -8, '#eaf2ff', 190);
  spot(-6, -34, -8, -8, '#fff4d6', 170);
  spot(6, -34, 8, -8, '#eaf2ff', 170);

  // floors
  const floor = (canvas, x0, x1, rep, color) => {
    const t = tex(canvas, true, (x1 - x0) / rep, 90 / rep);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 90), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, color }));
    m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0, -25); m.receiveShadow = true; sc.add(m);
  };
  floor(grassC, -60, 0, 2.2, '#ffffff');
  floor(padelC, 0, 60, 2.2, '#ffffff');
  // mowing stripes
  for (let i = 0; i < 12; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(60, 3.2), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.2 }));
    m.rotation.x = -Math.PI / 2; m.position.set(-30, 0.006, 8 - i * 6.4); sc.add(m);
  }
  // football: goal + box
  const gx = -8.5, gz = -15;
  const G = goal(); G.position.set(gx, 0, gz); sc.add(G);
  sc.add(line(60, 0.14, -30, gz));
  sc.add(line(18.3, 0.14, gx, gz + 5.5)); sc.add(line(0.14, 5.5, gx - 9.15, gz + 2.75)); sc.add(line(0.14, 5.5, gx + 9.15, gz + 2.75));
  sc.add(line(40.3, 0.14, gx, gz + 16.5)); sc.add(line(0.14, 16.5, gx - 20.15, gz + 8.25));
  const spotM = new THREE.Mesh(new THREE.CircleGeometry(0.16, 24), new THREE.MeshBasicMaterial({ color: '#f3f6f8' })); spotM.rotation.x = -Math.PI / 2; spotM.position.set(gx, 0.012, gz + 11); sc.add(spotM);
  // padel court: x 3.5..13.5, back wall z=-17
  const px = 8.5, pw = 10, pz = -17;
  sc.add(line(pw, 0.1, px, pz + 0.05)); sc.add(line(0.1, 30, px - pw / 2, pz + 15)); sc.add(line(0.1, 30, px + pw / 2, pz + 15));
  sc.add(line(pw, 0.1, px, pz + 3.05)); sc.add(line(0.1, 14, px, pz + 10));
  const glassM = new THREE.MeshPhysicalMaterial({ color: '#9fd0ff', transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0, envMapIntensity: 3, side: THREE.DoubleSide, depthWrite: false });
  const steel = new THREE.MeshPhysicalMaterial({ color: '#12151b', metalness: 0.9, roughness: 0.35 });
  const wall = (len, x, z, ry) => {
    const g = new THREE.Group();
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(len, 3), glassM); gl.position.y = 1.5; g.add(gl);
    const fen = netPlane(len, 1.1, 0.09, meshC, 0.7); fen.position.y = 3.55; g.add(fen);
    const n = Math.round(len / 2);
    for (let i = 0; i <= n; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.09, 4.1, 0.09), steel); p.position.set(-len / 2 + (len * i) / n, 2.05, 0); p.castShadow = true; g.add(p); }
    for (const y of [3.0, 4.1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(len, 0.07, 0.09), steel); b.position.y = y; g.add(b); }
    // glass streak highlights
    for (let i = 0; i < n; i++) {
      const hl = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 3.4), new THREE.MeshBasicMaterial({ color: '#dff0ff', transparent: true, opacity: 0.1, depthWrite: false }));
      hl.rotation.z = -0.35; hl.position.set(-len / 2 + (len * (i + 0.45)) / n, 1.5, 0.01); g.add(hl);
    }
    g.position.set(x, 0, z); g.rotation.y = ry; sc.add(g);
  };
  wall(pw, px, pz, 0);
  wall(6, px + pw / 2, pz + 3, Math.PI / 2);
  wall(6, px - pw / 2, pz + 3, Math.PI / 2);
  // padel net
  const n = netPlane(pw, 0.85, 0.06, netC, 0.75); n.position.set(px, 0.45, pz + 10); sc.add(n);
  const band = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.09, 0.04), whiteGloss()); band.position.set(px, 0.9, pz + 10); band.castShadow = true; sc.add(band);
  for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.05, 0.12), steel); p.position.set(px + sx * pw / 2, 0.52, pz + 10); p.castShadow = true; sc.add(p); }
  // stands with crowd bokeh
  const cc = mkCanvas(2048, 512), g = cc.getContext('2d');
  g.fillStyle = '#060a14'; g.fillRect(0, 0, 2048, 512);
  for (let r = 0; r < 26; r++) { g.fillStyle = 'rgba(40,55,80,0.35)'; g.fillRect(0, r * 20 + 4, 2048, 2); }
  const cols = ['#e2e8f0', '#94a3b8', '#ef4444', '#facc15', '#22c55e', '#3b82f6', '#f97316', '#64748b', '#ffffff'];
  for (let i = 0; i < 26000; i++) {
    g.globalAlpha = 0.12 + rnd() * 0.5; g.fillStyle = cols[Math.floor(rnd() * cols.length)];
    g.beginPath(); g.arc(rnd() * 2048, rnd() * 512, 1.5 + rnd() * 2.5, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
  { const tmp = mkCanvas(2048, 512); tmp.getContext('2d').drawImage(cc, 0, 0); g.filter = 'blur(1.6px)'; g.drawImage(tmp, 0, 0); g.filter = 'none'; }
  const sh = g.createLinearGradient(0, 0, 0, 512); sh.addColorStop(0, 'rgba(2,4,10,0.95)'); sh.addColorStop(0.35, 'rgba(2,4,10,0.25)'); sh.addColorStop(1, 'rgba(2,4,10,0.1)'); g.fillStyle = sh; g.fillRect(0, 0, 2048, 512);
  const st = new THREE.Mesh(new THREE.CylinderGeometry(62, 80, 15, 64, 1, true, Math.PI * 0.5, Math.PI), new THREE.MeshBasicMaterial({ map: tex(cc, true, 5, 1), side: THREE.BackSide, fog: false, color: '#7d879c' }));
  st.position.set(0, 7.5 + 1.5, 6); st.rotation.x = 0; sc.add(st);
  const board = new THREE.Mesh(new THREE.CylinderGeometry(61.8, 61.8, 1.6, 64, 1, true, Math.PI * 0.5, Math.PI), new THREE.MeshBasicMaterial({ color: '#0b1730', side: THREE.BackSide }));
  board.position.set(0, 0.8, 6); sc.add(board);
  // gold divider between the two sports
  const div = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 90), new THREE.MeshBasicMaterial({ color: '#ffd76a' })); div.rotation.x = -Math.PI / 2; div.position.set(0, 0.02, -25); sc.add(div);
  const cam = persp(38, [0, 2.6, 13], [0, 2.9, -12]);
  renderer.setPixelRatio(1); renderer.setSize(W * SS, H * SS, false); renderer.setClearColor(0x02040a, 1);
  cam.aspect = W / H; cam.updateProjectionMatrix();
  renderer.render(sc, cam);
  // 2D post: floodlight blooms, centre seam, vignette
  const out = mkCanvas(W, H), o = out.getContext('2d');
  o.drawImage(renderer.domElement, 0, 0, W, H);
  o.globalCompositeOperation = 'screen';
  const bloom = (x, y, r, col, a) => { const gr = o.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col.replace('A', a)); gr.addColorStop(0.2, col.replace('A', a * 0.45)); gr.addColorStop(1, col.replace('A', 0)); o.fillStyle = gr; o.fillRect(x - r, y - r, r * 2, r * 2); };
  for (const [x, c] of [[250, 'rgba(255,244,214,A)'], [1670, 'rgba(226,238,255,A)']]) {
    bloom(x, 105, 520, c, 0.6);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 9; k++) bloom(x - 120 + k * 30, 80 + r * 26, 26, 'rgba(255,255,255,A)', 0.95);
    const gr = o.createLinearGradient(x - 600, 0, x + 600, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, c.replace('A', 0.5)); gr.addColorStop(1, 'rgba(255,255,255,0)');
    o.fillStyle = gr; o.fillRect(x - 600, 103, 1200, 5);
  }
  // soft volumetric beams
  o.filter = 'blur(38px)';
  const beam2 = (x, x0, x1, c) => { const gr = o.createLinearGradient(0, 100, 0, 900); gr.addColorStop(0, c.replace('A', 0.3)); gr.addColorStop(1, c.replace('A', 0)); o.fillStyle = gr; o.beginPath(); o.moveTo(x - 110, 105); o.lineTo(x + 110, 105); o.lineTo(x1, 980); o.lineTo(x0, 980); o.closePath(); o.fill(); };
  beam2(250, 60, 820, 'rgba(255,244,214,A)'); beam2(1670, 1100, 1860, 'rgba(226,238,255,A)');
  o.filter = 'none';
  o.globalCompositeOperation = 'source-over';
  const fade = (y0, y1, a0, a1) => { const gr = o.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, `rgba(2,4,10,${a0})`); gr.addColorStop(1, `rgba(2,4,10,${a1})`); o.fillStyle = gr; o.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0)); };
  fade(820, 1080, 0, 0.8);
  const v = o.createRadialGradient(W / 2, H / 2, 420, W / 2, H / 2, 1150); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.78)');
  o.fillStyle = v; o.fillRect(0, 0, W, H);
  return out.toDataURL('image/jpeg', 0.86);
};

// plain textures reused by the 2D wheel face
A['tex-grass'] = () => grassC.toDataURL('image/jpeg', 0.9);
A['tex-padel'] = () => padelC.toDataURL('image/jpeg', 0.9);
A['tex-carbon'] = () => carbonC.toDataURL('image/png');

window.renderAsset = (name) => A[name]();
window.assetNames = Object.keys(A);
window.ready = true;
