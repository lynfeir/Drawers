'use client';

import { Job, CutPiece } from '@/lib/types';
import { calcDrawer, dd, optimizeCuts, optimizeSheets } from '@/lib/math';

interface PrintContentProps {
  jobs: Job[];
}

export default function PrintContent({ jobs }: PrintContentProps) {
  return (
    <>
      {jobs.map((job) => (
        <div key={job.id}>
          <h1>{job.name}</h1>
          {job.lists.map((list) => {
            if (!list.drawers.length) return null;

            const calcs = list.drawers
              .map((d) => ({ drawer: d, calc: calcDrawer(d) }))
              .filter(({ calc }) => !isNaN(calc.cutW) && !isNaN(calc.cutD));

            if (calcs.length === 0) return null;

            // Group by unique config
            const groups: {
              cutW: number; cutD: number; height: number;
              slideSize: number; botW: number; botD: number; totalQty: number;
            }[] = [];
            calcs.forEach(({ calc }) => {
              const existing = groups.find(
                (g) => g.cutW === calc.cutW && g.cutD === calc.cutD && g.height === calc.height
              );
              if (existing) existing.totalQty += calc.qty;
              else groups.push({
                cutW: calc.cutW, cutD: calc.cutD, height: calc.height,
                slideSize: calc.slideSize, botW: calc.botW, botD: calc.botD,
                totalQty: calc.qty,
              });
            });

            // Board optimization for F/B + Sides
            const boardGroups: Record<string, CutPiece[]> = {};
            groups.forEach((g) => {
              const htKey = String(g.height);
              if (!boardGroups[htKey]) boardGroups[htKey] = [];
              boardGroups[htKey].push({ len: g.cutW, label: `F/B ${dd(g.cutW)}`, count: 2 * g.totalQty });
              boardGroups[htKey].push({ len: g.cutD, label: `S ${dd(g.cutD)}`, count: 2 * g.totalQty });
            });

            let tB = 0;
            let tW = 0;

            // Bottom sheet optimization
            const bottomPieces: { w: number; d: number; label: string; count: number }[] = [];
            groups.forEach((g) => {
              const botLabel = `${dd(g.botW)} \u00d7 ${dd(g.botD)}`;
              const existing = bottomPieces.find((b) => b.label === botLabel);
              if (existing) existing.count += g.totalQty;
              else bottomPieces.push({ w: g.botW, d: g.botD, label: botLabel, count: g.totalQty });
            });
            const bottomSheets = bottomPieces.length > 0 ? optimizeSheets(bottomPieces, 96, 48) : [];
            const totalDrawers = groups.reduce((sum, g) => sum + g.totalQty, 0);
            const totalBottoms = bottomPieces.reduce((sum, p) => sum + p.count, 0);
            const totalFB = groups.reduce((sum, g) => sum + 2 * g.totalQty, 0);

            return (
              <div key={list.id}>
                <h2>{list.name}</h2>

                {/* BUY LINE */}
                <div style={{
                  background: '#f0f0f0', border: '1.5px solid #333', borderRadius: 3,
                  padding: '3px 6px', margin: '2px 0 6px', fontWeight: 700, fontSize: 9,
                  display: 'flex', gap: 12, flexWrap: 'wrap',
                }}>
                  <span>BUY:</span>
                  {Object.keys(boardGroups).map((htKey) => {
                    const pcs = boardGroups[htKey];
                    if (!pcs.length) return null;
                    const boards = optimizeCuts(pcs, 96);
                    return <span key={htKey}>{boards.length}\u00d7 {dd(parseFloat(htKey))}&quot; boards</span>;
                  })}
                  {bottomSheets.length > 0 && <span>{bottomSheets.length}\u00d7 4&prime;&times;8&prime; ply</span>}
                  <span style={{ marginLeft: 'auto' }}>{totalDrawers} drawer{totalDrawers !== 1 ? 's' : ''} | {totalFB * 2 + totalBottoms} pcs</span>
                </div>

                {/* CUT LIST per drawer config */}
                <h3>Cut List</h3>
                <table>
                  <thead>
                    <tr><th>Qty</th><th>Part</th><th>Size</th><th>Slide</th></tr>
                  </thead>
                  <tbody>
                    {groups.map((g, i) => (
                      <tbody key={i}>
                        <tr>
                          <td className="mono" style={{ fontWeight: 700 }}>{2 * g.totalQty}</td>
                          <td>F/B</td>
                          <td className="mono">{dd(g.cutW)} &times; {dd(g.height)}&quot;</td>
                          <td rowSpan={3} style={{ verticalAlign: 'middle', fontWeight: 600 }}>{g.slideSize}&quot;</td>
                        </tr>
                        <tr>
                          <td className="mono" style={{ fontWeight: 700 }}>{2 * g.totalQty}</td>
                          <td>Side</td>
                          <td className="mono">{dd(g.cutD)} &times; {dd(g.height)}&quot;</td>
                        </tr>
                        <tr style={{ borderBottom: '2px solid #999' }}>
                          <td className="mono" style={{ fontWeight: 700 }}>{g.totalQty}</td>
                          <td>Bottom</td>
                          <td className="mono">{dd(g.botW)} &times; {dd(g.botD)}</td>
                        </tr>
                      </tbody>
                    ))}
                  </tbody>
                </table>

                {/* BOARD LAYOUTS — 96" boards */}
                <h3>Board Layout (96&quot;)</h3>
                {Object.keys(boardGroups).map((htKey) => {
                  const pcs = boardGroups[htKey];
                  if (!pcs.length || pcs.every((p) => p.count === 0)) return null;
                  const boards = optimizeCuts(pcs, 96);
                  tB += boards.length;
                  return (
                    <div key={htKey}>
                      <div style={{ fontWeight: 700, fontSize: 9, margin: '4px 0 1px' }}>
                        {dd(parseFloat(htKey))}&quot; &mdash; {boards.length} board{boards.length !== 1 ? 's' : ''}
                      </div>
                      {boards.map((b, bi) => {
                        tW += b.remaining;
                        return (
                          <div key={bi} style={{
                            display: 'flex', height: 16, border: '1px solid #333',
                            margin: '1px 0', fontSize: 7, overflow: 'hidden',
                          }}>
                            {b.pieces.map((p, pi) => (
                              <div key={pi} style={{
                                width: `${((p.len / 96) * 100).toFixed(1)}%`,
                                background: '#ddd', borderRight: '1px solid #333',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                whiteSpace: 'nowrap', overflow: 'hidden',
                              }}>
                                {p.label}
                              </div>
                            ))}
                            <div style={{
                              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#999', fontStyle: 'italic',
                            }}>
                              {dd(b.remaining)}&quot;
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                {/* BOTTOM SHEETS */}
                {bottomSheets.length > 0 && (
                  <>
                    <h3>Bottom Sheets (48&quot;&times;96&quot;)</h3>
                    {bottomSheets.map((s, si) => (
                      <div key={si}>
                        <div style={{ fontWeight: 600, fontSize: 8, margin: '3px 0 1px' }}>
                          Sheet {si + 1} &mdash; {s.pieces.length} pc, {((s.usedArea / s.totalArea) * 100).toFixed(0)}%
                        </div>
                        <div style={{
                          position: 'relative', width: '100%', height: 70,
                          border: '1.5px solid #333', marginBottom: 4,
                        }}>
                          {s.pieces.map((p, pi) => (
                            <div key={pi} style={{
                              position: 'absolute',
                              left: `${(p.x / 96) * 100}%`,
                              top: `${(p.y / 48) * 100}%`,
                              width: `${(p.w / 96) * 100}%`,
                              height: `${(p.h / 48) * 100}%`,
                              border: '1px solid #333', background: '#eee',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 7, overflow: 'hidden',
                            }}>
                              {p.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* SUMMARY */}
                <div style={{
                  borderTop: '1.5px solid #333', padding: '3px 0', marginTop: 4,
                  fontWeight: 600, fontSize: 9, display: 'flex', gap: 10, flexWrap: 'wrap',
                }}>
                  <span>{totalDrawers} drawer{totalDrawers !== 1 ? 's' : ''}</span>
                  <span>Boards: {tB}</span>
                  <span>Drop: {dd(tW)}&quot;</span>
                  {bottomSheets.length > 0 && <span>Ply: {bottomSheets.length} sheet{bottomSheets.length !== 1 ? 's' : ''}</span>}
                  <span>Bottoms: {totalBottoms}</span>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
