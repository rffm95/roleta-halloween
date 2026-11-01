import { useState, useCallback, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { ShieldCheck } from 'lucide-react';
import RouletteWheel, { SPIN_MS } from './components/RouletteWheel';
import { SportIcon, Trophy, Whistle } from './components/Sports';
import { PRIZES, Prize, MISS_SHOUTS } from './types';
import { BRAND_LOGOS } from './brandLogos';
import { sfx, startTicks } from './sound';

const WINS = PRIZES.filter((p) => p.isWin);

export default function App() {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<Prize | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [missShout, setMissShout] = useState(MISS_SHOUTS[0]);
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
        const colors = ['#facc15', '#ffffff', '#22c55e', '#ef4444'];
        confetti({ particleCount: 40, angle: 60, spread: 55, origin: { x: 0.1, y: 0.7 }, colors, zIndex: 100 });
        confetti({ particleCount: 40, angle: 120, spread: 55, origin: { x: 0.9, y: 0.7 }, colors, zIndex: 100 });
      } else {
        setMissShout(MISS_SHOUTS[Math.floor(Math.random() * MISS_SHOUTS.length)]);
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
    <div key={prize.id} className={`prize-card rounded-2xl p-4 flex items-center gap-5 ${side === 'right' ? 'flex-row-reverse prize-card-right' : ''}`} style={{ borderColor: prize.color }}>
      <div className="sport-badge rounded-full flex items-center justify-center" style={{ background: prize.color }}>
        <SportIcon id={prize.sport!} size={58} />
      </div>
      <div className={`flex flex-col ${side === 'right' ? 'text-right' : ''}`}>
        <span className="font-display text-white text-[40px] tracking-wide uppercase leading-none">{prize.name}</span>
        <span className={`font-extrabold text-2xl leading-none uppercase ${prize.award === 'Régua' ? 'text-yellow-300' : 'text-emerald-300'}`}>
          {prize.award}
        </span>
      </div>
    </div>
  );

  const tickerText =
    'PEDE UMA RÉGUA OU UM METRO PARA GIRAR  ●  RÉGUA (5 FINOS) = 1 GIRO  ●  METRO (11 FINOS) = 2 GIROS  ●  FUTEBOL, PADEL E TÉNIS: 3 FINOS  ●  BASQUETEBOL E DARDOS: 1 FINO  ●  FÓRMULA 1: RÉGUA  ●  CHEERS SPORTS & COCKTAIL BAR  ●  ';

  return (
    <div className="stadium-bg overflow-hidden cursor-none select-none" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%' }}>
      {/* ---------- Stadium atmosphere (behind the stage) ---------- */}
      <div className="stands" />
      <div className="flashes">
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i} className="flash" style={{ left: `${(i * 37) % 100}%`, top: `${20 + ((i * 53) % 60)}%`, animationDelay: `${(i * 0.73) % 5}s` }} />
        ))}
      </div>
      <div className="beam beam-l" />
      <div className="beam beam-r" />
      <div className="tower tower-l" />
      <div className="tower tower-r" />
      <div className="pitch" />

      {/* ---------- 1440x900 stage, scaled to fit the TV ---------- */}
      <div
        className="flex flex-col items-center justify-between"
        style={{ position: 'absolute', left: '50%', top: '50%', width: 1440, height: 900, padding: '22px 40px 64px', boxSizing: 'border-box', transform: `translate(-50%, -50%) scale(${stageScale})`, transformOrigin: 'center center' }}
      >
        {/* Header */}
        <div className="z-10 text-center flex flex-col items-center">
          <div className="live-chip mb-2">
            <span className="live-dot" /> SPORTS &amp; COCKTAIL BAR
          </div>
          <h1 className="font-display title-main text-white text-[124px] leading-[0.85] uppercase">
            Cheers <span className="text-yellow-400">O Bar</span>
          </h1>
          <div className="scoreboard mt-3 px-10 py-3 rounded-2xl">
            <p className="font-display text-[40px] leading-none text-white tracking-wide mb-1">PEDE UMA RÉGUA OU UM METRO PARA GIRAR</p>
            <div className="font-led text-lg text-yellow-300 tracking-[0.12em]">
              <span className="mr-10">RÉGUA (5 FINOS) = 1 GIRO</span>
              <span>METRO (11 FINOS) = 2 GIROS</span>
            </div>
          </div>
        </div>

        {/* Game stage */}
        <div className="flex-1 w-full flex items-center justify-between px-6 relative">
          <div className="w-[360px] flex flex-col gap-4 text-left z-20">
            <div className="panel-head panel-head-l">
              <h3 className="font-display text-4xl tracking-widest uppercase text-white">Prémios · 1ª parte</h3>
            </div>
            {WINS.slice(0, 3).map((prize) => renderCard(prize, 'left'))}
          </div>

          <div className="relative flex items-center justify-center">
            <RouletteWheel prizes={PRIZES} rotation={rotation} isSpinning={isSpinning} />
            <div className="hub absolute top-1/2 left-1/2 z-40 rounded-full flex items-center justify-center">
              <span className="font-display text-[34px] text-slate-900 leading-none tracking-wide">{isSpinning ? '...' : 'GIRAR'}</span>
            </div>
          </div>

          <div className="w-[360px] flex flex-col gap-4 text-right z-20">
            <div className="panel-head panel-head-r">
              <h3 className="font-display text-4xl tracking-widest uppercase text-white">Prémios · 2ª parte</h3>
            </div>
            {WINS.slice(3, 6).map((prize) => renderCard(prize, 'right'))}
          </div>
        </div>

        {/* Sponsors */}
        <div className="z-10 w-full flex justify-between items-center px-24">
          <div className="flex flex-col">
            <span className="text-yellow-400 font-bold text-xs uppercase tracking-[0.2em] mb-1">Cerveja Oficial</span>
            <div className="flex items-center">
              <img src={BRAND_LOGOS.sagres} alt="Logótipo Sagres" width={68} height={56} style={{ objectFit: 'contain', marginRight: 14, flexShrink: 0 }} />
              <span className="text-5xl font-black italic text-white tracking-widest leading-none">SAGRES</span>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <ShieldCheck className="text-yellow-400 mb-1" size={32} />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Beba com Responsabilidade</p>
          </div>

          <div className="flex flex-col text-right">
            <span className="text-emerald-400 font-bold text-xs uppercase tracking-[0.2em] mb-1">Sponsor Global</span>
            <div className="flex items-center">
              <span className="text-5xl font-black italic text-white tracking-widest leading-none">HEINEKEN</span>
              <img src={BRAND_LOGOS.heineken} alt="Logótipo Heineken" width={100} height={56} style={{ objectFit: 'contain', marginLeft: 14, flexShrink: 0 }} />
            </div>
          </div>
        </div>

        {/* Broadcast-style ticker */}
        <div className="ticker absolute left-0 right-0 bottom-0 flex items-center">
          <div className="ticker-tag font-display">AO VIVO</div>
          <div className="ticker-window">
            <div className="ticker-track font-display">
              <span>{tickerText}</span>
              <span>{tickerText}</span>
            </div>
          </div>
        </div>

        {/* Result screen */}
        {showOverlay && winner && (
          <div className="absolute z-50 flex items-center justify-center" style={{ left: -1500, right: -1500, top: -1500, bottom: -1500, background: 'rgba(2,6,23,0.94)', animation: 'fadeIn 0.3s ease-out forwards' }}>
            <div
              className={`p-12 rounded-[2.5rem] border-8 flex flex-col items-center text-center max-w-4xl ${winner.isWin ? 'result-win' : 'result-lose'}`}
              style={{ animation: 'popIn 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.2) forwards' }}
            >
              {winner.isWin ? (
                <>
                  <div className="float-icon mb-1"><Trophy size={96} /></div>
                  <h3 className="font-display text-[96px] leading-none text-yellow-300 mb-1 shout">{winner.shout}</h3>
                  <p className="text-2xl font-bold text-white/80 uppercase tracking-[0.35em] mb-2">Ganhaste</p>
                  <h2 className="text-[110px] font-black italic text-white leading-none mb-7 uppercase" style={{ textShadow: '0 6px 0 rgba(0,0,0,0.35)' }}>
                    {winner.award}
                  </h2>
                  <div className="flex items-center bg-black/30 px-8 py-3 rounded-2xl border-2 border-white/30">
                    <SportIcon id={winner.sport!} size={70} className="mr-5" />
                    <span className="font-display text-5xl text-white tracking-widest uppercase">{winner.name}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="float-icon mb-2"><Whistle size={130} /></div>
                  <h2 className="font-display text-[130px] text-red-500 leading-none mb-4 shout">{missShout}</h2>
                  <p className="text-4xl font-bold text-white/60 uppercase tracking-widest">Tenta outra vez!</p>
                </>
              )}
              <div className="mt-9 text-white/60 font-bold text-2xl uppercase tracking-[0.4em] animate-pulse font-mono">CLIQUE PARA CONTINUAR</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
