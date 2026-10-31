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

export const sfx = {
  unlock() {
    ac();
  },
  tick() {
    tone(1400, 0, 0.035, 'square', 0.04);
  },
  win() {
    // spooky-but-happy arpeggio (minor -> major)
    [392, 466, 587, 784, 988].forEach((f, i) => tone(f, i * 0.09, 0.35, 'triangle', 0.12));
    tone(1175, 0.5, 0.7, 'triangle', 0.1);
  },
  lose() {
    // descending "wah wah wah" + ghostly wobble
    [330, 311, 294].forEach((f, i) => tone(f, i * 0.28, 0.3, 'sawtooth', 0.06, f * 0.94));
    tone(277, 0.84, 0.9, 'sawtooth', 0.06, 180);
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
