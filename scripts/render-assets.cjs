/*
 * Pre-renders the heavy, "realistic" artwork of the roulette (background scene,
 * wheel face, sport icons) into plain images with headless Chromium.
 *
 * Why: SVG filters, noise textures and blurs look great but are slow to paint on
 * a Smart TV browser. Baking them into JPEG/PNG means the TV only has to show
 * images and rotate one of them with a CSS transform.
 *
 * Run:  node scripts/render-assets.cjs   (outputs to public/assets/)
 * The generated images are committed, so the GitHub build does not need this.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'public', 'assets');
fs.mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------------------
// Deterministic RNG so every render is identical
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

// ---------------------------------------------------------------------------
// Shared filters
const grainFilter = (id, freq = 0.9, alpha = 0.5) => `
  <filter id="${id}" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" seed="3" stitchTiles="stitch"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${alpha} 0"/>
  </filter>`;
const lightGrainFilter = (id, freq = 0.9, alpha = 0.35) => `
  <filter id="${id}" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="9" stitchTiles="stitch"/>
    <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 ${alpha} -0.18"/>
  </filter>`;

// ---------------------------------------------------------------------------
// FOOTBALL: real truncated icosahedron projected on a shaded sphere
function footballSVG(p, cx, cy, r) {
  const phi = (1 + Math.sqrt(5)) / 2;
  const V = [];
  for (const s1 of [-1, 1]) for (const s2 of [-1, 1]) {
    V.push([0, s1, s2 * phi], [s1, s2 * phi, 0], [s2 * phi, 0, s1]);
  }
  const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
  const sub = (a, b) => a.map((x, i) => x - b[i]);
  const add = (a, b) => a.map((x, i) => x + b[i]);
  const mul = (a, k) => a.map((x) => x * k);
  const dist = (a, b) => Math.hypot(...sub(a, b));
  // rotate to a pleasing orientation
  const rot = (v) => {
    let [x, y, z] = v;
    const a = 0.42, b = 0.33, c = 0.2;
    [y, z] = [y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
    [x, z] = [x * Math.cos(b) + z * Math.sin(b), -x * Math.sin(b) + z * Math.cos(b)];
    [x, y] = [x * Math.cos(c) - y * Math.sin(c), x * Math.sin(c) + y * Math.cos(c)];
    return [x, y, z];
  };
  const verts = V.map(rot);
  // icosahedron edge length is 2 for these coordinates
  const nb = verts.map((a) => verts.filter((b) => b !== a && Math.abs(dist(a, b) - 2) < 0.01));
  const proj = (v) => {
    const n = norm(v);
    let [x, y, z] = n;
    if (z < 0) { const l = Math.hypot(x, y) || 1; x /= l; y /= l; }
    return [cx + x * r, cy - y * r, z];
  };
  const arc = (a, b, steps = 10) => {
    const pts = [];
    for (let i = 0; i <= steps; i++) pts.push(proj(add(a, mul(sub(b, a), i / steps))));
    return pts;
  };
  let pent = '';
  let seams = '';
  const seen = new Set();
  verts.forEach((a, ai) => {
    const ring = nb[ai].map((n) => add(a, mul(sub(n, a), 1 / 3)));
    // order around a
    const an = norm(a);
    const ref = norm(sub(ring[0], mul(an, 1)));
    const ref2 = [an[1] * ref[2] - an[2] * ref[1], an[2] * ref[0] - an[0] * ref[2], an[0] * ref[1] - an[1] * ref[0]];
    ring.sort((u, v) => {
      const du = sub(u, a), dv = sub(v, a);
      const dot = (q, w) => q[0] * w[0] + q[1] * w[1] + q[2] * w[2];
      return Math.atan2(dot(du, ref2), dot(du, ref)) - Math.atan2(dot(dv, ref2), dot(dv, ref));
    });
    if (norm(a)[2] > -0.35) {
      let d = '';
      ring.forEach((q, i) => {
        const pts = arc(q, ring[(i + 1) % 5], 6);
        pts.forEach(([x, y], j) => { d += `${i === 0 && j === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)} `; });
      });
      pent += `<path d="${d}Z" fill="url(#${p}pg)"/>`;
    }
    // hexagon seams: edges between consecutive truncation points belonging to different pentagons
    nb[ai].forEach((n) => {
      const ni = verts.indexOf(n);
      const key = [Math.min(ai, ni), Math.max(ai, ni)].join('-');
      if (seen.has(key)) return;
      seen.add(key);
      const q1 = add(a, mul(sub(n, a), 1 / 3));
      const q2 = add(a, mul(sub(n, a), 2 / 3));
      const pts = arc(q1, q2, 8).filter((t) => t[2] > -0.05);
      if (pts.length > 1) seams += `<polyline points="${pts.map((t) => t[0].toFixed(2) + ',' + t[1].toFixed(2)).join(' ')}"/>`;
    });
    // pentagon outline seams
    ring.forEach((q, i) => {
      const pts = arc(q, ring[(i + 1) % 5], 6).filter((t) => t[2] > -0.05);
      if (pts.length > 1) seams += `<polyline points="${pts.map((t) => t[0].toFixed(2) + ',' + t[1].toFixed(2)).join(' ')}"/>`;
    });
  });
  return `
  <defs>
    <radialGradient id="${p}base" cx="36%" cy="30%" r="78%">
      <stop offset="0" stop-color="#ffffff"/><stop offset="0.45" stop-color="#eef0f2"/>
      <stop offset="0.78" stop-color="#b9c0c8"/><stop offset="1" stop-color="#6c747e"/>
    </radialGradient>
    <radialGradient id="${p}pg" cx="36%" cy="30%" r="90%" gradientUnits="userSpaceOnUse" fx="${cx - r * 0.3}" fy="${cy - r * 0.4}" >
      <stop offset="0" stop-color="#3b4048"/><stop offset="0.5" stop-color="#16191e"/><stop offset="1" stop-color="#030405"/>
    </radialGradient>
    <radialGradient id="${p}shade" cx="40%" cy="34%" r="66%">
      <stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/>
    </radialGradient>
    <radialGradient id="${p}spec" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#fff" stop-opacity="0.95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="${p}clip"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
    ${grainFilter(p + 'grain', 1.4, 0.18)}
    <filter id="${p}soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${r * 0.06}"/></filter>
    <filter id="${p}sblur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${r * 0.008}"/></filter>
  </defs>
  <ellipse cx="${cx + r * 0.08}" cy="${cy + r * 0.97}" rx="${r * 0.85}" ry="${r * 0.16}" fill="#000" opacity="0.45" filter="url(#${p}soft)"/>
  <g clip-path="url(#${p}clip)">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${p}base)"/>
    <g filter="url(#${p}sblur)">${pent}</g>
    <g fill="none" stroke="#5b636d" stroke-opacity="0.7" stroke-width="${r * 0.012}" stroke-linecap="round">${seams}</g>
    <rect x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" filter="url(#${p}grain)"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${p}shade)"/>
    <ellipse cx="${cx - r * 0.34}" cy="${cy - r * 0.42}" rx="${r * 0.3}" ry="${r * 0.18}" transform="rotate(-35 ${cx - r * 0.34} ${cy - r * 0.42})" fill="url(#${p}spec)" opacity="0.85"/>
    <circle cx="${cx}" cy="${cy}" r="${r - 1}" fill="none" stroke="#000" stroke-opacity="0.25" stroke-width="2"/>
  </g>`;
}

// ---------------------------------------------------------------------------
// PADEL BALL: fuzzy felt with seam
function padelBallSVG(p, cx, cy, r, rotDeg = -20) {
  return `
  <defs>
    <radialGradient id="${p}pb" cx="36%" cy="30%" r="80%">
      <stop offset="0" stop-color="#f7ff8a"/><stop offset="0.35" stop-color="#e3f52c"/>
      <stop offset="0.78" stop-color="#b9d61a"/><stop offset="1" stop-color="#6b820a"/>
    </radialGradient>
    <radialGradient id="${p}pbs" cx="40%" cy="34%" r="66%">
      <stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#1a2200" stop-opacity="0.6"/>
    </radialGradient>
    <radialGradient id="${p}pbspec" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#fff" stop-opacity="0.7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <filter id="${p}fuzz" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="${(2.2 * 90) / r / 2}" numOctaves="2" seed="4"/>
      <feDisplacementMap in="SourceGraphic" scale="${r * 0.05}" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    ${lightGrainFilter(p + 'felt', 1.6, 0.5)}
    ${grainFilter(p + 'feltd', 1.1, 0.16)}
    <clipPath id="${p}pclip"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
    <filter id="${p}soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${r * 0.07}"/></filter>
  </defs>
  <ellipse cx="${cx + r * 0.08}" cy="${cy + r * 0.97}" rx="${r * 0.82}" ry="${r * 0.15}" fill="#000" opacity="0.45" filter="url(#${p}soft)"/>
  <g filter="url(#${p}fuzz)">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${p}pb)"/>
    <g clip-path="url(#${p}pclip)">
      <rect x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" filter="url(#${p}feltd)"/>
      <rect x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" filter="url(#${p}felt)" opacity="0.5"/>
      <g transform="rotate(${rotDeg} ${cx} ${cy})" fill="none" stroke-linecap="round">
        <path d="M${cx - r * 0.98} ${cy - r * 0.42} C${cx - r * 0.35} ${cy - r * 0.25} ${cx - r * 0.35} ${cy + r * 0.25} ${cx - r * 0.98} ${cy + r * 0.42}" stroke="#f5f7e8" stroke-width="${r * 0.1}"/>
        <path d="M${cx + r * 0.98} ${cy - r * 0.42} C${cx + r * 0.35} ${cy - r * 0.25} ${cx + r * 0.35} ${cy + r * 0.25} ${cx + r * 0.98} ${cy + r * 0.42}" stroke="#f5f7e8" stroke-width="${r * 0.1}"/>
      </g>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${p}pbs)"/>
      <ellipse cx="${cx - r * 0.34}" cy="${cy - r * 0.4}" rx="${r * 0.32}" ry="${r * 0.2}" transform="rotate(-35 ${cx - r * 0.34} ${cy - r * 0.4})" fill="url(#${p}pbspec)"/>
    </g>
  </g>`;
}

// ---------------------------------------------------------------------------
// PADEL RACKET (drawn upright in a 200x300 box, head on top)
function racketSVG(p, accent = '#c6f432', accent2 = '#ffffff') {
  const head = 'M100 10 C152 10 176 48 176 96 C176 142 150 178 116 188 L104 206 L96 206 L84 188 C50 178 24 142 24 96 C24 48 48 10 100 10 Z';
  const face = 'M100 24 C143 24 162 56 162 96 C162 134 140 164 100 172 C60 164 38 134 38 96 C38 56 57 24 100 24 Z';
  let holes = '';
  for (let row = 0; row < 11; row++) {
    for (let col = -6; col <= 6; col++) {
      const x = 100 + col * 12.5 + (row % 2 ? 6.25 : 0);
      const y = 42 + row * 11.5;
      const dx = (x - 100) / 50, dy = (y - 98) / 58;
      if (dx * dx + dy * dy > 0.95) continue;
      if (Math.abs(x - 100) < 4 && row > 8) continue;
      holes += `<circle cx="${x}" cy="${y}" r="3.6" fill="url(#${p}hole)"/><path d="M${x - 2.6} ${y + 1.6} A3.2 3.2 0 0 0 ${x + 2.6} ${y + 1.6}" stroke="#fff" stroke-opacity="0.35" stroke-width="0.9" fill="none"/>`;
    }
  }
  return `
  <defs>
    <pattern id="${p}carbon" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="6" height="6" fill="#1a1d22"/>
      <rect width="3" height="3" fill="#2b3038"/><rect x="3" y="3" width="3" height="3" fill="#2b3038"/>
      <rect width="3" height="1" fill="#3a404a" opacity="0.6"/><rect x="3" y="3" width="1" height="3" fill="#3a404a" opacity="0.6"/>
    </pattern>
    <linearGradient id="${p}frame" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4a505a"/><stop offset="0.3" stop-color="#0d0f12"/>
      <stop offset="0.55" stop-color="#2a2f36"/><stop offset="1" stop-color="#050607"/>
    </linearGradient>
    <linearGradient id="${p}swoosh" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="${accent}" stop-opacity="0.55"/>
    </linearGradient>
    <radialGradient id="${p}hole" cx="45%" cy="40%" r="60%">
      <stop offset="0" stop-color="#000"/><stop offset="0.8" stop-color="#050505"/><stop offset="1" stop-color="#3b3f46"/>
    </radialGradient>
    <radialGradient id="${p}gloss" cx="30%" cy="22%" r="60%">
      <stop offset="0" stop-color="#fff" stop-opacity="0.38"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${p}grip" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0b0c0e"/><stop offset="0.35" stop-color="#4a4f57"/>
      <stop offset="0.55" stop-color="#25282d"/><stop offset="1" stop-color="#060708"/>
    </linearGradient>
    <pattern id="${p}wrap" width="26" height="10" patternUnits="userSpaceOnUse" patternTransform="skewY(-22)">
      <rect width="26" height="10" fill="none"/><rect y="8.6" width="26" height="1.4" fill="#000" opacity="0.55"/>
    </pattern>
    <clipPath id="${p}fclip"><path d="${face}"/></clipPath>
    <filter id="${p}sh" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>
  <path d="${head}" transform="translate(6 8)" fill="#000" opacity="0.45" filter="url(#${p}sh)"/>
  <rect x="93" y="200" width="20" height="96" rx="7" transform="translate(5 6)" fill="#000" opacity="0.4" filter="url(#${p}sh)"/>
  <!-- throat -->
  <path d="M84 186 L100 214 L116 186" fill="none" stroke="url(#${p}frame)" stroke-width="9" stroke-linejoin="round"/>
  <path d="M90 186 L100 204 L110 186 Z" fill="#000" opacity="0.0"/>
  <!-- handle -->
  <rect x="88" y="206" width="24" height="88" rx="8" fill="url(#${p}grip)"/>
  <rect x="88" y="206" width="24" height="88" rx="8" fill="url(#${p}wrap)"/>
  <rect x="86" y="284" width="28" height="12" rx="5" fill="#111" stroke="${accent}" stroke-width="2"/>
  <rect x="88" y="206" width="24" height="8" fill="${accent}"/>
  <!-- head -->
  <path d="${head}" fill="url(#${p}frame)"/>
  <path d="${face}" fill="url(#${p}carbon)"/>
  <g clip-path="url(#${p}fclip)">
    <path d="M30 150 C70 120 120 130 170 60 L175 95 C130 150 80 150 30 178 Z" fill="url(#${p}swoosh)" opacity="0.9"/>
    <path d="M30 140 C80 108 120 116 168 48 L170 56 C122 124 82 118 30 150 Z" fill="${accent2}" opacity="0.85"/>
    ${holes}
    <path d="${face}" fill="url(#${p}gloss)"/>
  </g>
  <path d="${face}" fill="none" stroke="#000" stroke-opacity="0.6" stroke-width="2"/>
  <path d="M100 13 C150 13 173 50 173 96" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="2"/>
  <path d="M60 22 C70 16 85 13 100 13" fill="none" stroke="${accent}" stroke-width="3"/>`;
}

// ---------------------------------------------------------------------------
// GRASS + GOAL icon (240x200)
function goalIconSVG(p) {
  return `
  <defs>
    <pattern id="${p}net" width="9" height="9" patternUnits="userSpaceOnUse">
      <path d="M0 0 L9 9 M9 0 L0 9" stroke="#fff" stroke-width="0.9" stroke-opacity="0.75"/>
    </pattern>
    <pattern id="${p}netS" width="7" height="9" patternUnits="userSpaceOnUse" patternTransform="skewY(-25)">
      <path d="M0 0 L7 9 M7 0 L0 9" stroke="#fff" stroke-width="0.8" stroke-opacity="0.6"/>
    </pattern>
    <linearGradient id="${p}post" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#9aa3ad"/><stop offset="0.4" stop-color="#ffffff"/><stop offset="1" stop-color="#7d8792"/>
    </linearGradient>
    <linearGradient id="${p}bar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/><stop offset="0.6" stop-color="#e2e6ea"/><stop offset="1" stop-color="#8b949e"/>
    </linearGradient>
    <radialGradient id="${p}grass" cx="50%" cy="20%" r="80%">
      <stop offset="0" stop-color="#4fb04a"/><stop offset="1" stop-color="#1d6a24"/>
    </radialGradient>
    ${grainFilter(p + 'g', 1.2, 0.45)}
    <filter id="${p}b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>
    <clipPath id="${p}gc"><ellipse cx="120" cy="170" rx="118" ry="26"/></clipPath>
  </defs>
  <ellipse cx="120" cy="170" rx="118" ry="26" fill="url(#${p}grass)"/>
  <g clip-path="url(#${p}gc)">
    <rect x="0" y="140" width="240" height="60" filter="url(#${p}g)"/>
    <path d="M10 160 L230 160" stroke="#fff" stroke-width="3" opacity="0.85"/>
  </g>
  <!-- net box -->
  <path d="M40 40 L64 20 L184 20 L208 40 Z" fill="url(#${p}net)"/>
  <path d="M64 20 L64 140 L40 160 L40 40 Z" fill="url(#${p}netS)"/>
  <path d="M184 20 L184 140 L208 160 L208 40 Z" fill="url(#${p}netS)"/>
  <rect x="64" y="20" width="120" height="120" fill="#0b1a10" opacity="0.35"/>
  <rect x="64" y="20" width="120" height="120" fill="url(#${p}net)"/>
  <path d="M64 140 L184 140 M64 20 L64 140 M184 20 L184 140 M64 20 L184 20" stroke="#cfd6dc" stroke-width="2"/>
  <ellipse cx="124" cy="160" rx="96" ry="6" fill="#000" opacity="0.4" filter="url(#${p}b)"/>
  <!-- frame -->
  <rect x="34" y="34" width="9" height="128" rx="2" fill="url(#${p}post)"/>
  <rect x="205" y="34" width="9" height="128" rx="2" fill="url(#${p}post)"/>
  <rect x="34" y="32" width="180" height="9" rx="3" fill="url(#${p}bar)"/>
  ${footballSVG(p + 'fb', 150, 142, 17)}`;
}

// CORNER FLAG icon (200x220)
function cornerIconSVG(p) {
  return `
  <defs>
    <linearGradient id="${p}pole" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#a7b0b9"/><stop offset="0.45" stop-color="#fff"/><stop offset="1" stop-color="#7a848f"/>
    </linearGradient>
    <linearGradient id="${p}flag" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#b91c1c"/><stop offset="0.3" stop-color="#ef4444"/><stop offset="0.55" stop-color="#991b1b"/>
      <stop offset="0.8" stop-color="#f87171"/><stop offset="1" stop-color="#b91c1c"/>
    </linearGradient>
    <linearGradient id="${p}flag2" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ca8a04"/><stop offset="0.3" stop-color="#fde047"/><stop offset="0.55" stop-color="#a16207"/>
      <stop offset="0.8" stop-color="#fde047"/><stop offset="1" stop-color="#ca8a04"/>
    </linearGradient>
    <radialGradient id="${p}grass" cx="50%" cy="25%" r="80%"><stop offset="0" stop-color="#4fb04a"/><stop offset="1" stop-color="#1d6a24"/></radialGradient>
    ${grainFilter(p + 'g', 1.2, 0.45)}
    <clipPath id="${p}gc"><ellipse cx="100" cy="190" rx="98" ry="26"/></clipPath>
    <filter id="${p}b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>
  </defs>
  <ellipse cx="100" cy="190" rx="98" ry="26" fill="url(#${p}grass)"/>
  <g clip-path="url(#${p}gc)">
    <rect x="0" y="160" width="200" height="60" filter="url(#${p}g)"/>
    <path d="M40 200 Q60 178 100 176 Q140 178 160 200" fill="none" stroke="#fff" stroke-width="3" opacity="0.85"/>
  </g>
  <ellipse cx="66" cy="186" rx="22" ry="4" fill="#000" opacity="0.4" filter="url(#${p}b)"/>
  <rect x="56" y="20" width="7" height="166" rx="3" fill="url(#${p}pole)"/>
  <path d="M63 24 C90 16 112 34 150 24 L150 64 C112 74 90 56 63 64 Z" fill="url(#${p}flag)"/>
  <path d="M63 24 C76 20 88 22 100 26 L100 46 C88 42 76 41 63 44 Z" fill="url(#${p}flag2)"/>
  <path d="M100 46 C112 50 128 52 150 44 L150 64 C128 72 112 70 100 66 Z" fill="url(#${p}flag2)"/>
  <path d="M63 24 C90 16 112 34 150 24 L150 64 C112 74 90 56 63 64 Z" fill="none" stroke="#000" stroke-opacity="0.3"/>
  ${footballSVG(p + 'fb', 128, 166, 22)}`;
}

// CROSSED RACKETS + BALL icon (260x260)
function crossedIconSVG(p) {
  return `
  <defs>
    <radialGradient id="${p}glow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#fde047" stop-opacity="0.75"/><stop offset="1" stop-color="#fde047" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="130" cy="120" r="125" fill="url(#${p}glow)"/>
  <g transform="translate(130 128) rotate(-32) scale(0.72) translate(-100 -150)">${racketSVG(p + 'a', '#c6f432')}</g>
  <g transform="translate(130 128) rotate(32) scale(0.72) translate(-100 -150)">${racketSVG(p + 'b', '#38bdf8')}</g>
  ${padelBallSVG(p + 'pb', 130, 192, 34)}
  ${[[40, 40, 9], [222, 52, 7], [214, 210, 6], [36, 196, 7]].map(([x, y, s]) => `<path d="M${x} ${y - s * 2} L${x + s * 0.5} ${y - s * 0.5} L${x + s * 2} ${y} L${x + s * 0.5} ${y + s * 0.5} L${x} ${y + s * 2} L${x - s * 0.5} ${y + s * 0.5} L${x - s * 2} ${y} L${x - s * 0.5} ${y - s * 0.5} Z" fill="#fff"/>`).join('')}`;
}

// RACKET + BALL icon (220x260)
function racketBallIconSVG(p, accent) {
  return `
  <g transform="translate(110 120) rotate(-28) scale(0.78) translate(-100 -150)">${racketSVG(p + 'r', accent)}</g>
  ${padelBallSVG(p + 'pb', 168, 212, 28)}`;
}

// PADEL NET with ball (240x180)
function padelNetIconSVG(p) {
  return `
  <defs>
    <pattern id="${p}mesh" width="7" height="7" patternUnits="userSpaceOnUse">
      <rect width="7" height="7" fill="none"/><path d="M0 0 H7 M0 0 V7" stroke="#d6dbe0" stroke-width="0.8" stroke-opacity="0.75"/>
    </pattern>
    <linearGradient id="${p}post" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#111"/><stop offset="0.45" stop-color="#555b63"/><stop offset="1" stop-color="#0a0a0a"/>
    </linearGradient>
    <radialGradient id="${p}floor" cx="50%" cy="25%" r="80%"><stop offset="0" stop-color="#2f7ae0"/><stop offset="1" stop-color="#0f3b86"/></radialGradient>
    ${grainFilter(p + 'g', 1.3, 0.4)}
    <clipPath id="${p}fc"><ellipse cx="120" cy="160" rx="118" ry="22"/></clipPath>
    <filter id="${p}b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>
  </defs>
  <ellipse cx="120" cy="160" rx="118" ry="22" fill="url(#${p}floor)"/>
  <g clip-path="url(#${p}fc)"><rect x="0" y="130" width="240" height="60" filter="url(#${p}g)"/>
    <path d="M0 162 L240 162" stroke="#fff" stroke-width="3" opacity="0.85"/></g>
  <ellipse cx="120" cy="158" rx="100" ry="5" fill="#000" opacity="0.45" filter="url(#${p}b)"/>
  <rect x="24" y="86" width="192" height="70" fill="#0b1220" opacity="0.25"/>
  <rect x="24" y="86" width="192" height="70" fill="url(#${p}mesh)"/>
  <rect x="24" y="80" width="192" height="9" fill="#f8fafc"/>
  <rect x="24" y="86" width="192" height="3" fill="#000" opacity="0.2"/>
  <rect x="14" y="70" width="12" height="90" rx="2" fill="url(#${p}post)"/>
  <rect x="214" y="70" width="12" height="90" rx="2" fill="url(#${p}post)"/>
  ${padelBallSVG(p + 'pb', 150, 124, 20)}`;
}

// ---------------------------------------------------------------------------
// WHEEL FACE (rendered at 1100x1100, viewBox -550..550). Slice i is centred at
// i*30+15 degrees clockwise from the top (same maths as the app).
const SLICES = [
  { kind: 'futebol', label: ['GOLO'], award: '3 FINOS', icon: 'ball' },
  { kind: 'lose', ghost: 'padelball' },
  { kind: 'padel', label: ['SMASH'], award: '3 FINOS', icon: 'racket' },
  { kind: 'lose', ghost: 'football' },
  { kind: 'futebol', label: ['PENÁLTI'], award: '1 FINO', icon: 'goal' },
  { kind: 'lose', ghost: 'padelball' },
  { kind: 'padel', label: ['PONTO', 'DE OURO'], award: 'RÉGUA', icon: 'crossed', gold: true },
  { kind: 'lose', ghost: 'football' },
  { kind: 'futebol', label: ['CANTO'], award: '3 FINOS', icon: 'corner' },
  { kind: 'lose', ghost: 'padelball' },
  { kind: 'padel', label: ['BANDEJA'], award: '1 FINO', icon: 'racketball' },
  { kind: 'lose', ghost: 'football' },
];

function wheelSVG() {
  const R = 540;
  const seg = 30;
  const rad = (d) => (d * Math.PI) / 180;
  const slicePath = (r0, r1) => {
    const a0 = rad(-seg / 2), a1 = rad(seg / 2);
    const P = (r, a) => `${(r * Math.sin(a)).toFixed(2)} ${(-r * Math.cos(a)).toFixed(2)}`;
    return `M${P(r0, a0)} L${P(r1, a0)} A${r1} ${r1} 0 0 1 ${P(r1, a1)} L${P(r0, a1)} A${r0} ${r0} 0 0 0 ${P(r0, a0)} Z`;
  };
  const sp = slicePath(0, R);
  const iconAt = (s, i) => {
    const p = `w${i}`;
    switch (s.icon) {
      case 'ball': return `<g transform="translate(0 -405)">${footballSVG(p, 0, 0, 62)}</g>`;
      case 'racket': return `<g transform="translate(0 -405) rotate(-18) scale(0.52) translate(-100 -150)">${racketSVG(p, '#c6f432')}</g>`;
      case 'goal': return `<g transform="translate(0 -400) scale(0.7) translate(-124 -100)">${goalIconSVG(p)}</g>`;
      case 'crossed': return `<g transform="translate(0 -405) scale(0.62) translate(-130 -130)">${crossedIconSVG(p)}</g>`;
      case 'corner': return `<g transform="translate(0 -400) scale(0.7) translate(-100 -115)">${cornerIconSVG(p)}</g>`;
      case 'racketball': return `<g transform="translate(0 -400) scale(0.6) translate(-110 -140)">${racketBallIconSVG(p, '#f472b6')}</g>`;
    }
    return '';
  };
  let slices = '';
  SLICES.forEach((s, i) => {
    const ang = i * seg + seg / 2;
    let body = '';
    if (s.kind === 'futebol') {
      body = `
        <path d="${sp}" fill="url(#grassBase)"/>
        <path d="${sp}" fill="url(#mow)"/>
        <path d="${sp}" filter="url(#turfNoise)" opacity="0.9"/>
        <path d="${slicePath(500, 504)}" fill="#fff" opacity="0.8"/>
        <path d="M-60 -195 A 95 95 0 0 1 60 -195" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="4"/>`;
    } else if (s.kind === 'padel') {
      body = `
        <path d="${sp}" fill="url(${s.gold ? '#padelGold' : '#padelBase'})"/>
        <path d="${sp}" filter="url(#turfNoiseFine)" opacity="0.9"/>
        <path d="${slicePath(500, 504)}" fill="#fff" opacity="0.8"/>
        <path d="M0 -150 L0 -235" stroke="#fff" stroke-opacity="0.6" stroke-width="4"/>`;
    } else {
      body = `
        <path d="${sp}" fill="url(#loseBase)"/>
        <path d="${sp}" fill="url(#netMesh)"/>
        <path d="${sp}" filter="url(#turfNoise)" opacity="0.6"/>
        <g opacity="0.28">${s.ghost === 'football' ? footballSVG('g' + i, 0, -405, 48) : padelBallSVG('g' + i, 0, -405, 44)}</g>
        <text y="-300" class="lt">TENTA</text>
        <text y="-258" class="lt2">OUTRA VEZ</text>`;
    }
    let text = '';
    if (s.label) {
      const lines = s.label;
      const fs = lines.length > 1 ? 44 : (lines[0].length > 6 ? 52 : 60);
      const y0 = lines.length > 1 ? -312 : -292;
      text = lines.map((l, k) => `<text y="${y0 + k * 44}" class="wt" font-size="${fs}">${l}</text>`).join('') +
        `<text y="${lines.length > 1 ? -218 : -236}" class="aw${s.gold ? ' gold' : ''}">${s.award}</text>`;
    }
    slices += `<g transform="rotate(${ang})">${body}${s.kind !== 'lose' ? iconAt(s, i) : ''}${text}</g>`;
  });
  // separators
  let seps = '';
  for (let i = 0; i < 12; i++) seps += `<g transform="rotate(${i * seg})"><rect x="-3.5" y="-${R}" width="7" height="${R - 70}" fill="url(#sep)"/></g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-550 -550 1100 1100" width="1100" height="1100">
  <defs>
    <style>
      .wt{font-family:'Bebas Neue';fill:#fff;text-anchor:middle;letter-spacing:2px;paint-order:stroke;stroke:#000;stroke-opacity:.55;stroke-width:6px}
      .aw{font-family:'Oswald';font-weight:700;font-size:34px;fill:#fde68a;text-anchor:middle;letter-spacing:1px;paint-order:stroke;stroke:#000;stroke-opacity:.6;stroke-width:6px}
      .aw.gold{fill:#fde047;font-size:40px}
      .lt{font-family:'Bebas Neue';font-size:50px;fill:#e2e8f0;text-anchor:middle;letter-spacing:3px}
      .lt2{font-family:'Oswald';font-weight:700;font-size:28px;fill:#94a3b8;text-anchor:middle;letter-spacing:2px}
    </style>
    <radialGradient id="grassBase" cx="0" cy="0" r="540" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#145a1c"/><stop offset="0.55" stop-color="#2a8a2e"/><stop offset="1" stop-color="#1f7425"/>
    </radialGradient>
    <radialGradient id="mow" cx="0" cy="0" r="540" gradientUnits="userSpaceOnUse" spreadMethod="repeat">
      <stop offset="0" stop-color="#fff" stop-opacity="0.07"/><stop offset="0.0999" stop-color="#fff" stop-opacity="0.07"/>
      <stop offset="0.1" stop-color="#000" stop-opacity="0.08"/><stop offset="0.2" stop-color="#000" stop-opacity="0.08"/>
    </radialGradient>
    <radialGradient id="padelBase" cx="0" cy="0" r="540" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0c2f73"/><stop offset="0.6" stop-color="#1e5fc8"/><stop offset="1" stop-color="#1a50aa"/>
    </radialGradient>
    <radialGradient id="padelGold" cx="0" cy="0" r="540" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#5a3a00"/><stop offset="0.55" stop-color="#c58a06"/><stop offset="0.85" stop-color="#f5c542"/><stop offset="1" stop-color="#b47b04"/>
    </radialGradient>
    <radialGradient id="loseBase" cx="0" cy="0" r="540" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#05070c"/><stop offset="0.6" stop-color="#121a28"/><stop offset="1" stop-color="#0c121d"/>
    </radialGradient>
    <pattern id="netMesh" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <path d="M0 0 H22 M0 0 V22" stroke="#cbd5e1" stroke-opacity="0.13" stroke-width="2"/>
    </pattern>
    <linearGradient id="sep" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#7a5a10"/><stop offset="0.5" stop-color="#fff2b0"/><stop offset="1" stop-color="#7a5a10"/>
    </linearGradient>
    <filter id="turfNoise" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.55 0.9" numOctaves="3" seed="11"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0.05  0 0 0 0 0  0 0 0 0.75 -0.25"/>
      <feComposite in2="SourceAlpha" operator="in"/>
    </filter>
    <filter id="turfNoiseFine" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="2" seed="5"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.85  0 0 0 0 0.9  0 0 0 0 1  0 0 0 0.6 -0.22"/>
      <feComposite in2="SourceAlpha" operator="in"/>
    </filter>
    <radialGradient id="dish" cx="0" cy="0" r="540" gradientUnits="userSpaceOnUse">
      <stop offset="0.15" stop-color="#000" stop-opacity="0.45"/><stop offset="0.35" stop-color="#000" stop-opacity="0"/>
      <stop offset="0.86" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.45"/>
    </radialGradient>
    <radialGradient id="hubRing" cx="0" cy="0" r="80" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#2b2f36"/><stop offset="0.8" stop-color="#0b0d10"/><stop offset="1" stop-color="#3f454e"/>
    </radialGradient>
  </defs>
  <rect x="-550" y="-550" width="1100" height="1100" fill="#05070c"/>
  <circle r="${R}" fill="#0c121d"/>
  ${slices}
  ${seps}
  <circle r="${R}" fill="url(#dish)"/>
  <circle r="78" fill="url(#hubRing)"/>
  ${Array.from({ length: 12 }, (_, i) => { const a = rad(i * 30); return `<circle cx="${(70 * Math.sin(a)).toFixed(1)}" cy="${(-70 * Math.cos(a)).toFixed(1)}" r="4" fill="#d4af37"/>`; }).join('')}
</svg>`;
}

// ---------------------------------------------------------------------------
// BACKGROUND SCENE 1920x1080: football pitch on the left, padel court on the right
function sceneSVG() {
  const W = 1920, H = 1080, HZ = 560;
  // crowd dots
  let crowd = '';
  const crowdCols = ['#e2e8f0', '#94a3b8', '#ef4444', '#facc15', '#22c55e', '#3b82f6', '#f97316', '#64748b', '#1e293b', '#334155'];
  for (let i = 0; i < 5200; i++) {
    const x = rnd() * W;
    const y = 250 + Math.pow(rnd(), 0.8) * (HZ - 250 - 30);
    const r = 1.2 + rnd() * 2.2 * ((y - 230) / 330 + 0.4);
    crowd += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${crowdCols[Math.floor(rnd() * crowdCols.length)]}" opacity="${(0.25 + rnd() * 0.5).toFixed(2)}"/>`;
  }
  let bokeh = '';
  for (let i = 0; i < 60; i++) {
    const x = rnd() * W, y = 180 + rnd() * 330, r = 6 + rnd() * 22;
    bokeh += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(0)}" fill="${rnd() > 0.5 ? '#fff6d5' : '#cfe3ff'}" opacity="${(0.05 + rnd() * 0.18).toFixed(2)}"/>`;
  }
  const lamps = (x0, y0) => {
    let s = `<rect x="${x0 - 12}" y="${y0 - 12}" width="284" height="104" rx="8" fill="#141922"/>`;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 11; c++) s += `<circle cx="${x0 + c * 24 + 10}" cy="${y0 + r * 22 + 10}" r="8.5" fill="#fffef5"/>`;
    return s;
  };
  // football pitch stripes (horizontal, perspective)
  let stripes = '';
  const N = 12;
  for (let k = 0; k < N; k++) {
    const y0 = HZ + (H - HZ) * Math.pow(k / N, 1.6);
    const y1 = HZ + (H - HZ) * Math.pow((k + 1) / N, 1.6);
    stripes += `<rect x="0" y="${y0.toFixed(1)}" width="${W}" height="${(y1 - y0 + 0.5).toFixed(1)}" fill="${k % 2 ? '#2f8f2c' : '#277c26'}"/>`;
  }
  // padel court perspective helpers (VP at 1480, 360)
  const VPX = 1480, VPY = 300;
  const toward = (x, y, t) => [VPX + (x - VPX) * t, VPY + (y - VPY) * t];
  const backY = 640; // back wall base line
  const tBack = (backY - VPY) / (H + 200 - VPY);
  const courtL = 760, courtR = 2200; // at bottom y = H+200
  const bl = toward(courtL, H + 200, tBack), br = toward(courtR, H + 200, tBack);
  const netT = 0.64;
  const nl = toward(courtL, H + 200, netT), nr = toward(courtR, H + 200, netT);
  const svcT = 0.45;
  const sl = toward(courtL, H + 200, svcT), sr = toward(courtR, H + 200, svcT);
  const glassTop = 470;
  let glassPanels = '';
  const panels = 6;
  for (let i = 0; i < panels; i++) {
    const x0 = bl[0] + ((br[0] - bl[0]) * i) / panels;
    const x1 = bl[0] + ((br[0] - bl[0]) * (i + 1)) / panels;
    glassPanels += `<rect x="${x0.toFixed(1)}" y="${glassTop}" width="${(x1 - x0).toFixed(1)}" height="${backY - glassTop}" fill="url(#glass)"/>
      <path d="M${(x0 + 14).toFixed(1)} ${backY - 10} L${(x0 + 60).toFixed(1)} ${glassTop + 8}" stroke="#fff" stroke-opacity="0.18" stroke-width="10"/>
      <path d="M${(x0 + 40).toFixed(1)} ${backY - 10} L${(x0 + 74).toFixed(1)} ${glassTop + 8}" stroke="#fff" stroke-opacity="0.1" stroke-width="4"/>
      <line x1="${x1.toFixed(1)}" y1="${glassTop}" x2="${x1.toFixed(1)}" y2="${backY}" stroke="#0b0f16" stroke-width="5"/>`;
  }
  // side glass (right) in perspective
  const sideTopNear = [courtR + 40, 260];
  // football goal on the left (front view in the distance)
  const gx = 330, gy = 655, gw = 380, gh = 125, gd = 46;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#01030a"/><stop offset="0.35" stop-color="#07142b"/><stop offset="0.55" stop-color="#0c2142"/>
    </linearGradient>
    <radialGradient id="flood" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#fffbe6" stop-opacity="0.75"/><stop offset="0.25" stop-color="#fff3c4" stop-opacity="0.25"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="standShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#050913" stop-opacity="0.85"/><stop offset="0.7" stop-color="#0a1426" stop-opacity="0.35"/><stop offset="1" stop-color="#050913" stop-opacity="0.8"/>
    </linearGradient>
    <linearGradient id="padelFloor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1b4fa6"/><stop offset="1" stop-color="#2468d1"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#bfe3ff" stop-opacity="0.22"/><stop offset="0.5" stop-color="#7cb6e8" stop-opacity="0.08"/><stop offset="1" stop-color="#bfe3ff" stop-opacity="0.16"/>
    </linearGradient>
    <pattern id="fence" width="14" height="14" patternUnits="userSpaceOnUse">
      <path d="M0 0 H14 M0 0 V14" stroke="#0a0d12" stroke-width="2.4"/>
    </pattern>
    <pattern id="goalNet" width="10" height="10" patternUnits="userSpaceOnUse">
      <path d="M0 0 L10 10 M10 0 L0 10" stroke="#fff" stroke-opacity="0.55" stroke-width="1"/>
    </pattern>
    <pattern id="padelNet" width="8" height="8" patternUnits="userSpaceOnUse">
      <path d="M0 0 H8 M0 0 V8" stroke="#e5e7eb" stroke-opacity="0.55" stroke-width="1"/>
    </pattern>
    <filter id="blur60" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="60"/></filter>
    <filter id="blur20" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="20"/></filter>
    <filter id="blur8" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8"/></filter>
    <filter id="blur2"><feGaussianBlur stdDeviation="1.6"/></filter>
    <filter id="grassTex" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9 0.25" numOctaves="3" seed="21"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0.08  0 0 0 0 0  0 0 0 0.9 -0.3"/>
    </filter>
    <filter id="turfTex" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="8"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.8  0 0 0 0 0.9  0 0 0 0 1  0 0 0 0.55 -0.22"/>
    </filter>
    <linearGradient id="fadeTop" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#01030a" stop-opacity="0.92"/><stop offset="1" stop-color="#01030a" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="fadeBottom" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#01030a" stop-opacity="0"/><stop offset="1" stop-color="#01030a" stop-opacity="0.92"/>
    </linearGradient>
    <radialGradient id="vignette" cx="50%" cy="52%" r="75%">
      <stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.75"/>
    </radialGradient>
    <linearGradient id="seam" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#facc15" stop-opacity="0"/><stop offset="0.5" stop-color="#fff3c4" stop-opacity="0.35"/><stop offset="1" stop-color="#facc15" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="spot" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fffbe6" stop-opacity="0.2"/><stop offset="1" stop-color="#fffbe6" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="leftHalf"><polygon points="0,0 1010,0 910,${H} 0,${H}"/></clipPath>
    <clipPath id="rightHalf"><polygon points="1010,0 ${W},0 ${W},${H} 910,${H}"/></clipPath>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <!-- stands + crowd -->
  <rect x="0" y="230" width="${W}" height="${HZ - 230}" fill="#0b1222"/>
  ${Array.from({ length: 16 }, (_, i) => `<rect x="0" y="${236 + i * 20}" width="${W}" height="2" fill="#1e293b" opacity="0.6"/>`).join('')}
  <g filter="url(#blur2)">${crowd}</g>
  <rect x="0" y="230" width="${W}" height="${HZ - 230}" fill="url(#standShade)"/>
  <g filter="url(#blur8)">${bokeh}</g>
  <!-- roof edge -->
  <path d="M0 230 L${W} 230 L${W} 210 L0 210 Z" fill="#0d1320"/>
  <path d="M0 230 L${W} 230" stroke="#3b4658" stroke-width="2"/>

  <!-- LEFT: football -->
  <g clip-path="url(#leftHalf)">
    ${stripes}
    <rect x="0" y="${HZ}" width="${W}" height="${H - HZ}" filter="url(#grassTex)"/>
    <!-- pitch lines -->
    <g stroke="#f8fafc" stroke-opacity="0.75" fill="none">
      <path d="M-200 ${gy + 2} L1100 ${gy + 2}" stroke-width="3"/>
      <path d="M90 ${gy + 2} L-40 ${gy + 110} L1000 ${gy + 110} L820 ${gy + 2}" stroke-width="4"/>
      <path d="M220 ${gy + 2} L190 ${gy + 40} L760 ${gy + 40} L680 ${gy + 2}" stroke-width="3.5"/>
      <path d="M300 ${gy + 110} Q${gx + gw / 2} ${gy + 170} 620 ${gy + 110}" stroke-width="4.5"/>
      <ellipse cx="${gx + gw / 2}" cy="${gy + 80}" rx="5" ry="2.5" fill="#f8fafc"/>
      <path d="M-400 ${H} L${gx + gw / 2 - 30} ${gy + 2}" stroke-width="0" />
    </g>
    <!-- goal -->
    <g>
      <path d="M${gx} ${gy - gh} L${gx + 18} ${gy - gh - gd * 0.25} L${gx + gw - 18} ${gy - gh - gd * 0.25} L${gx + gw} ${gy - gh} Z" fill="url(#goalNet)"/>
      <rect x="${gx + 18}" y="${gy - gh - gd * 0.25}" width="${gw - 36}" height="${gh + gd * 0.25 - 6}" fill="#0a2010" opacity="0.4"/>
      <rect x="${gx + 18}" y="${gy - gh - gd * 0.25}" width="${gw - 36}" height="${gh + gd * 0.25 - 6}" fill="url(#goalNet)"/>
      <path d="M${gx} ${gy - gh} L${gx + 18} ${gy - gh - gd * 0.25} L${gx + 18} ${gy - 6} L${gx} ${gy} Z" fill="url(#goalNet)"/>
      <path d="M${gx + gw} ${gy - gh} L${gx + gw - 18} ${gy - gh - gd * 0.25} L${gx + gw - 18} ${gy - 6} L${gx + gw} ${gy} Z" fill="url(#goalNet)"/>
      <ellipse cx="${gx + gw / 2}" cy="${gy + 4}" rx="${gw * 0.55}" ry="8" fill="#000" opacity="0.4" filter="url(#blur8)"/>
      <rect x="${gx - 5}" y="${gy - gh - 5}" width="9" height="${gh + 6}" fill="#f1f5f9"/>
      <rect x="${gx + gw - 4}" y="${gy - gh - 5}" width="9" height="${gh + 6}" fill="#f1f5f9"/>
      <rect x="${gx - 5}" y="${gy - gh - 6}" width="${gw + 10}" height="9" fill="#ffffff"/>
      <rect x="${gx - 5}" y="${gy - gh + 1}" width="${gw + 10}" height="2" fill="#94a3b8"/>
      <rect x="${gx + 2}" y="${gy - gh}" width="2" height="${gh}" fill="#94a3b8"/>
      <rect x="${gx + gw + 3}" y="${gy - gh}" width="2" height="${gh}" fill="#94a3b8"/>
    </g>
    <!-- corner flag far left -->
    <rect x="40" y="${gy - 70}" width="4" height="72" fill="#e5e7eb"/>
    <path d="M44 ${gy - 70} C60 ${gy - 76} 70 ${gy - 62} 86 ${gy - 68} L86 ${gy - 46} C70 ${gy - 40} 60 ${gy - 54} 44 ${gy - 48} Z" fill="#ef4444"/>
  </g>

  <!-- RIGHT: padel -->
  <g clip-path="url(#rightHalf)">
    <rect x="900" y="${HZ - 300}" width="1100" height="${H}" fill="#08101f"/>
    <!-- fence above glass -->
    <rect x="${bl[0] - 400}" y="250" width="${br[0] - bl[0] + 800}" height="${glassTop - 250}" fill="#0b1426" opacity="0.6"/>
    <rect x="${bl[0] - 400}" y="250" width="${br[0] - bl[0] + 800}" height="${glassTop - 250}" fill="url(#fence)"/>
    <!-- floor -->
    <polygon points="${bl[0] - 600},${backY} ${br[0] + 600},${backY} ${W + 600},${H} 300,${H}" fill="#0f3570"/>
    <polygon points="${bl[0]},${bl[1]} ${br[0]},${br[1]} ${courtR},${H + 200} ${courtL},${H + 200}" fill="url(#padelFloor)"/>
    <rect x="900" y="${backY}" width="1100" height="${H - backY}" filter="url(#turfTex)" opacity="0.9"/>
    <!-- back glass -->
    ${glassPanels}
    <rect x="${bl[0]}" y="${glassTop - 4}" width="${br[0] - bl[0]}" height="6" fill="#0b0f16"/>
    <!-- lines -->
    <g stroke="#fff" stroke-opacity="0.85" fill="none" stroke-width="4">
      <path d="M${bl[0]} ${bl[1]} L${br[0]} ${br[1]}"/>
      <path d="M${sl[0]} ${sl[1]} L${sr[0]} ${sr[1]}"/>
      <path d="M${toward(1480, H + 200, tBack).join(' ')} L${toward(1480, H + 200, svcT).join(' ')}"/>
      <path d="M${toward(1480, H + 200, netT).join(' ')} L1480 ${H + 200}" />
    </g>
    <!-- side glass walls -->
    <polygon points="${bl[0]},${glassTop} ${bl[0]},${backY} ${courtL - 260},${H + 200} ${courtL - 260},${100}" fill="url(#glass)" opacity="0.35"/>
    <polygon points="${br[0]},${glassTop} ${br[0]},${backY} ${courtR + 300},${H + 200} ${courtR + 300},${100}" fill="url(#glass)" opacity="0.35"/>
    <line x1="${bl[0]}" y1="${glassTop}" x2="${bl[0]}" y2="${backY}" stroke="#0b0f16" stroke-width="6"/>
    <line x1="${br[0]}" y1="${glassTop}" x2="${br[0]}" y2="${backY}" stroke="#0b0f16" stroke-width="6"/>
    <!-- net -->
    <polygon points="${nl[0]},${nl[1] - 70} ${nr[0]},${nr[1] - 70} ${nr[0]},${nr[1]} ${nl[0]},${nl[1]}" fill="#0b1220" opacity="0.25"/>
    <polygon points="${nl[0]},${nl[1] - 70} ${nr[0]},${nr[1] - 70} ${nr[0]},${nr[1]} ${nl[0]},${nl[1]}" fill="url(#padelNet)"/>
    <rect x="${nl[0]}" y="${nl[1] - 76}" width="${nr[0] - nl[0]}" height="9" fill="#f8fafc"/>
    <rect x="${nl[0] - 10}" y="${nl[1] - 86}" width="14" height="88" fill="#111827"/>
    <rect x="${nr[0] - 4}" y="${nl[1] - 86}" width="14" height="88" fill="#111827"/>
    <ellipse cx="${(nl[0] + nr[0]) / 2}" cy="${nl[1] + 4}" rx="${(nr[0] - nl[0]) / 2}" ry="8" fill="#000" opacity="0.35" filter="url(#blur8)"/>
    ${padelBallSVG('sb2', 1600, 760, 16, 40)}
  </g>

  <!-- floodlights -->
  <g filter="url(#blur60)">
    <circle cx="260" cy="120" r="260" fill="url(#flood)"/>
    <circle cx="1660" cy="120" r="260" fill="url(#flood)"/>
  </g>
  <polygon points="140,170 380,170 900,${H} -300,${H}" fill="url(#spot)" filter="url(#blur20)" opacity="0.8"/>
  <polygon points="1540,170 1780,170 2200,${H} 1000,${H}" fill="url(#spot)" filter="url(#blur20)" opacity="0.8"/>
  ${lamps(130, 70)}${lamps(1530, 70)}
  <rect x="250" y="174" width="14" height="40" fill="#141922"/><rect x="1650" y="174" width="14" height="40" fill="#141922"/>
  <g filter="url(#blur8)">${lamps(130, 70)}${lamps(1530, 70)}</g>

  <!-- light pools on the playing surfaces -->
  <g filter="url(#blur60)" style="mix-blend-mode:screen">
    <ellipse cx="520" cy="760" rx="420" ry="150" fill="#fffbe6" opacity="0.16"/>
    <ellipse cx="1480" cy="760" rx="380" ry="150" fill="#e6f0ff" opacity="0.18"/>
  </g>
  <!-- centre seam -->
  <polygon points="985,0 1035,0 935,${H} 885,${H}" fill="url(#seam)" filter="url(#blur20)"/>
  <!-- readability -->
  <rect width="${W}" height="330" fill="url(#fadeTop)"/>
  <rect y="${H - 330}" width="${W}" height="330" fill="url(#fadeBottom)"/>
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>
</svg>`;
}

// ---------------------------------------------------------------------------
const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Oswald:wght@700&display=swap" rel="stylesheet">`;

async function render(page, svg, file, w, h, opts = {}) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><html><head>${FONTS}<style>html,body{margin:0;background:transparent}svg{display:block}</style></head><body>${svg}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const out = path.join(OUT, file);
  await page.screenshot({ path: out, type: opts.type || 'png', quality: opts.quality, omitBackground: !opts.type || opts.type === 'png', clip: { x: 0, y: 0, width: w, height: h } });
  console.log(file, (fs.statSync(out).size / 1024).toFixed(0) + 'KB');
}

const icon = (vb, inner, size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${size[0]}" height="${size[1]}">${inner}</svg>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await render(page, sceneSVG(), 'scene.jpg', 1920, 1080, { type: 'jpeg', quality: 82 });
  await render(page, wheelSVG(), 'wheel.jpg', 1100, 1100, { type: 'jpeg', quality: 86 });
  await render(page, icon('0 0 200 200', footballSVG('a', 100, 96, 86), [360, 360]), 'icon-ball.png', 360, 360);
  await render(page, icon('0 0 200 200', padelBallSVG('a', 100, 96, 86), [360, 360]), 'icon-padelball.png', 360, 360);
  await render(page, icon('0 0 240 200', goalIconSVG('a'), [432, 360]), 'icon-goal.png', 432, 360);
  await render(page, icon('0 0 200 220', cornerIconSVG('a'), [328, 360]), 'icon-corner.png', 328, 360);
  await render(page, icon('0 0 260 260', crossedIconSVG('a'), [360, 360]), 'icon-crossed.png', 360, 360);
  await render(page, icon('0 0 220 260', racketBallIconSVG('a', '#f472b6'), [305, 360]), 'icon-racketball.png', 305, 360);
  await render(page, icon('-10 0 220 300', `<g transform="rotate(-18 100 150)">${racketSVG('a', '#c6f432')}</g>`, [264, 360]), 'icon-racket.png', 264, 360);
  await render(page, icon('0 0 240 180', padelNetIconSVG('a'), [480, 360]), 'icon-net.png', 480, 360);
  await render(page, icon('0 0 200 200', footballSVG('h', 100, 96, 86), [240, 240]), 'hub-ball.png', 240, 240);
  await browser.close();
})();
