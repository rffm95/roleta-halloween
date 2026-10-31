export type MonsterId = 'abobora' | 'bruxa' | 'zombie' | 'vampiro' | 'fantasma' | 'caveira';

export interface Prize {
  id: number;
  label: string;        // short name shown on the wheel
  name?: string;        // full name shown on panels / win screen
  award?: string;
  isWin: boolean;
  color: string;
  monster?: MonsterId;
}

// Same prizes and odds as the original Cheers roulette:
// 3 x "3 finos", 2 x "1 fino", 1 x "Régua" and 6 x "Tenta outra vez" (12 equal slices).
export const PRIZES: Prize[] = [
  { id: 0, label: 'Abóbora', name: 'Abóbora Maldita', award: '3 finos', isWin: true, color: '#c2410c', monster: 'abobora' },
  { id: 1, label: 'Tenta outra vez', isWin: false, color: '#0d0a12' },
  { id: 2, label: 'Bruxa', name: 'Bruxa do Bairro', award: '3 finos', isWin: true, color: '#5b21b6', monster: 'bruxa' },
  { id: 3, label: 'Tenta outra vez', isWin: false, color: '#0d0a12' },
  { id: 4, label: 'Zombie', name: 'Zombie Sedento', award: '3 finos', isWin: true, color: '#3f6212', monster: 'zombie' },
  { id: 5, label: 'Tenta outra vez', isWin: false, color: '#0d0a12' },
  { id: 6, label: 'Vampiro', name: 'Conde Vampiro', award: '1 fino', isWin: true, color: '#9f1239', monster: 'vampiro' },
  { id: 7, label: 'Tenta outra vez', isWin: false, color: '#0d0a12' },
  { id: 8, label: 'Fantasma', name: 'Fantasma Bêbado', award: '1 fino', isWin: true, color: '#155e75', monster: 'fantasma' },
  { id: 9, label: 'Tenta outra vez', isWin: false, color: '#0d0a12' },
  { id: 10, label: 'Caveira', name: 'Caveira Dourada', award: 'Régua', isWin: true, color: '#a16207', monster: 'caveira' },
  { id: 11, label: 'Tenta outra vez', isWin: false, color: '#0d0a12' },
];
