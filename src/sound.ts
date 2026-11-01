// Tiny synthesized sound effects (Web Audio, no files to download).
// Disable with ?som=0 in the URL. Everything is wrapped in try/catch so a TV
// browser without Web Audio simply stays silent.

const enabled = (() => {
  try {
    return new URLSearchParams(window.location.search).get('som') !== '0';
  } catch {
    return true;
  }
})();

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) {
      const C = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx!.state === 'suspended') ctx!.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.15, slideTo?: number) {
  const c = ac();
  if (!c) return;
  try {
    const t = c.currentTime + start;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {
    /* ignore */
  }
}

function whistle(start: number, dur: number) {
  const c = ac();
  if (!c) return;
  try {
    const t = c.currentTime + start;
    const o = c.createOscillator();
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(2900, t);
    lfo.frequency.setValueAtTime(38, t);
    lfoGain.gain.setValueAtTime(140, t);
    lfo.connect(lfoGain);
    lfoGain.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.08, t + 0.02);
    g.gain.setValueAtTime(0.08, t + dur - 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    lfo.start(t);
    o.stop(t + dur + 0.02);
    lfo.stop(t + dur + 0.02);
  } catch {
    /* ignore */
  }
}

function crowd(dur: number) {
  const c = ac();
  if (!c) return;
  try {
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900;
    bp.Q.value = 0.6;
    const g = c.createGain();
    const t = c.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(c.destination);
    src.start(t);
  } catch {
    /* ignore */
  }
}

export const sfx = {
  unlock() {
    ac();
  },
  tick() {
    tone(1400, 0, 0.035, 'square', 0.04);
  },
  win() {
    // stadium fanfare + crowd roar
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 'square', 0.06));
    tone(1047, 0.45, 0.8, 'square', 0.06);
    tone(784, 0.45, 0.8, 'square', 0.04);
    crowd(1.8);
  },
  lose() {
    // referee whistle: two short + one long blast
    whistle(0, 0.16);
    whistle(0.24, 0.16);
    whistle(0.5, 0.6);
  },
};

// --- Wheel tick timing -------------------------------------------------------
// Solve the CSS cubic-bezier used by the wheel so ticks line up with the slices.
function bezier(p1x: number, p1y: number, p2x: number, p2y: number) {
  const cx = 3 * p1x, bx = 3 * (p2x - p1x) - cx, ax = 1 - cx - bx;
  const cy = 3 * p1y, by = 3 * (p2y - p1y) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  return (x: number) => {
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 30; i++) {
      t = (lo + hi) / 2;
      if (sx(t) < x) lo = t; else hi = t;
    }
    return sy(t);
  };
}

const ease = bezier(0.12, 1, 0.22, 1);

/** Plays a tick every time a slice boundary passes the pointer. Returns a stop fn. */
export function startTicks(from: number, to: number, durationMs: number, segmentAngle: number): () => void {
  if (!enabled) return () => {};
  const start = Date.now();
  let lastSlice = Math.floor(from / segmentAngle);
  let lastTickAt = 0;
  const id = window.setInterval(() => {
    const p = Math.min(1, (Date.now() - start) / durationMs);
    const angle = from + (to - from) * ease(p);
    const slice = Math.floor(angle / segmentAngle);
    const now = Date.now();
    if (slice !== lastSlice && now - lastTickAt > 45) {
      sfx.tick();
      lastTickAt = now;
    }
    lastSlice = slice;
    if (p >= 1) window.clearInterval(id);
  }, 25);
  return () => window.clearInterval(id);
}
