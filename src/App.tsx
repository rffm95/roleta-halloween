import { useState, useCallback, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { ShieldCheck } from 'lucide-react';
import RouletteWheel, { SPIN_MS } from './components/RouletteWheel';
import { MonsterIcon, Bat, Web } from './components/Monsters';
import { PRIZES, Prize } from './types';
import { BRAND_LOGOS } from './brandLogos';
import { sfx, startTicks } from './sound';

const WINS = PRIZES.filter((p) => p.isWin);

export default function App() {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<Prize | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
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
        const colors = ['#f97316', '#a855f7', '#84cc16', '#ffffff'];
        confetti({ particleCount: 40, angle: 60, spread: 55, origin: { x: 0.1, y: 0.7 }, colors, zIndex: 100 });
        confetti({ particleCount: 40, angle: 120, spread: 55, origin: { x: 0.9, y: 0.7 }, colors, zIndex: 100 });
      } else {
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

  const renderCard = (prize: Prize, side: 'left' | 'right') => (
    <div
      key={prize.id}
      className={`prize-card border-4 rounded-[2rem] p-4 flex items-center gap-5 ${side === 'right' ? 'flex-row-reverse' : ''} ${
        winner && showOverlay && winner.id === prize.id ? 'prize-card-hit' : ''
      }`}
    >
      <div className="monster-badge rounded-2xl flex items-center justify-center" style={{ background: prize.color }}>
        <MonsterIcon id={prize.monster!} size={60} />
      </div>
      <div className={`flex flex-col ${side === 'right' ? 'text-right' : ''}`}>
        <span className="text-white font-black text-2xl tracking-wide uppercase leading-none mb-1">{prize.name}</span>
        <span className={`font-extrabold text-2xl leading-none uppercase ${prize.award === 'Régua' ? 'text-yellow-300' : 'text-orange-400'}`}>
          {prize.award}
        </span>
      </div>
    </div>
  );

  return (
    <div className="halloween-bg overflow-hidden cursor-none select-none" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%' }}>
      {/* ---------- Atmosphere (behind the stage) ---------- */}
      <div className="moon" />
      <div className="fog fog-1" />
      <div className="fog fog-2" />
      <svg className="graveyard" viewBox="0 0 1440 160" preserveAspectRatio="none">
        <path
          d="M0 160 L0 110 C120 90 220 120 340 100 C460 80 560 115 700 104 C840 92 960 70 1100 96 C1220 118 1330 88 1440 100 L1440 160 Z"
          fill="#07030c"
        />
        <path d="M120 112 L120 74 C120 58 150 58 150 74 L150 112 Z M1260 106 L1260 66 C1260 48 1294 48 1294 66 L1294 106 Z" fill="#07030c" />
        <path d="M1180 104 L1180 60 M1166 74 L1194 74 M250 112 L250 78 M240 88 L260 88" stroke="#07030c" strokeWidth="8" />
      </svg>
      <div className="bat bat-1"><Bat size={70} /></div>
      <div className="bat bat-2"><Bat size={46} /></div>
      <div className="bat bat-3"><Bat size={58} /></div>
      <div className="lightning" />

      {/* ---------- 1440x900 stage, scaled to fit the TV ---------- */}
      <div
        className="p-10 flex flex-col items-center justify-between"
        style={{ position: 'absolute', left: '50%', top: '50%', width: 1440, height: 900, boxSizing: 'border-box', transform: `translate(-50%, -50%) scale(${stageScale})`, transformOrigin: 'center center' }}
      >
        {/* Cobwebs + hanging spider */}
        <div className="absolute top-0 left-0 pointer-events-none"><Web size={230} /></div>
        <div className="absolute top-0 right-0 pointer-events-none"><Web size={230} flip /></div>
        <div className="spider absolute pointer-events-none" style={{ left: 300, top: 0 }}>
          <div style={{ width: 2, height: 110, background: 'rgba(226,232,240,0.4)', margin: '0 auto' }} />
          <svg viewBox="0 0 40 30" width="40" height="30">
            <g stroke="#0a0510" strokeWidth="2.5" fill="none">
              <path d="M14 14 L2 6 M14 16 L0 16 M14 18 L2 26 M26 14 L38 6 M26 16 L40 16 M26 18 L38 26" />
            </g>
            <ellipse cx="20" cy="16" rx="8" ry="10" fill="#0a0510" />
            <circle cx="17" cy="12" r="1.6" fill="#f97316" />
            <circle cx="23" cy="12" r="1.6" fill="#f97316" />
          </svg>
        </div>

        {/* Header */}
        <div className="z-10 text-center flex flex-col items-center">
          <p className="text-lime-400 font-black text-2xl tracking-[0.5em] uppercase mb-1">Noite de Halloween</p>
          <h1 className="title-creepy text-orange-500 text-[116px] leading-[0.9] uppercase mb-5">Cheers O Bar</h1>
          <div className="rules-banner text-white font-black px-10 py-4 rounded-[2rem] border-8">
            <p className="text-3xl leading-none mb-3">PEDE UMA RÉGUA OU UM METRO PARA GIRAR</p>
            <div className="text-xl">
              <span className="text-orange-300 mr-10 tracking-[0.03em]">RÉGUA (5 FINOS) = 1 GIRO</span>
              <span className="text-orange-300 tracking-[0.03em]">METRO (11 FINOS) = 2 GIROS</span>
            </div>
          </div>
        </div>

        {/* Game stage */}
        <div className="flex-1 w-full flex items-center justify-between px-10 relative">
          <div className="w-[360px] flex flex-col gap-5 text-left z-20">
            <div className="border-b-4 border-orange-500 pb-3 mb-1">
              <h3 className="title-creepy text-orange-500 text-4xl tracking-widest uppercase">Doces</h3>
            </div>
            {WINS.slice(0, 3).map((prize) => (
              renderCard(prize, 'left')
            ))}
          </div>

          <div className="relative flex items-center justify-center">
            <RouletteWheel prizes={PRIZES} rotation={rotation} isSpinning={isSpinning} />
            {/* Jack-o'-lantern hub */}
            <div className="hub absolute top-1/2 left-1/2 z-40 rounded-full flex items-center justify-center">
              <span className="text-[#1c0a00] font-black text-xl uppercase tracking-tighter">{isSpinning ? '...' : 'GIRAR'}</span>
            </div>
          </div>

          <div className="w-[360px] flex flex-col gap-5 text-right z-20">
            <div className="border-b-4 border-purple-500 pb-3 mb-1">
              <h3 className="title-creepy text-purple-400 text-4xl tracking-widest uppercase">Travessuras</h3>
            </div>
            {WINS.slice(3, 6).map((prize) => (
              renderCard(prize, 'right')
            ))}
          </div>
        </div>

        {/* Sponsors */}
        <div className="z-10 w-full flex justify-between items-center px-24">
          <div className="flex flex-col">
            <span className="text-orange-500 font-bold text-xs uppercase tracking-[0.2em] mb-1">Cerveja Oficial</span>
            <div className="flex items-center">
              <img src={BRAND_LOGOS.sagres} alt="Logótipo Sagres" width={68} height={56} style={{ objectFit: 'contain', marginRight: 14, flexShrink: 0 }} />
              <span className="text-5xl font-black italic text-white tracking-widest leading-none">SAGRES</span>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <ShieldCheck className="text-orange-500 mb-1" size={32} />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Beba com Responsabilidade</p>
          </div>

          <div className="flex flex-col text-right">
            <span className="text-lime-400 font-bold text-xs uppercase tracking-[0.2em] mb-1">Sponsor Global</span>
            <div className="flex items-center">
              <span className="text-5xl font-black italic text-white tracking-widest leading-none">HEINEKEN</span>
              <img src={BRAND_LOGOS.heineken} alt="Logótipo Heineken" width={100} height={56} style={{ objectFit: 'contain', marginLeft: 14, flexShrink: 0 }} />
            </div>
          </div>
        </div>

        {/* Result screen */}
        {showOverlay && winner && (
          <div className="absolute z-50 flex items-center justify-center" style={{ left: -1500, right: -1500, top: -1500, bottom: -1500, background: 'rgba(5,2,10,0.94)', animation: 'fadeIn 0.3s ease-out forwards' }}>
            <div
              className={`p-14 rounded-[3rem] border-8 flex flex-col items-center text-center max-w-4xl ${winner.isWin ? 'result-win' : 'result-lose'}`}
              style={{ animation: 'popIn 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.2) forwards' }}
            >
              {winner.isWin ? (
                <>
                  <h3 className="text-3xl font-bold text-white/80 mb-2 uppercase tracking-[0.3em]">Doces ou travessuras?</h3>
                  <h3 className="title-creepy text-7xl text-yellow-200 mb-3 uppercase">Doce!</h3>
                  <h2 className="text-[110px] font-black italic text-white leading-none mb-8 uppercase" style={{ textShadow: '0 6px 0 rgba(0,0,0,0.35)' }}>
                    {winner.award}
                  </h2>
                  <div className="flex items-center bg-black/30 px-8 py-4 rounded-2xl border-2 border-white/40">
                    <div className="float-icon mr-6">
                      <MonsterIcon id={winner.monster!} size={80} />
                    </div>
                    <span className="text-4xl font-bold text-white tracking-widest uppercase">{winner.name}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="float-icon mb-4">
                    <MonsterIcon id="fantasma" size={130} />
                  </div>
                  <h2 className="title-creepy text-[110px] text-lime-400 leading-none mb-6 uppercase">Travessura!</h2>
                  <p className="text-4xl font-bold text-white/60 uppercase tracking-widest">Tenta outra vez!</p>
                </>
              )}

              <div className="mt-10 text-white/60 font-bold text-2xl uppercase tracking-[0.4em] animate-pulse font-mono">CLIQUE PARA CONTINUAR</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
