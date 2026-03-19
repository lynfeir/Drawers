import { Drawer, DrawerCalc, Board, CutPiece } from './types';

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

export function parseFraction(str: string | number): number {
  if (typeof str === 'number') return str;
  str = String(str).trim();
  if (!str) return NaN;
  if (/^-?\d+(\.\d+)?$/.test(str)) return parseFloat(str);
  const m = str.match(/^(-?\d+)?\s*(?:(\d+)\/(\d+))?$/);
  if (!m) return NaN;
  const whole = m[1] ? parseInt(m[1]) : 0;
  const num = m[2] ? parseInt(m[2]) : 0;
  const den = m[3] ? parseInt(m[3]) : 1;
  if (den === 0) return NaN;
  return whole + num / den;
}

export function toFraction(dec: number): string {
  if (isNaN(dec)) return '?';
  const neg = dec < 0;
  if (neg) dec = -dec;
  const whole = Math.floor(dec);
  const rem = dec - whole;
  let num32 = Math.round(rem * 32);
  if (num32 === 32) return (neg ? '-' : '') + (whole + 1);
  if (num32 === 0) return (neg ? '-' : '') + String(whole);
  let num = num32;
  let den = 32;
  const g = gcd(num, den);
  num /= g;
  den /= g;
  return (neg ? '-' : '') + (whole ? whole + ' ' : '') + num + '/' + den;
}

export function dd(dec: number): string {
  return isNaN(dec) ? '—' : toFraction(dec);
}

export function calcDrawer(d: Drawer): DrawerCalc {
  const ow = parseFraction(d.openWidth);
  const od = parseFraction(d.openDepth);
  return {
    cutW: ow - 7 / 16,
    cutD: od - 1 / 4,
    botW: (ow - 7 / 16) - 29 / 32,
    botD: (od - 1 / 4) - 19 / 32,
    height: d.height,
    qty: d.qty || 1,
  };
}

export function optimizeCuts(pieces: CutPiece[], boardLen: number): Board[] {
  const expanded: { len: number; label: string }[] = [];
  pieces.forEach((p) => {
    for (let i = 0; i < p.count; i++) {
      expanded.push({ len: p.len, label: p.label });
    }
  });
  expanded.sort((a, b) => b.len - a.len);
  const boards: Board[] = [];
  expanded.forEach((p) => {
    let placed = false;
    for (const b of boards) {
      if (b.remaining >= p.len) {
        b.pieces.push(p);
        b.remaining -= p.len;
        placed = true;
        break;
      }
    }
    if (!placed) {
      boards.push({ pieces: [p], remaining: boardLen - p.len });
    }
  });
  return boards;
}
