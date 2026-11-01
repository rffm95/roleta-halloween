export type SportId = 'futebol' | 'padel' | 'tenis' | 'basquete' | 'dardos' | 'f1';

export interface Prize {
  id: number;
  label: string;        // short name on the wheel
  name?: string;        // full name on panels / result screen
  award?: string;
  isWin: boolean;
  color: string;
  sport?: SportId;
  shout?: string;       // headline on the result screen
}

// Same prizes and odds as the original Cheers roulette:
// 3 x "3 finos", 2 x "1 fino", 1 x "Régua" and 6 x "Tenta outra vez" (12 equal slices).
export const PRIZES: Prize[] = [
  { id: 0, label: 'Futebol', name: 'Futebol', award: '3 finos', isWin: true, color: '#15803d', sport: 'futebol', shout: 'GOOOLO!' },
  { id: 1, label: 'Tenta outra vez', isWin: false, color: '#0b1222' },
  { id: 2, label: 'Padel', name: 'Padel', award: '3 finos', isWin: true, color: '#1d4ed8', sport: 'padel', shout: 'PONTO DE OURO!' },
  { id: 3, label: 'Tenta outra vez', isWin: false, color: '#0b1222' },
  { id: 4, label: 'Ténis', name: 'Ténis', award: '3 finos', isWin: true, color: '#c2410c', sport: 'tenis', shout: 'ACE!' },
  { id: 5, label: 'Tenta outra vez', isWin: false, color: '#0b1222' },
  { id: 6, label: 'Basquete', name: 'Basquetebol', award: '1 fino', isWin: true, color: '#6d28d9', sport: 'basquete', shout: 'CESTO!' },
  { id: 7, label: 'Tenta outra vez', isWin: false, color: '#0b1222' },
  { id: 8, label: 'Dardos', name: 'Dardos', award: '1 fino', isWin: true, color: '#b91c1c', sport: 'dardos', shout: 'NA MOUCHE!' },
  { id: 9, label: 'Tenta outra vez', isWin: false, color: '#0b1222' },
  { id: 10, label: 'Fórmula 1', name: 'Fórmula 1', award: 'Régua', isWin: true, color: '#a16207', sport: 'f1', shout: 'POLE POSITION!' },
  { id: 11, label: 'Tenta outra vez', isWin: false, color: '#0b1222' },
];

export const MISS_SHOUTS = ['FORA DE JOGO!', 'NA TRAVE!', 'FALTA!', 'BOLA FORA!', 'QUASE!'];
