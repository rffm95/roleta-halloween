import React, { useMemo } from 'react';
import { asset } from '../types';

interface RouletteWheelProps {
  rotation: number;
  isSpinning: boolean;
}

export const SPIN_MS = 6000;
export const SPIN_EASING = 'cubic-bezier(0.12, 1, 0.22, 1)';

// The wheel face (grass, padel court, balls, rackets, text) is ONE pre-rendered image.
// Spinning it is a single GPU transform, so even a weak Smart TV stays smooth.
const RouletteWheel: React.FC<RouletteWheelProps> = ({ rotation, isSpinning }) => {
  const bulbs = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        const cx = Math.sin(a) * 258;
        const cy = -Math.cos(a) * 258;
        return (
          <g key={i} className={i % 2 ? 'bulb bulb-b' : 'bulb bulb-a'}>
            <circle cx={cx} cy={cy} r="8" fill={i % 2 ? '#fde047' : '#ffffff'} opacity="0.35" />
            <circle cx={cx} cy={cy} r="5" fill={i % 2 ? '#fef08a' : '#ffffff'} />
          </g>
        );
      }),
    []
  );

  return (
    <div className={`relative w-[480px] h-[480px] ${isSpinning ? 'wheel-spinning' : ''}`}>
      <div className="wheel-glow" />

      {/* Rotating face */}
      <div
        className="absolute"
        style={{
          left: "5%", top: "5%", width: "90%", height: "90%",
          borderRadius: '50%', overflow: 'hidden',
          transform: `rotate(${rotation}deg)`,
          transition: `transform ${SPIN_MS / 1000}s ${SPIN_EASING}`,
          willChange: 'transform',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
        }}
      >
        <img src={asset('wheel.jpg')} alt="" draggable={false} style={{ display: 'block', width: '101.9%', height: '101.9%', margin: '-0.95%' }} />
      </div>

      {/* Static rim: brushed metal + bulbs */}
      <svg viewBox="-270 -270 540 540" className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
        <defs>
          <linearGradient id="rimMetal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff6c8" />
            <stop offset="0.25" stopColor="#c9a227" />
            <stop offset="0.5" stopColor="#6b4f0c" />
            <stop offset="0.75" stopColor="#e3c25a" />
            <stop offset="1" stopColor="#5a420a" />
          </linearGradient>
          <linearGradient id="rimDark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a2f38" />
            <stop offset="0.5" stopColor="#0b0d11" />
            <stop offset="1" stopColor="#1c2027" />
          </linearGradient>
          <radialGradient id="sheen" cx="35%" cy="25%" r="70%">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle r="241" fill="url(#sheen)" />
        <circle r="258" fill="none" stroke="url(#rimDark)" strokeWidth="26" />
        <circle r="270" fill="none" stroke="url(#rimMetal)" strokeWidth="5" />
        <circle r="244" fill="none" stroke="url(#rimMetal)" strokeWidth="4" />
        {bulbs}
      </svg>

      {/* Pointer */}
      <div className="absolute left-1/2 z-30" style={{ top: -34, transform: 'translateX(-50%)' }}>
        <svg viewBox="0 0 64 80" width="64" height="80">
          <defs>
            <linearGradient id="ptrGold" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#8a6508" />
              <stop offset="0.35" stopColor="#fff3b0" />
              <stop offset="0.6" stopColor="#e2b52b" />
              <stop offset="1" stopColor="#7a5806" />
            </linearGradient>
          </defs>
          <path d="M8 6 L56 6 L56 30 L32 76 L8 30 Z" fill="#000" opacity="0.4" transform="translate(3 4)" />
          <path d="M8 6 L56 6 L56 30 L32 76 L8 30 Z" fill="url(#ptrGold)" stroke="#3b2a03" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M16 13 L48 13 L48 28 L32 60 L16 28 Z" fill="#b91c1c" />
          <path d="M16 13 L48 13 L48 18 L16 18 Z" fill="#fff" opacity="0.25" />
        </svg>
      </div>

      {/* Hub: a real-looking football */}
      <img src={asset('hub-ball.png')} alt="" className="absolute" style={{ width: 96, height: 96, left: '50%', top: '50%', marginLeft: -48, marginTop: -50 }} />
    </div>
  );
};

export default RouletteWheel;
