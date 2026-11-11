import React, { useMemo } from 'react';
import { asset } from '../types';

interface RouletteWheelProps {
  rotation: number;
  isSpinning: boolean;
  size: number;
}

export const SPIN_MS = 6000;
export const SPIN_EASING = 'cubic-bezier(0.12, 1, 0.22, 1)';

// Everything here is a pre-rendered image. The face (grass, padel court, 3D balls and
// rackets, text) is ONE image, so spinning it is a single GPU transform. The gold rim,
// the hub and the pointer are static images on top, so their highlights never rotate.
const RouletteWheel: React.FC<RouletteWheelProps> = ({ rotation, isSpinning, size }) => {
  const face = Math.round(size * 0.866);
  const off = (size - face) / 2;
  const groups = useMemo(() => {
    const r = (size / 2) * (0.958 / 1.06);
    return [0, 1].map((grp) => (
      <div key={grp} className={`bulbs ${grp ? 'bulbs-b' : 'bulbs-a'}`}>
        {Array.from({ length: 12 }, (_, k) => {
          const a = ((k * 2 + grp) / 24) * Math.PI * 2;
          return <span key={k} className="bulb" style={{ left: size / 2 + Math.sin(a) * r, top: size / 2 - Math.cos(a) * r }} />;
        })}
      </div>
    ));
  }, [size]);

  return (
    <div className={`relative ${isSpinning ? 'wheel-spinning' : ''}`} style={{ width: size, height: size }}>
      <div className="wheel-glow" />
      <div className="wheel-shadow" />

      <div
        className="absolute"
        style={{
          left: off, top: off, width: face, height: face,
          borderRadius: '50%', overflow: 'hidden',
          transform: `rotate(${rotation}deg)`,
          transition: `transform ${SPIN_MS / 1000}s ${SPIN_EASING}`,
          willChange: 'transform',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
        }}
      >
        <img src={asset('wheel.jpg')} alt="" draggable={false} style={{ display: 'block', width: '100%', height: '100%' }} />
      </div>

      {/* static glass reflection over the spinning face */}
      <div className="wheel-gloss" style={{ left: off, top: off, width: face, height: face }} />

      <img src={asset('rim.png')} alt="" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" />
      {groups}

      <img src={asset('hub.png')} alt="" draggable={false} className="absolute" style={{ width: size * 0.21, height: size * 0.21, left: size * 0.395, top: size * 0.395 }} />
      <img src={asset('pointer.png')} alt="" draggable={false} className="absolute pointer" style={{ width: 72, height: 90, left: size / 2 - 36, top: -34 }} />
    </div>
  );
};

export default RouletteWheel;
