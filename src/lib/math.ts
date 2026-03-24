import { Drawer, DrawerCalc, Board, CutPiece, Sheet, PlacedPiece } from './types';

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

export function getSlideSize(openDepth: number): number {
  if (isNaN(openDepth)) return 0;
  const clearance = 7 / 8;
  const maxSlide = openDepth - clearance;
  if (maxSlide < 12) return 0;
  return Math.floor(maxSlide / 3) * 3;
}

export function calcDrawer(d: Drawer): DrawerCalc {
  const ow = parseFraction(d.openWidth);
  const od = parseFraction(d.openDepth);
  const boxHeight = parseFraction(d.height);
  const slideSize = getSlideSize(od);
  return {
    cutW: ow - 7 / 16,
    cutD: slideSize > 0 ? slideSize - 27 / 32 : NaN,
    botW: (ow - 7 / 16) - 29 / 32,
    botD: slideSize > 0 ? (slideSize - 27 / 32) - 19 / 32 : NaN,
    height: boxHeight,
    slideSize: slideSize,
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

export function optimizeSheets(
  pieces: { w: number; d: number; label: string; count: number }[],
  sheetW: number,
  sheetH: number
): Sheet[] {
  const expanded: { w: number; h: number; label: string }[] = [];
  for (const p of pieces) {
    for (let i = 0; i < p.count; i++) {
      expanded.push({
        w: Math.min(p.w, p.d),
        h: Math.max(p.w, p.d),
        label: p.label,
      });
    }
  }
  expanded.sort((a, b) => (b.w * b.h) - (a.w * a.h));

  const sheets: Sheet[] = [];
  let remaining = [...expanded];

  while (remaining.length > 0) {
    const shelves: { y: number; height: number; xCursor: number }[] = [];
    const placed: PlacedPiece[] = [];
    const notPlaced: typeof remaining = [];

    for (const piece of remaining) {
      let didPlace = false;
      const orientations: { w: number; h: number }[] = [
        { w: piece.w, h: piece.h },
        { w: piece.h, h: piece.w },
      ];

      // Try existing shelves
      for (const o of orientations) {
        for (const shelf of shelves) {
          if (o.h <= shelf.height && shelf.xCursor + o.w <= sheetW) {
            placed.push({ x: shelf.xCursor, y: shelf.y, w: o.w, h: o.h, label: piece.label });
            shelf.xCursor += o.w;
            didPlace = true;
            break;
          }
        }
        if (didPlace) break;
      }

      // Try new shelf (prefer shortest height for more shelves per sheet)
      if (!didPlace) {
        const byShortestHeight = [...orientations].sort((a, b) => a.h - b.h);
        for (const o of byShortestHeight) {
          const shelfY = shelves.length === 0
            ? 0
            : shelves[shelves.length - 1].y + shelves[shelves.length - 1].height;
          if (shelfY + o.h <= sheetH && o.w <= sheetW) {
            shelves.push({ y: shelfY, height: o.h, xCursor: o.w });
            placed.push({ x: 0, y: shelfY, w: o.w, h: o.h, label: piece.label });
            didPlace = true;
            break;
          }
        }
      }

      if (!didPlace) notPlaced.push(piece);
    }

    if (placed.length === 0) break;

    const usedArea = placed.reduce((sum, p) => sum + p.w * p.h, 0);
    sheets.push({ pieces: placed, usedArea, totalArea: sheetW * sheetH });
    remaining = notPlaced;
  }

  return sheets;
}
