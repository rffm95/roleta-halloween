import { useState, useCallback, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { ShieldCheck } from 'lucide-react';
import RouletteWheel, { SPIN_MS } from './components/RouletteWheel';
import { PRIZES, Prize, MISSES, asset } from './types';
import { BRAND_LOGOS } from './brandLogos';
import { sfx, startTicks } from './sound';

const byId = (id: number) => PRIZES[id];

// Falling snow: plain divs animated with transform only (cheap on the TV).
type Flake = { x: number; s: number; d: number; t: number; o: number };
const makeFlakes = (n: number, seed: number, big: number): Flake[] =>
  Array.from({ length: n }, (_, i) => {
    const r = (k: number) => ((Math.sin((i + 1) * (seed + k) * 12.9898) * 43758.5453) % 1 + 1) % 1;
    return { x: r(1) * 100, s: 3 + r(2) * big, d: -r(3) * 14, t: 9 + r(4) * 9, o: 0.45 + r(5) * 0.5 };
  });
const SNOW_BACK = makeFlakes(34, 3, 7);
const SNOW_FRONT = makeFlakes(12, 7, 4);
const Snow = ({ flakes, front = false }: { flakes: Flake[]; front?: boolean }) => (
  <div className={`snow ${front ? 'snow-front' : ''}`}>
    {flakes.map((f, i) => (
      <span key={i} className={`flake sway-${i % 3}`} style={{ left: `${f.x}%`, animationDelay: `${f.d}s`, animationDuration: `${f.t}s` }}>
        <i style={{ width: f.s, height: f.s, opacity: f.o }} />
      </span>
    ))}
  </div>
);

// Garland of bulbs hanging across the top of the stage (two sagging loops).
const GARLAND = Array.from({ length: 30 }, (_, i) => {
  const t = i / 29, x = 20 + t * 1400, loop = (t * 2) % 1;
  return { x, y: 8 + Math.sin(loop * Math.PI) * 46, c: i % 4 };
});
const GARLAND_PATH = `M 20 6 Q 370 ${8 + 92} 720 6 Q 1070 ${8 + 92} 1420 6`;
const TWINKLES = Array.from({ length: 16 }, (_, i) => ({ x: (i * 37 + 7) % 100, y: 3 + ((i * 53) % 30), d: (i * 0.61) % 4 }));
const FUTEBOL = [byId(0), byId(8), byId(4)]; // Golo, Canto, Penálti
const PADEL = [byId(6), byId(2), byId(10)]; // Ponto de Ouro (Régua), Smash, Bandeja

export default function App() {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<Prize | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [miss, setMiss] = useState(MISSES[0]);
  const stopTicks = useRef<() => void>(() => {});

  // Fit the fixed 1440x900 stage into the TV browser's real viewport (same as the original).
  const measureScale = () => {
    const viewport = window.visualViewport;
    const width = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth, viewport ? viewport.width : window.innerWidth);
    const height = Math.min(window.innerHeight, document.documentElement.clientHeight || window.innerHeight, viewport ? viewport.height : window.innerHeight);
    return Math.min(width / 1440, height / 900) * 0.96;
  };
  const [stageScale, setStageScale] = useState(measureScale);

  useEffect(() => {
    const fitStage = () => setStageScale(measureScale());
    fitStage();
    window.addEventListener('resize', fitStage);
    document.addEventListener('fullscreenchange', fitStage);
    const viewport = window.visualViewport;
    if (viewport) viewport.addEventListener('resize', fitStage);
    return () => {
      window.removeEventListener('resize', fitStage);
      document.removeEventListener('fullscreenchange', fitStage);
      if (viewport) viewport.removeEventListener('resize', fitStage);
    };
  }, []);

  const spin = useCallback(() => {
    if (isSpinning) return;

    setIsSpinning(true);
    setWinner(null);
    setShowOverlay(false);

    const prizeIndex = Math.floor(Math.random() * PRIZES.length);
    const extraSpins = 6 + Math.floor(Math.random() * 4); // 6-10 spins
    const segmentAngle = 360 / PRIZES.length;

    const newRotation = rotation + extraSpins * 360 + (360 - prizeIndex * segmentAngle - segmentAngle / 2) - (rotation % 360);

    setRotation(newRotation);
    stopTicks.current();
    stopTicks.current = startTicks(rotation, newRotation, SPIN_MS, segmentAngle);

    setTimeout(() => {
      const actualWinner = PRIZES[prizeIndex];
      setWinner(actualWinner);
      setIsSpinning(false);
      setShowOverlay(true);

      if (actualWinner.isWin) {
        sfx.win();
        const colors = ['#facc15', '#ffffff', '#dc2626', '#16a34a', '#fde68a'];
        confetti({ particleCount: 40, angle: 60, spread: 55, origin: { x: 0.1, y: 0.7 }, colors, zIndex: 100 });
        confetti({ particleCount: 40, angle: 120, spread: 55, origin: { x: 0.9, y: 0.7 }, colors, zIndex: 100 });
      } else {
        setMiss(MISSES[Math.floor(Math.random() * MISSES.length)]);
        sfx.lose();
      }
    }, SPIN_MS + 100);
  }, [isSpinning, rotation]);

  // Any key on the remote / any click spins (or closes the result screen).
  useEffect(() => {
    const handleAction = () => {
      try {
        const doc = document.documentElement;
        if (doc.requestFullscreen) doc.requestFullscreen().catch(() => {});
      } catch (e) {
        /* fullscreen may be blocked */
      }
      sfx.unlock();

      if (showOverlay) {
        setShowOverlay(false);
      } else if (!isSpinning) {
        spin();
      }
    };

    const handleKeyDown = () => handleAction();
    const handleClick = () => handleAction();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClick);
    };
  }, [spin, isSpinning, showOverlay]);

  const renderCard = (prize: Prize, side: 'left' | 'right') => {
    const top = prize.award === 'Régua';
    return (
      <div key={prize.id} className={`prize-card ${side === 'right' ? 'prize-card-right' : ''} ${top ? 'is-top' : ''}`}>
        {top && <img src={asset('holly.png')} alt="" className="card-holly" />}
        <img src={asset(prize.icon!)} alt="" className="card-icon" />
        <div className="card-text">
          {top && <span className="top-chip">PRÉMIO MÁXIMO</span>}
          <span className="card-label">{prize.label}</span>
          <span className="card-award gold-text">{prize.award}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="app-bg overflow-hidden cursor-none select-none" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%' }}>
      {/* ---------- Pre-rendered football | padel scene (one static image) ---------- */}
      <div className="scene" style={{ backgroundImage: `url(${asset('scene.jpg')})` }} />
      <div className="twinkles">
        {TWINKLES.map((t, i) => (
          <span key={i} className={`twinkle tw-${i % 4}`} style={{ left: `${t.x}%`, top: `${t.y}%`, animationDelay: `${t.d}s` }} />
        ))}
      </div>
      <Snow flakes={SNOW_BACK} />

      {/* ---------- 1440x900 stage, scaled to fit the TV ---------- */}
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 1440, height: 900, transform: `translate(-50%, -50%) scale(${stageScale})`, transformOrigin: 'center center' }}>
        {/* Christmas light garland */}
        <div className="garland">
          <svg width="1440" height="70" viewBox="0 0 1440 70" className="garland-wire"><path d={GARLAND_PATH} fill="none" stroke="#0d2414" strokeWidth="3" /></svg>
          {[0, 1].map((grp) => (
            <div key={grp} className={`garland-grp ${grp ? 'garland-b' : 'garland-a'}`}>
              {GARLAND.filter((_, i) => i % 2 === grp).map((b, i) => (
                <span key={i} className={`gbulb gb-${b.c}`} style={{ left: b.x, top: b.y }} />
              ))}
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="header">
          <div className="live-chip"><span className="xmas-star">★</span> FELIZ NATAL · SPORTS &amp; COCKTAIL BAR <span className="xmas-star">★</span></div>
          <h1 className="font-display title-main">
            <span className="silver-text title-c">CHEERS<img src={asset('hat.png')} alt="" className="title-hat" /></span> <span className="gold-text">O BAR</span>
          </h1>
        </div>

        {/* Futebol */}
        <div className="col col-l">
          <div className="col-head col-head-l">
            <img src={asset('ball-hat.png')} alt="" className="hero hero-l" />
            <h3 className="font-display">Futebol</h3>
          </div>
          {FUTEBOL.map((p) => renderCard(p, 'left'))}
          <div className="deco deco-l">
            <img src={asset('tree.png')} alt="" className="deco-tree" />
            <img src={asset('gifts.png')} alt="" className="deco-gifts" />
          </div>
        </div>

        {/* Wheel */}
        <div style={{ position: 'absolute', left: 720 - 320, top: 148 }}>
          <RouletteWheel rotation={rotation} isSpinning={isSpinning} size={640} />
        </div>

        {/* Padel */}
        <div className="col col-r">
          <div className="col-head col-head-r">
            <h3 className="font-display">Padel</h3>
            <img src={asset('racket-hat.png')} alt="" className="hero hero-r" />
          </div>
          {PADEL.map((p) => renderCard(p, 'right'))}
          <div className="deco deco-r">
            <img src={asset('gifts.png')} alt="" className="deco-gifts deco-gifts-r" />
            <img src={asset('santa.png')} alt="" className="deco-santa" />
          </div>
        </div>

        {/* Rules */}
        <div className="rules">
          <p className="font-display rules-main">PEDE UMA RÉGUA OU UM METRO PARA GIRAR</p>
          <p className="rules-sub">
            <span><b>RÉGUA</b> (5 FINOS) = <b>1 GIRO</b></span>
            <i />
            <span><b>METRO</b> (11 FINOS) = <b>2 GIROS</b></span>
          </p>
        </div>

        {/* Sponsors */}
        <div className="sponsor sponsor-l">
          <img src={BRAND_LOGOS.sagres} alt="Logótipo Sagres" width={62} height={52} style={{ objectFit: 'contain' }} />
          <div>
            <span className="sponsor-tag">Cerveja Oficial</span>
            <span className="sponsor-name">SAGRES</span>
          </div>
        </div>
        <div className="sponsor sponsor-r">
          <div style={{ textAlign: 'right' }}>
            <span className="sponsor-tag">Sponsor Global</span>
            <span className="sponsor-name">HEINEKEN</span>
          </div>
          <img src={BRAND_LOGOS.heineken} alt="Logótipo Heineken" width={92} height={52} style={{ objectFit: 'contain' }} />
        </div>
        <div className="drink"><ShieldCheck size={16} /> Beba com responsabilidade</div>

        <Snow flakes={SNOW_FRONT} front />

        {/* Result screen */}
        {showOverlay && winner && (
          <div className="overlay">
            {winner.isWin && <img src={asset('rays.png')} alt="" className="rays" />}
            {winner.isWin && <img src={asset('santa.png')} alt="" className="result-santa" />}
            {winner.isWin && <img src={asset('gifts.png')} alt="" className="result-gifts" />}
            <div className={`result ${winner.isWin ? (winner.award === 'Régua' ? 'result-win result-top' : 'result-win') : 'result-lose'}`}>
              <img src={asset(winner.isWin ? winner.icon! : miss.icon)} alt="" className="result-icon" />
              <img src={asset('holly.png')} alt="" className="result-holly result-holly-l" />
              <img src={asset('holly.png')} alt="" className="result-holly result-holly-r" />
              {winner.isWin ? (
                <>
                  <h3 className="font-display shout gold-text">{winner.shout}</h3>
                  <p className="result-small">Ganhaste</p>
                  <h2 className="result-award">{winner.award}</h2>
                  <p className="result-tag font-display">{winner.sport === 'padel' ? 'Padel' : 'Futebol'} · {winner.label}</p>
                </>
              ) : (
                <>
                  <h2 className={`font-display shout shout-lose ${miss.shout.length > 13 ? 'shout-long' : ''}`}>{miss.shout}</h2>
                  <p className="result-award result-award-lose">Tenta outra vez!</p>
                </>
              )}
              <div className="result-continue">CLIQUE PARA CONTINUAR</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
