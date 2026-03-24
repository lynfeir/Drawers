'use client';

import { CutList, CutPiece } from '@/lib/types';
import { calcDrawer, dd, optimizeCuts, optimizeSheets } from '@/lib/math';

interface CutSummaryProps {
  list: CutList;
  onPrint: () => void;
}

export default function CutSummary({ list, onPrint }: CutSummaryProps) {
  const groups: Record<number, CutPiece[]> = {};
  const bottomPieces: { w: number; d: number; label: string; count: number }[] = [];

  list.drawers.forEach((d) => {
    const c = calcDrawer(d);
    if (isNaN(c.cutW) || isNaN(c.cutD)) return;
    if (!groups[d.height]) groups[d.height] = [];
    groups[d.height].push({ len: c.cutW, label: `F/B ${dd(c.cutW)}`, count: 2 * d.qty });
    groups[d.height].push({ len: c.cutD, label: `S ${dd(c.cutD)}`, count: 2 * d.qty });

    const botLabel = `${dd(c.botW)} \u00d7 ${dd(c.botD)}`;
    const existing = bottomPieces.find((b) => b.label === botLabel);
    if (existing) {
      existing.count += d.qty;
    } else {
      bottomPieces.push({ w: c.botW, d: c.botD, label: botLabel, count: d.qty });
    }
  });

  // Board optimization
  const boardSections: { height: number; boards: ReturnType<typeof optimizeCuts> }[] = [];
  let totalBoards = 0;
  let totalWaste = 0;

  for (const ht of [4, 6, 8, 10]) {
    const pcs = groups[ht];
    if (!pcs || !pcs.length || pcs.every((p) => p.count === 0)) continue;
    const boards = optimizeCuts(pcs, 96);
    totalBoards += boards.length;
    boards.forEach((b) => (totalWaste += b.remaining));
    boardSections.push({ height: ht, boards });
  }

  // Sheet optimization for bottoms
  const sheets = bottomPieces.length > 0 ? optimizeSheets(bottomPieces, 96, 48) : [];
  const totalBottoms = bottomPieces.reduce((sum, p) => sum + p.count, 0);
  const totalSheetUsed = sheets.reduce((sum, s) => sum + s.usedArea, 0);
  const totalSheetArea = sheets.length * 96 * 48;

  // Parts list
  const partsRows: { qty: number; part: string; size: string; stock: string }[] = [];
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
        stock: `${ht}" stock`,
      });
    });
  }
  bottomPieces.forEach((b) => {
    partsRows.push({ qty: b.count, part: 'Bottom', size: b.label, stock: '1/4" ply' });
  });

  return (
    <div className="card">
      <div className="card-header">
        <h2>Cut Plan</h2>
        <button className="btn btn-accent btn-sm" onClick={onPrint} style={{ flexShrink: 0 }}>
          Print Cut List
        </button>
      </div>
      <div className="card-body">

        {/* MATERIAL LIST */}
        <div className="plan-section">
          <h3 className="plan-heading">Material List</h3>
          <div className="material-grid">
            {boardSections.map((sec) => (
              <div className="material-item" key={sec.height}>
                <span className="material-qty">{sec.boards.length}</span>
                <span>96&quot; board{sec.boards.length !== 1 ? 's' : ''} &mdash; {sec.height}&quot; stock</span>
              </div>
            ))}
            {sheets.length > 0 && (
              <div className="material-item">
                <span className="material-qty">{sheets.length}</span>
                <span>4&prime;&times;8&prime; sheet{sheets.length !== 1 ? 's' : ''} &mdash; 1/4&quot; ply</span>
              </div>
            )}
          </div>
        </div>

        {/* BOARD CUTS */}
        {boardSections.map((sec) => (
          <div className="plan-section" key={sec.height}>
            <h3 className="plan-heading">
              {sec.height}&quot; Stock &mdash; {sec.boards.length} board{sec.boards.length !== 1 ? 's' : ''}
            </h3>
            {sec.boards.map((b, bi) => (
              <div className="board-row mono" key={bi}>
                {b.pieces.map((p, pi) => {
                  const pct = ((p.len / 96) * 100).toFixed(1);
                  return (
                    <div key={pi} className="board-piece" style={{ width: `${pct}%` }} title={p.label}>
                      {p.label}
                    </div>
                  );
                })}
                <div className="board-drop">{dd(b.remaining)}&quot; drop</div>
              </div>
            ))}
          </div>
        ))}

        {/* SHEET CUTS */}
        {sheets.length > 0 && (
          <div className="plan-section">
            <h3 className="plan-heading">
              1/4&quot; Plywood Sheets
              <span className="plan-subtext">48&quot; &times; 96&quot;</span>
            </h3>
            {sheets.map((s, si) => (
              <div key={si}>
                <div className="sheet-label">
                  Sheet {si + 1} &mdash; {s.pieces.length} piece{s.pieces.length !== 1 ? 's' : ''},{' '}
                  {((s.usedArea / s.totalArea) * 100).toFixed(0)}% used
                </div>
                <div className="sheet-layout">
                  {s.pieces.map((p, pi) => (
                    <div
                      key={pi}
                      className="sheet-piece"
                      style={{
                        left: `${(p.x / 96) * 100}%`,
                        top: `${(p.y / 48) * 100}%`,
                        width: `${(p.w / 96) * 100}%`,
                        height: `${(p.h / 48) * 100}%`,
                      }}
                      title={p.label}
                    >
                      <span className="sheet-piece-label">{p.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PARTS REFERENCE */}
        <div className="plan-section">
          <h3 className="plan-heading">Parts Reference</h3>
          <table className="drawer-table">
            <thead>
              <tr>
                <th>Qty</th>
                <th>Part</th>
                <th>Size</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {partsRows.map((r, i) => (
                <tr key={i}>
                  <td className="mono" style={{ fontWeight: 700 }}>{r.qty}</td>
                  <td>{r.part}</td>
                  <td className="calc">{r.size}</td>
                  <td>{r.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SUMMARY */}
        <div className="summary-box">
          <strong>Total:</strong> {totalBoards} board{totalBoards !== 1 ? 's' : ''}
          {sheets.length > 0 && <> + {sheets.length} plywood sheet{sheets.length !== 1 ? 's' : ''}</>}
          <br />
          <strong>Board waste:</strong> {dd(totalWaste)}&quot;
          {sheets.length > 0 && totalSheetArea > 0 && (
            <>
              <br />
              <strong>Plywood usage:</strong> {((totalSheetUsed / totalSheetArea) * 100).toFixed(0)}%
            </>
          )}
          <br />
          <strong>Total bottoms:</strong> {totalBottoms} piece{totalBottoms !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}
