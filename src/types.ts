export type SportId = 'futebol' | 'padel';

export interface Prize {
  id: number;
  label: string;        // name on panels / result screen
  award?: string;
  isWin: boolean;
  sport?: SportId;
  icon?: string;        // pre-rendered image in public/assets
  shout?: string;       // headline on the result screen
}

// Same prizes and odds as the original Cheers roulette:
// 3 x "3 finos", 2 x "1 fino", 1 x "Régua" and 6 x "Tenta outra vez" (12 equal slices).
// Order must match the pre-rendered wheel (scripts/render-assets.cjs): slice i sits at i*30..(i+1)*30 deg.
export const PRIZES: Prize[] = [
  { id: 0, label: 'Golo', award: '3 finos', isWin: true, sport: 'futebol', icon: 'icon-ball.png', shout: 'GOOOLO!' },
  { id: 1, label: 'Tenta outra vez', isWin: false },
  { id: 2, label: 'Smash', award: '3 finos', isWin: true, sport: 'padel', icon: 'icon-racket.png', shout: 'SMASH POR 3!' },
  { id: 3, label: 'Tenta outra vez', isWin: false },
  { id: 4, label: 'Penálti', award: '1 fino', isWin: true, sport: 'futebol', icon: 'icon-goal.png', shout: 'PENÁLTI MARCADO!' },
  { id: 5, label: 'Tenta outra vez', isWin: false },
  { id: 6, label: 'Ponto de Ouro', award: 'Régua', isWin: true, sport: 'padel', icon: 'icon-crossed.png', shout: 'PONTO DE OURO!' },
  { id: 7, label: 'Tenta outra vez', isWin: false },
  { id: 8, label: 'Canto', award: '3 finos', isWin: true, sport: 'futebol', icon: 'icon-corner.png', shout: 'GOLO OLÍMPICO!' },
  { id: 9, label: 'Tenta outra vez', isWin: false },
  { id: 10, label: 'Bandeja', award: '1 fino', isWin: true, sport: 'padel', icon: 'icon-racketball.png', shout: 'BANDEJA PERFEITA!' },
  { id: 11, label: 'Tenta outra vez', isWin: false },
];

export const MISSES: { shout: string; icon: string }[] = [
  { shout: 'NA TRAVE!', icon: 'icon-goal.png' },
  { shout: 'FORA DE JOGO!', icon: 'icon-ball.png' },
  { shout: 'AO LADO!', icon: 'icon-goal.png' },
  { shout: 'NA REDE!', icon: 'icon-net.png' },
  { shout: 'BOLA FORA!', icon: 'icon-padelball.png' },
  { shout: 'DUPLA FALTA!', icon: 'icon-net.png' },
];

export const asset = (file: string) => `${import.meta.env.BASE_URL}assets/${file}`;
