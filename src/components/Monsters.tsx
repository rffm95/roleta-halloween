import React from 'react';
import { MonsterId } from '../types';

// Hand-drawn inline SVG monsters (viewBox 0 0 100 100).
// No emoji / external images, so they render identically on any TV browser.

export const MonsterShapes: React.FC<{ id: MonsterId }> = ({ id }) => {
  switch (id) {
    case 'abobora':
      return (
        <g>
          <path d="M50 22 C47 12 52 6 58 4 L60 8 C55 10 54 15 55 22 Z" fill="#4d7c0f" />
          <ellipse cx="30" cy="58" rx="22" ry="32" fill="#ea580c" />
          <ellipse cx="70" cy="58" rx="22" ry="32" fill="#ea580c" />
          <ellipse cx="50" cy="58" rx="24" ry="34" fill="#f97316" />
          <path d="M50 26 C44 40 44 76 50 92" stroke="#c2410c" strokeWidth="2.5" fill="none" />
          <path d="M28 46 L40 46 L34 36 Z" fill="#1c0a00" />
          <path d="M60 46 L72 46 L66 36 Z" fill="#1c0a00" />
          <path d="M46 56 L54 56 L50 50 Z" fill="#1c0a00" />
          <path d="M24 64 L32 70 L38 64 L44 72 L50 66 L56 72 L62 64 L68 70 L76 64 C72 82 28 82 24 64 Z" fill="#1c0a00" />
          <path d="M30 46 L38 46 L34 40 Z" fill="#fde047" opacity="0.85" />
          <path d="M62 46 L70 46 L66 40 Z" fill="#fde047" opacity="0.85" />
        </g>
      );
    case 'bruxa':
      return (
        <g>
          <ellipse cx="50" cy="80" rx="46" ry="11" fill="#1e1b4b" />
          <path d="M22 78 C34 60 38 34 46 18 C50 10 62 4 72 10 C62 12 58 22 58 34 C60 52 70 66 78 78 Z" fill="#2e1065" />
          <path d="M28 72 C40 68 62 68 74 72 L76 78 C60 74 42 74 26 78 Z" fill="#a855f7" />
          <rect x="44" y="68" width="14" height="10" rx="2" fill="#fde047" />
          <rect x="48" y="71" width="6" height="4" fill="#2e1065" />
          <ellipse cx="50" cy="80" rx="46" ry="11" fill="none" stroke="#4c1d95" strokeWidth="2" />
          <circle cx="40" cy="44" r="2" fill="#fde047" />
          <circle cx="52" cy="30" r="1.6" fill="#fde047" />
        </g>
      );
    case 'zombie':
      return (
        <g>
          <path d="M20 40 C20 14 80 14 80 40 L80 70 C80 90 20 90 20 70 Z" fill="#84cc16" />
          <path d="M20 40 C26 26 40 22 50 30 C58 20 74 24 80 40 C76 30 66 30 60 36 C52 28 38 30 32 38 C28 32 22 36 20 40 Z" fill="#365314" />
          <circle cx="36" cy="52" r="10" fill="#f7fee7" />
          <circle cx="38" cy="54" r="4" fill="#111" />
          <path d="M58 46 L72 58 M72 46 L58 58" stroke="#111" strokeWidth="4" strokeLinecap="round" />
          <path d="M30 72 L70 72" stroke="#1a2e05" strokeWidth="4" strokeLinecap="round" />
          <path d="M36 66 L36 78 M46 66 L46 78 M56 66 L56 78 M64 66 L64 78" stroke="#1a2e05" strokeWidth="2.5" />
          <path d="M70 30 L78 38 M74 28 L72 36" stroke="#3f6212" strokeWidth="2" />
        </g>
      );
    case 'vampiro':
      return (
        <g>
          <path d="M8 92 L22 50 L50 66 L78 50 L92 92 Z" fill="#7f1d1d" />
          <path d="M26 44 C26 18 74 18 74 44 L74 62 C74 82 26 82 26 62 Z" fill="#e2e8f0" />
          <path d="M24 42 C24 12 76 12 76 42 C70 32 62 28 50 38 C38 28 30 32 24 42 Z" fill="#0b0b0f" />
          <path d="M34 50 L46 54 L34 56 Z" fill="#dc2626" />
          <path d="M66 50 L54 54 L66 56 Z" fill="#dc2626" />
          <path d="M38 68 C44 72 56 72 62 68" stroke="#7f1d1d" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M41 69 L44 77 L47 70 Z" fill="#fff" />
          <path d="M53 70 L56 77 L59 69 Z" fill="#fff" />
          <circle cx="45" cy="80" r="1.6" fill="#dc2626" />
        </g>
      );
    case 'fantasma':
      return (
        <g>
          <path d="M22 50 C22 14 78 14 78 50 L78 90 L68 82 L59 92 L50 82 L41 92 L32 82 L22 90 Z" fill="#f8fafc" />
          <path d="M22 50 C22 14 78 14 78 50 L78 58 C70 40 30 40 22 58 Z" fill="#ffffff" />
          <ellipse cx="39" cy="48" rx="6" ry="9" fill="#0f172a" />
          <ellipse cx="61" cy="48" rx="6" ry="9" fill="#0f172a" />
          <ellipse cx="50" cy="68" rx="7" ry="9" fill="#0f172a" />
          <circle cx="30" cy="60" r="4" fill="#fda4af" opacity="0.8" />
          <circle cx="70" cy="60" r="4" fill="#fda4af" opacity="0.8" />
        </g>
      );
    case 'caveira':
    default:
      return (
        <g>
          <path d="M18 46 C18 12 82 12 82 46 C82 60 74 64 72 70 L72 80 L28 80 L28 70 C26 64 18 60 18 46 Z" fill="#fde68a" />
          <path d="M18 46 C18 12 82 12 82 46 C76 28 24 28 18 46 Z" fill="#fef3c7" />
          <path d="M26 48 C26 38 44 38 44 50 C44 60 26 60 26 48 Z" fill="#1c1917" />
          <path d="M56 50 C56 38 74 38 74 48 C74 60 56 60 56 50 Z" fill="#1c1917" />
          <path d="M50 58 L45 68 L55 68 Z" fill="#1c1917" />
          <path d="M28 80 L28 92 L72 92 L72 80" fill="#fde68a" />
          <path d="M37 78 L37 92 M46 78 L46 92 M55 78 L55 92 M64 78 L64 92" stroke="#1c1917" strokeWidth="2.5" />
          <circle cx="35" cy="49" r="3" fill="#f97316" />
          <circle cx="65" cy="49" r="3" fill="#f97316" />
        </g>
      );
  }
};

export const MonsterIcon: React.FC<{ id: MonsterId; size?: number; className?: string }> = ({ id, size = 64, className }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
    <MonsterShapes id={id} />
  </svg>
);

export const Bat: React.FC<{ size?: number; color?: string }> = ({ size = 60, color = '#0a0510' }) => (
  <svg viewBox="0 0 100 50" width={size} height={size / 2}>
    <path
      d="M50 18 C46 10 44 10 42 14 C36 6 24 4 8 10 C18 14 20 22 18 30 C24 26 30 28 34 34 C38 28 44 28 50 36 C56 28 62 28 66 34 C70 28 76 26 82 30 C80 22 82 14 92 10 C76 4 64 6 58 14 C56 10 54 10 50 18 Z"
      fill={color}
    />
    <circle cx="47" cy="17" r="1.3" fill="#f97316" />
    <circle cx="53" cy="17" r="1.3" fill="#f97316" />
  </svg>
);

export const Web: React.FC<{ size?: number; flip?: boolean }> = ({ size = 220, flip }) => (
  <svg viewBox="0 0 200 200" width={size} height={size} style={flip ? { transform: 'scaleX(-1)' } : undefined}>
    <g stroke="rgba(226,232,240,0.28)" strokeWidth="1.5" fill="none">
      <path d="M0 0 L200 30 M0 0 L170 110 M0 0 L110 170 M0 0 L30 200" />
      <path d="M40 6 Q32 22 34 34 Q20 32 6 40" />
      <path d="M80 12 Q66 44 68 68 Q44 66 12 80" />
      <path d="M124 19 Q102 68 104 104 Q68 102 19 124" />
      <path d="M170 26 Q140 92 142 142 Q92 140 26 170" />
    </g>
  </svg>
);
