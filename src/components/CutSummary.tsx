'use client';

import { CutList } from '@/lib/types';
import { calcDrawer, dd, optimizeSheets } from '@/lib/math';

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
        cutW: calc.cutW,
        cutD: calc.cutD,
        height: calc.height,
        slideSize: calc.slideSize,
        botW: calc.botW,
        botD: calc.botD,
        totalQty: calc.qty,
      });
    }
  });

  // Collect pieces for sheet optimization
  const boxPieces: { w: number; d: number; label: string; count: number }[] = [];
  const bottomPieces: { w: number; d: number; label: string; count: number }[] = [];

  groups.forEach((g) => {
    boxPieces.push({
      w: g.cutW,
      d: g.height,
      label: `FB ${dd(g.cutW)}x${dd(g.height)}`,
      count: 2 * g.totalQty,
    });
    boxPieces.push({
      w: g.cutD,
      d: g.height,
      label: `S ${dd(g.cutD)}x${dd(g.height)}`,
      count: 2 * g.totalQty,
    });

    const botLabel = `${dd(g.botW)} \u00d7 ${dd(g.botD)}`;
    const existing = bottomPieces.find((b) => b.label === botLabel);
    if (existing) {
      existing.count += g.totalQty;
    } else {
      bottomPieces.push({ w: g.botW, d: g.botD, label: botLabel, count: g.totalQty });
    }
  });

  const boxSheets = boxPieces.length > 0 ? optimizeSheets(boxPieces, 96, 48) : [];
  const bottomSheets = bottomPieces.length > 0 ? optimizeSheets(bottomPieces, 96, 48) : [];
  const totalBoxUsed = boxSheets.reduce((sum, s) => sum + s.usedArea, 0);
  const totalBoxArea = boxSheets.length * 96 * 48;
  const totalBotUsed = bottomSheets.reduce((sum, s) => sum + s.usedArea, 0);
  const totalBotArea = bottomSheets.length * 96 * 48;
  const totalDrawers = groups.reduce((sum, g) => sum + g.totalQty, 0);

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
            {boxSheets.length > 0 && (
              <div className="material-item">
                <span className="material-qty">{boxSheets.length}</span>
                <span>4&prime;&times;8&prime; sheet{boxSheets.length !== 1 ? 's' : ''} &mdash; box stock</span>
              </div>
            )}
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
          <h3 className="plan-heading">Drawer Breakdown</h3>
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
              <div className="mono" style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--text-dark)' }}>
                {2 * g.totalQty} F/B: {dd(g.cutW)} &times; {dd(g.height)}&quot;<br />
                {2 * g.totalQty} Side: {dd(g.cutD)} &times; {dd(g.height)}&quot;<br />
                {g.totalQty} Bottom: {dd(g.botW)} &times; {dd(g.botD)}
              </div>
            </div>
          ))}
        </div>

        {/* BOX SHEETS */}
        {boxSheets.length > 0 && (
          <div className="plan-section">
            <h3 className="plan-heading">
              Box Sheets
              <span className="plan-subtext">48&quot; &times; 96&quot;</span>
            </h3>
            {boxSheets.map((s, si) => (
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

        {/* BOTTOM SHEETS */}
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
          {' '}&mdash; {boxSheets.length} box sheet{boxSheets.length !== 1 ? 's' : ''}
          {bottomSheets.length > 0 && <> + {bottomSheets.length} bottom sheet{bottomSheets.length !== 1 ? 's' : ''}</>}
          {totalBoxArea > 0 && <><br /><strong>Box usage:</strong> {((totalBoxUsed / totalBoxArea) * 100).toFixed(0)}%</>}
          {totalBotArea > 0 && <> | <strong>Bottom usage:</strong> {((totalBotUsed / totalBotArea) * 100).toFixed(0)}%</>}
        </div>
      </div>
    </div>
  );
}
