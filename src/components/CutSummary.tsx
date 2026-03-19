'use client';

import { CutList, CutPiece } from '@/lib/types';
import { calcDrawer, dd, optimizeCuts } from '@/lib/math';

interface CutSummaryProps {
  list: CutList;
  onPrint: () => void;
}

export default function CutSummary({ list, onPrint }: CutSummaryProps) {
  const groups: Record<number, CutPiece[]> = { 4: [], 6: [], 8: [], 10: [] };
  const bottoms: { w: number; d: number; label: string }[] = [];

  list.drawers.forEach((d) => {
    const c = calcDrawer(d);
    if (isNaN(c.cutW) || isNaN(c.cutD)) return;
    if (!groups[d.height]) groups[d.height] = [];
    groups[d.height].push({ len: c.cutW, label: `F/B ${dd(c.cutW)}`, count: 2 * d.qty });
    groups[d.height].push({ len: c.cutD, label: `S ${dd(c.cutD)}`, count: 2 * d.qty });
    for (let q = 0; q < d.qty; q++) {
      bottoms.push({ w: c.botW, d: c.botD, label: `${dd(c.botW)} \u00d7 ${dd(c.botD)}` });
    }
  });

  // Parts list
  const partsRows: { qty: number; part: string; size: string; height: string }[] = [];
  for (const ht of [4, 6, 8, 10]) {
    const pcs = groups[ht];
    if (!pcs || !pcs.length) continue;
    const partMap: Record<string, number> = {};
    pcs.forEach((p) => {
      if (partMap[p.label]) partMap[p.label] += p.count;
      else partMap[p.label] = p.count;
    });
    Object.keys(partMap).forEach((k) => {
      const isF = k.startsWith('F/B');
      partsRows.push({
        qty: partMap[k],
        part: isF ? 'Front/Back' : 'Side',
        size: k.replace(/^(F\/B|S)\s*/, ''),
        height: `${ht}"`,
      });
    });
  }

  const botGroups: Record<string, number> = {};
  bottoms.forEach((b) => {
    if (botGroups[b.label]) botGroups[b.label]++;
    else botGroups[b.label] = 1;
  });
  Object.keys(botGroups).forEach((k) => {
    partsRows.push({ qty: botGroups[k], part: 'Bottom', size: k, height: '\u2014' });
  });

  let totalBoards = 0;
  let totalWaste = 0;

  const boardSections: {
    height: number;
    boards: ReturnType<typeof optimizeCuts>;
  }[] = [];

  for (const ht of [4, 6, 8, 10]) {
    const pcs = groups[ht];
    if (!pcs || !pcs.length || pcs.every((p) => p.count === 0)) continue;
    const boards = optimizeCuts(pcs, 96);
    totalBoards += boards.length;
    boards.forEach((b) => (totalWaste += b.remaining));
    boardSections.push({ height: ht, boards });
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>Cut Optimization (96&quot; Boards)</h2>
        <button className="btn btn-accent btn-sm" onClick={onPrint} style={{ flexShrink: 0 }}>
          Print Cut List
        </button>
      </div>
      <div className="card-body">
        <div style={{ fontWeight: 700, fontSize: 15, margin: '8px 0 8px' }}>Parts List</div>
        <table className="drawer-table" style={{ marginBottom: 16 }}>
          <thead>
            <tr>
              <th>Qty</th>
              <th>Part</th>
              <th>Size</th>
              <th>Height</th>
            </tr>
          </thead>
          <tbody>
            {partsRows.map((r, i) => (
              <tr key={i}>
                <td className="mono" style={{ fontWeight: 700 }}>{r.qty}</td>
                <td>{r.part}</td>
                <td className="calc">{r.size}</td>
                <td>{r.height}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {boardSections.map((sec) => (
          <div key={sec.height}>
            <div style={{ fontWeight: 700, fontSize: 15, margin: '16px 0 8px' }}>
              {sec.height}&quot; Height &mdash; {sec.boards.length} board
              {sec.boards.length !== 1 ? 's' : ''}
            </div>
            {sec.boards.map((b, bi) => (
              <div className="board-row mono" key={bi}>
                {b.pieces.map((p, pi) => {
                  const pct = ((p.len / 96) * 100).toFixed(1);
                  return (
                    <div
                      key={pi}
                      className="board-piece"
                      style={{ width: `${pct}%` }}
                      title={p.label}
                    >
                      {p.label}
                    </div>
                  );
                })}
                <div className="board-drop">{dd(b.remaining)}&quot; drop</div>
              </div>
            ))}
          </div>
        ))}

        {bottoms.length > 0 && (
          <>
            <div style={{ fontWeight: 700, fontSize: 15, margin: '18px 0 8px' }}>
              Bottoms &mdash; {bottoms.length} piece{bottoms.length !== 1 ? 's' : ''}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.keys(botGroups).map((k) => (
                <span key={k} className="bottom-chip mono">
                  {botGroups[k]} @ {k}
                </span>
              ))}
            </div>
          </>
        )}

        <div className="summary-box">
          <strong>Total Boards:</strong> {totalBoards}
          {boardSections.map((sec) => (
            <span key={sec.height}>
              <br />
              {sec.height}&quot; stock: {sec.boards.length} board
              {sec.boards.length !== 1 ? 's' : ''}
            </span>
          ))}
          <br />
          <strong>Bottoms:</strong> {bottoms.length} piece{bottoms.length !== 1 ? 's' : ''}
          <br />
          <strong>Total drop waste:</strong> {dd(totalWaste)}&quot;
        </div>
      </div>
    </div>
  );
}
