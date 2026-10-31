import React, { useMemo } from 'react';
import { Prize } from '../types';
import { MonsterShapes } from './Monsters';

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
          <path d={`M 0 0 L 0 -${R} A ${R} ${R} 0 0 1 ${endX} ${endY} Z`} fill={prize.color} stroke="#f9731633" strokeWidth="2" />

          <g transform={`rotate(${segmentAngle / 2} 0 0) translate(0, -135)`}>
            {prize.monster ? (
              <>
                <g transform="translate(-26, -110) scale(0.52)">
                  <MonsterShapes id={prize.monster} />
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
                  fill={prize.award === 'Régua' ? '#fde047' : '#fdba74'}
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
                {/* little cobweb in the "tenta outra vez" slices */}
                <g stroke="#a78bfa55" strokeWidth="1.2" fill="none" transform="translate(0,-82)">
                  <path d="M0 -26 L0 26 M-24 -12 L24 12 M-24 12 L24 -12" />
                  <path d="M0 -10 L9 -5 L9 5 L0 10 L-9 5 L-9 -5 Z" />
                  <path d="M0 -19 L16 -9 L16 9 L0 19 L-16 9 L-16 -9 Z" />
                </g>
                <text fill="#a3e635" fontSize="16" fontWeight="900" textAnchor="middle" className="select-none font-sans uppercase tracking-wider" y="-30">
                  TENTA
                </text>
                <text fill="#a3e635" fontSize="13" fontWeight="800" textAnchor="middle" className="select-none font-sans uppercase tracking-wider" y="-10">
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
            fill={i % 2 ? '#a855f7' : '#fb923c'}
            className={i % 2 ? 'bulb bulb-b' : 'bulb bulb-a'}
          />
        );
      }),
    []
  );

  return (
    <div className={`relative w-[460px] h-[460px] flex items-center justify-center ${isSpinning ? 'wheel-spinning' : ''}`}>
      {/* Glow behind the wheel (static) */}
      <div className="absolute rounded-full" style={{ inset: -30, background: 'radial-gradient(circle, rgba(249,115,22,0.35) 0%, rgba(249,115,22,0) 70%)' }} />

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
          <circle r={R} fill="#0d0a12" />
          {segments}
        </svg>
      </div>

      {/* Static rim with blinking bulbs */}
      <svg viewBox="-270 -270 540 540" className="absolute inset-0 w-full h-full overflow-visible z-10 pointer-events-none">
        <circle r="256" fill="none" stroke="#1c0a00" strokeWidth="18" />
        <circle r="256" fill="none" stroke="#ea580c" strokeWidth="3" />
        {bulbs}
      </svg>

      {/* Candy-corn pointer (top) */}
      <div className="absolute left-1/2 z-30" style={{ top: -26, transform: 'translateX(-50%)' }}>
        <svg viewBox="0 0 60 70" width="60" height="70">
          <path d="M4 4 L56 4 L30 66 Z" fill="#facc15" />
          <path d="M11.5 22 L48.5 22 L30 66 Z" fill="#f97316" />
          <path d="M20.7 44 L39.3 44 L30 66 Z" fill="#fef9c3" />
          <path d="M4 4 L56 4 L30 66 Z" fill="none" stroke="#1c0a00" strokeWidth="4" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
};

export default RouletteWheel;
