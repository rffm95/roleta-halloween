import React from 'react';
import { SportId } from '../types';

// Hand-drawn inline SVG sport icons (viewBox 0 0 100 100).
// No emoji / external images, so they look the same on any TV browser.

export const SportShapes: React.FC<{ id: SportId }> = ({ id }) => {
  switch (id) {
    case 'futebol':
      return (
        <g>
          <circle cx="50" cy="50" r="40" fill="#ffffff" stroke="#111827" strokeWidth="3" />
          <path d="M50 34 L65 45 L59 62 L41 62 L35 45 Z" fill="#111827" />
          <path d="M50 34 L50 12 M65 45 L86 38 M59 62 L72 80 M41 62 L28 80 M35 45 L14 38" stroke="#111827" strokeWidth="3" />
          <path d="M40 11 L50 12 L60 11 L58 17 L42 17 Z" fill="#111827" />
          <path d="M86 38 L89 50 L84 58 L80 46 Z" fill="#111827" />
          <path d="M14 38 L11 50 L16 58 L20 46 Z" fill="#111827" />
          <path d="M72 80 L64 88 L72 86 L78 78 Z" fill="#111827" />
          <path d="M28 80 L36 88 L28 86 L22 78 Z" fill="#111827" />
          <ellipse cx="36" cy="28" rx="10" ry="5" fill="#ffffff" opacity="0.6" transform="rotate(-30 36 28)" />
        </g>
      );
    case 'padel':
      return (
        <g>
          <g transform="rotate(-35 50 50)">
            <rect x="44" y="66" width="12" height="28" rx="4" fill="#111827" />
            <rect x="44" y="66" width="12" height="5" fill="#e11d48" />
            <path d="M50 8 C72 8 78 28 76 44 C74 58 62 68 50 68 C38 68 26 58 24 44 C22 28 28 8 50 8 Z" fill="#f8fafc" stroke="#111827" strokeWidth="4" />
            <path d="M50 14 C66 14 70 30 69 42 C68 54 60 61 50 61 C40 61 32 54 31 42 C30 30 34 14 50 14 Z" fill="#38bdf8" />
            {[0, 1, 2, 3].map((r) =>
              [0, 1, 2].map((c) => <circle key={`${r}-${c}`} cx={41 + c * 9} cy={24 + r * 9} r="2.4" fill="#0c4a6e" />)
            )}
          </g>
          <circle cx="80" cy="78" r="11" fill="#d9f99d" stroke="#365314" strokeWidth="2.5" />
          <path d="M71 72 C77 76 77 84 72 88 M89 70 C83 74 83 82 88 86" stroke="#ffffff" strokeWidth="2.5" fill="none" />
        </g>
      );
    case 'tenis':
      return (
        <g>
          <circle cx="50" cy="50" r="38" fill="#d9f99d" />
          <circle cx="50" cy="50" r="38" fill="#bef264" />
          <path d="M22 24 C40 38 40 62 22 76" stroke="#ffffff" strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M78 24 C60 38 60 62 78 76" stroke="#ffffff" strokeWidth="6" fill="none" strokeLinecap="round" />
          <circle cx="50" cy="50" r="38" fill="none" stroke="#3f6212" strokeWidth="3" />
          <ellipse cx="38" cy="30" rx="9" ry="5" fill="#ffffff" opacity="0.45" transform="rotate(-30 38 30)" />
        </g>
      );
    case 'basquete':
      return (
        <g>
          <circle cx="50" cy="50" r="40" fill="#f97316" stroke="#1c1917" strokeWidth="3" />
          <path d="M10 50 L90 50 M50 10 L50 90" stroke="#1c1917" strokeWidth="3" />
          <path d="M22 20 C36 36 36 64 22 80 M78 20 C64 36 64 64 78 80" stroke="#1c1917" strokeWidth="3" fill="none" />
          <ellipse cx="34" cy="28" rx="9" ry="5" fill="#ffffff" opacity="0.35" transform="rotate(-35 34 28)" />
        </g>
      );
    case 'dardos':
      return (
        <g>
          <circle cx="46" cy="54" r="40" fill="#111827" />
          <circle cx="46" cy="54" r="34" fill="#16a34a" />
          <circle cx="46" cy="54" r="30" fill="#fef3c7" />
          <circle cx="46" cy="54" r="22" fill="#dc2626" />
          <circle cx="46" cy="54" r="18" fill="#fef3c7" />
          <circle cx="46" cy="54" r="8" fill="#16a34a" />
          <circle cx="46" cy="54" r="4" fill="#dc2626" />
          <path d="M46 54 L86 14" stroke="#e5e7eb" strokeWidth="4" strokeLinecap="round" />
          <path d="M80 10 L92 8 L90 20 Z M78 22 L92 20 L84 28 Z" fill="#facc15" />
        </g>
      );
    case 'f1':
    default:
      return (
        <g>
          {/* Checkered flag */}
          <path d="M18 10 L18 94" stroke="#e5e7eb" strokeWidth="5" strokeLinecap="round" />
          <path d="M20 12 C40 4 56 22 86 12 L86 58 C56 68 40 50 20 58 Z" fill="#ffffff" />
          <g fill="#111827">
            <path d="M20 12 C27 9 33 9 39 11 L39 27 C33 25 27 25 20 28 Z" />
            <path d="M39 27 C45 29 50 33 56 35 L56 51 C50 49 45 45 39 43 Z" />
            <path d="M56 19 C62 21 68 22 72 21 L72 37 C68 38 62 37 56 35 Z" />
            <path d="M72 37 C77 36 81 35 86 33 L86 49 C81 51 77 52 72 53 Z" />
            <path d="M20 43 C27 40 33 41 39 43 L39 59 C33 57 27 56 20 58 Z" />
          </g>
          <path d="M20 12 C40 4 56 22 86 12 L86 58 C56 68 40 50 20 58 Z" fill="none" stroke="#111827" strokeWidth="2" />
        </g>
      );
  }
};

export const SportIcon: React.FC<{ id: SportId; size?: number; className?: string }> = ({ id, size = 64, className }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
    <SportShapes id={id} />
  </svg>
);

export const Trophy: React.FC<{ size?: number }> = ({ size = 80 }) => (
  <svg viewBox="0 0 100 100" width={size} height={size}>
    <path d="M28 14 L72 14 L70 44 C68 58 60 64 50 64 C40 64 32 58 30 44 Z" fill="#facc15" stroke="#854d0e" strokeWidth="3" />
    <path d="M28 20 C14 20 12 40 30 46 M72 20 C86 20 88 40 70 46" stroke="#facc15" strokeWidth="6" fill="none" />
    <rect x="44" y="62" width="12" height="14" fill="#eab308" />
    <rect x="32" y="76" width="36" height="12" rx="3" fill="#854d0e" />
    <path d="M38 20 L40 44" stroke="#fef9c3" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
  </svg>
);

export const Whistle: React.FC<{ size?: number }> = ({ size = 120 }) => (
  <svg viewBox="0 0 100 100" width={size} height={size}>
    <path d="M14 30 L60 30 L60 46 L44 46" fill="#e5e7eb" stroke="#334155" strokeWidth="3" strokeLinejoin="round" />
    <circle cx="38" cy="58" r="26" fill="#e5e7eb" stroke="#334155" strokeWidth="3" />
    <circle cx="38" cy="58" r="8" fill="#334155" />
    <path d="M66 22 C76 14 86 14 92 20" stroke="#e5e7eb" strokeWidth="4" fill="none" strokeLinecap="round" />
    <path d="M70 34 L86 30 M70 44 L84 48" stroke="#facc15" strokeWidth="4" strokeLinecap="round" />
  </svg>
);
