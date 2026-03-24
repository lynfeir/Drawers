'use client';

import { CutList, CutPiece } from '@/lib/types';
import { calcDrawer, dd, optimizeCuts, optimizeSheets } from '@/lib/math';

interface CutSummaryProps {
  list: CutList;
  onPrint: () => void;
}

interface DrawerGroup {
  cutW: number;
  cutD: number;
  height: number;
  slideSize: number;
  botW: number;
  botD: number;
  totalQty: number;
}

export default function CutSummary({ list, onPrint }: CutSummaryProps) {
  const calcs = list.drawers
    .map((d) => ({ drawer: d, calc: calcDrawer(d) }))
    .filter(({ calc }) => !isNaN(calc.cutW) && !isNaN(calc.cutD));

  if (calcs.length === 0) return null;

  // Group by unique drawer configuration
  const groups: DrawerGroup[] = [];
  calcs.forEach(({ calc }) => {
    const existing = groups.find(
      (g) => g.cutW === calc.cutW && g.cutD === calc.cutD && g.height === calc.height
    );
    if (existing) {
      existing.totalQty += calc.qty;
    } else {
      groups.push({
        cutW: calc.cutW, cutD: calc.cutD, height: calc.height,
        slideSize: calc.slideSize, botW: calc.botW, botD: calc.botD,
        totalQty: calc.qty,
      });
    }
  });

  // Board optimization: group F/B + Side cuts by box height onto 96" boards
  const boardGroups: Record<string, CutPiece[]> = {};
  groups.forEach((g) => {
    const htKey = String(g.height);
    if (!boardGroups[htKey]) boardGroups[htKey] = [];
    boardGroups[htKey].push({ len: g.cutW, label: `F/B ${dd(g.cutW)}`, count: 2 * g.totalQty });
    boardGroups[htKey].push({ len: g.cutD, label: `S ${dd(g.cutD)}`, count: 2 * g.totalQty });
  });

  const boardSections: { height: number; boards: ReturnType<typeof optimizeCuts> }[] = [];
  let totalBoards = 0;
  let totalWaste = 0;
  Object.keys(boardGroups).forEach((htKey) => {
    const pcs = boardGroups[htKey];
    if (!pcs.length || pcs.every((p) => p.count === 0)) return;
    const boards = optimizeCuts(pcs, 96);
    totalBoards += boards.length;
    boards.forEach((b) => (totalWaste += b.remaining));
    boardSections.push({ height: parseFloat(htKey), boards });
  });

  // Bottom sheet optimization onto 4x8 plywood
  const bottomPieces: { w: number; d: number; label: string; count: number }[] = [];
  groups.forEach((g) => {
    const botLabel = `${dd(g.botW)} \u00d7 ${dd(g.botD)}`;
    const existing = bottomPieces.find((b) => b.label === botLabel);
    if (existing) existing.count += g.totalQty;
    else bottomPieces.push({ w: g.botW, d: g.botD, label: botLabel, count: g.totalQty });
  });

  const bottomSheets = bottomPieces.length > 0 ? optimizeSheets(bottomPieces, 96, 48) : [];
  const totalBotUsed = bottomSheets.reduce((sum, s) => sum + s.usedArea, 0);
  const totalBotArea = bottomSheets.length * 96 * 48;
  const totalDrawers = groups.reduce((sum, g) => sum + g.totalQty, 0);
  const totalBottoms = bottomPieces.reduce((sum, p) => sum + p.count, 0);

  // Total pieces
  const totalFB = groups.reduce((sum, g) => sum + 2 * g.totalQty, 0);
  const totalSides = totalFB; // same count
  const totalPieces = totalFB + totalSides + totalBottoms;

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
                <span>96&quot; board{sec.boards.length !== 1 ? 's' : ''} &mdash; {dd(sec.height)}&quot; stock</span>
              </div>
            ))}
            {bottomSheets.length > 0 && (
              <div className="material-item">
                <span className="material-qty">{bottomSheets.length}</span>
                <span>4&prime;&times;8&prime; sheet{bottomSheets.length !== 1 ? 's' : ''} &mdash; 1/4&quot; ply</span>
              </div>
            )}
          </div>
        </div>

        {/* DRAWER BREAKDOWN */}
        <div className="plan-section">
          <h3 className="plan-heading">Drawer Breakdown &mdash; {totalPieces} pieces total</h3>
          {groups.map((g, i) => (
            <div key={i} style={{
              marginBottom: 10, padding: '8px 12px', background: '#faf8f5',
              borderRadius: 8, border: '1px solid var(--border)',
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
                <span>{g.totalQty}&times; drawer{g.totalQty !== 1 ? 's' : ''}</span>
                <span style={{ fontSize: 12, color: 'var(--accent-dark)' }}>{g.slideSize}&quot; slides</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{dd(g.height)}&quot; box</span>
              </div>
              <div className="mono" style={{ fontSize: 12, lineHeight: 1.8 }}>
                {2 * g.totalQty} F/B: {dd(g.cutW)} &times; {dd(g.height)}&quot;<br />
                {2 * g.totalQty} Side: {dd(g.cutD)} &times; {dd(g.height)}&quot;<br />
                {g.totalQty} Bottom: {dd(g.botW)} &times; {dd(g.botD)}
              </div>
            </div>
          ))}
        </div>

        {/* BOARD LAYOUTS — 96" boards for F/B + Sides */}
        {boardSections.map((sec) => (
          <div className="plan-section" key={sec.height}>
            <h3 className="plan-heading">
              {dd(sec.height)}&quot; Stock &mdash; {sec.boards.length} board{sec.boards.length !== 1 ? 's' : ''}
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

        {/* BOTTOM SHEETS — 4x8 plywood */}
        {bottomSheets.length > 0 && (
          <div className="plan-section">
            <h3 className="plan-heading">
              Bottom Sheets
              <span className="plan-subtext">1/4&quot; ply, 48&quot; &times; 96&quot;</span>
            </h3>
            {bottomSheets.map((s, si) => (
              <div key={si}>
                <div className="sheet-label">
                  Sheet {si + 1} &mdash; {s.pieces.length} pc, {((s.usedArea / s.totalArea) * 100).toFixed(0)}% used
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

        {/* SUMMARY */}
        <div className="summary-box">
          <strong>{totalDrawers} drawer{totalDrawers !== 1 ? 's' : ''}</strong>
          {' '}&mdash; {totalPieces} pieces
          <br />
          <strong>Boards:</strong> {totalBoards} ({boardSections.map((s) => `${s.boards.length}\u00d7${dd(s.height)}"`).join(', ')})
          {' '}| <strong>Drop:</strong> {dd(totalWaste)}&quot;
          {bottomSheets.length > 0 && (
            <>
              <br />
              <strong>Plywood:</strong> {bottomSheets.length} sheet{bottomSheets.length !== 1 ? 's' : ''}
              {totalBotArea > 0 && <> ({((totalBotUsed / totalBotArea) * 100).toFixed(0)}% used)</>}
              {' '}| <strong>Bottoms:</strong> {totalBottoms}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
