import React, { useMemo } from 'react';
import { Prize } from '../types';
import { SportShapes } from './Sports';

interface RouletteWheelProps {
  prizes: Prize[];
  rotation: number;
  isSpinning: boolean;
}

export const SPIN_MS = 6000;
export const SPIN_EASING = 'cubic-bezier(0.12, 1, 0.22, 1)';

const R = 250;

const RouletteWheel: React.FC<RouletteWheelProps> = ({ prizes, rotation, isSpinning }) => {
  const segmentAngle = 360 / prizes.length;
  const rad = (segmentAngle * Math.PI) / 180;
  const endX = R * Math.sin(rad);
  const endY = -R * Math.cos(rad);

  const segments = useMemo(() => {
    return prizes.map((prize, i) => {
      const angle = i * segmentAngle;
      return (
        <g key={prize.id} transform={`rotate(${angle})`}>
          <path d={`M 0 0 L 0 -${R} A ${R} ${R} 0 0 1 ${endX} ${endY} Z`} fill={prize.color} stroke="#ffffff22" strokeWidth="2" />
          {prize.sport === 'f1' && (
            <path d={`M 0 0 L 0 -${R} A ${R} ${R} 0 0 1 ${endX} ${endY} Z`} fill="url(#checker)" opacity="0.22" />
          )}
          {prize.isWin && (
            <path d={`M 0 -${R - 8} A ${R - 8} ${R - 8} 0 0 1 ${(R - 8) * Math.sin(rad)} ${-(R - 8) * Math.cos(rad)}`} fill="none" stroke="#ffffff55" strokeWidth="3" />
          )}

          <g transform={`rotate(${segmentAngle / 2} 0 0) translate(0, -135)`}>
            {prize.sport ? (
              <>
                <g transform="translate(-26, -110) scale(0.52)">
                  <SportShapes id={prize.sport} />
                </g>
                <text
                  fill="white"
                  fontSize="15"
                  fontWeight="900"
                  textAnchor="middle"
                  className="select-none font-sans uppercase"
                  stroke="#000"
                  strokeWidth="3"
                  paintOrder="stroke"
                  y="-36"
                >
                  {prize.label}
                </text>
                <text
                  fill={prize.award === 'Régua' ? '#fde047' : '#fef08a'}
                  fontSize="14"
                  fontWeight="900"
                  textAnchor="middle"
                  className="select-none font-sans uppercase"
                  stroke="#000"
                  strokeWidth="3"
                  paintOrder="stroke"
                  y="-17"
                >
                  {prize.award}
                </text>
              </>
            ) : (
              <>
                {/* pitch centre-circle motif */}
                <g stroke="#ffffff1f" strokeWidth="2" fill="none" transform="translate(0,-84)">
                  <circle r="18" />
                  <path d="M-30 0 L30 0" />
                  <circle r="2.5" fill="#ffffff33" />
                </g>
                <text fill="#cbd5e1" fontSize="16" fontWeight="900" textAnchor="middle" className="select-none font-sans uppercase tracking-wider" y="-30">
                  TENTA
                </text>
                <text fill="#94a3b8" fontSize="13" fontWeight="800" textAnchor="middle" className="select-none font-sans uppercase tracking-wider" y="-10">
                  OUTRA VEZ
                </text>
              </>
            )}
          </g>
        </g>
      );
    });
  }, [prizes, segmentAngle, endX, endY]);

  const bulbs = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return (
          <circle
            key={i}
            cx={Math.sin(a) * 256}
            cy={-Math.cos(a) * 256}
            r="6"
            fill={i % 2 ? '#facc15' : '#ffffff'}
            className={i % 2 ? 'bulb bulb-b' : 'bulb bulb-a'}
          />
        );
      }),
    []
  );

  return (
    <div className={`relative w-[460px] h-[460px] flex items-center justify-center ${isSpinning ? 'wheel-spinning' : ''}`}>
      {/* Glow behind the wheel (static) */}
      <div className="absolute rounded-full" style={{ inset: -30, background: 'radial-gradient(circle, rgba(250,204,21,0.28) 0%, rgba(250,204,21,0) 70%)' }} />

      {/* Rotating wheel - pure CSS transform for smooth TV playback */}
      <div
        className="relative w-full h-full"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: `transform ${SPIN_MS / 1000}s ${SPIN_EASING}`,
          willChange: 'transform',
        }}
      >
        <svg viewBox="-270 -270 540 540" className="w-full h-full overflow-visible">
          <defs>
            <pattern id="checker" width="16" height="16" patternUnits="userSpaceOnUse">
              <rect width="8" height="8" fill="#000" />
              <rect x="8" y="8" width="8" height="8" fill="#000" />
              <rect x="8" width="8" height="8" fill="#fff" />
              <rect y="8" width="8" height="8" fill="#fff" />
            </pattern>
          </defs>
          <circle r={R} fill="#0b1222" />
          {segments}
        </svg>
      </div>

      {/* Static rim with blinking bulbs */}
      <svg viewBox="-270 -270 540 540" className="absolute inset-0 w-full h-full overflow-visible z-10 pointer-events-none">
        <circle r="256" fill="none" stroke="#0f172a" strokeWidth="20" />
        <circle r="267" fill="none" stroke="#facc15" strokeWidth="3" />
        <circle r="245" fill="none" stroke="#facc15" strokeWidth="2" opacity="0.6" />
        {bulbs}
      </svg>

      {/* Gold pointer (top) */}
      <div className="absolute left-1/2 z-30" style={{ top: -30, transform: 'translateX(-50%)' }}>
        <svg viewBox="0 0 60 74" width="60" height="74">
          <path d="M6 6 L54 6 L54 30 L30 70 L6 30 Z" fill="#facc15" stroke="#0f172a" strokeWidth="4" strokeLinejoin="round" />
          <path d="M14 13 L46 13 L46 28 L30 56 L14 28 Z" fill="#dc2626" />
          <path d="M30 18 L32.6 25 L40 25 L34 29.5 L36.4 37 L30 32.5 L23.6 37 L26 29.5 L20 25 L27.4 25 Z" fill="#ffffff" />
        </svg>
      </div>
    </div>
  );
};

export default RouletteWheel;
