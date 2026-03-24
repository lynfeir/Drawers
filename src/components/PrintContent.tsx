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

            const hg: Record<number, CutPiece[]> = {};
            const bottomPieces: { w: number; d: number; label: string; count: number }[] = [];
            const cutLines: {
              qty: number;
              fb: string;
              side: string;
              bot: string;
              height: number;
            }[] = [];

            list.drawers.forEach((d) => {
              const c = calcDrawer(d);
              if (!isNaN(c.cutW) && !isNaN(c.cutD)) {
                cutLines.push({
                  qty: d.qty,
                  fb: dd(c.cutW),
                  side: dd(c.cutD),
                  bot: `${dd(c.botW)} \u00d7 ${dd(c.botD)}`,
                  height: d.height,
                });
                if (!hg[d.height]) hg[d.height] = [];
                hg[d.height].push({ len: c.cutW, label: `F/B ${dd(c.cutW)}`, count: 2 * d.qty });
                hg[d.height].push({ len: c.cutD, label: `S ${dd(c.cutD)}`, count: 2 * d.qty });

                const botLabel = `${dd(c.botW)} \u00d7 ${dd(c.botD)}`;
                const existing = bottomPieces.find((b) => b.label === botLabel);
                if (existing) existing.count += d.qty;
                else bottomPieces.push({ w: c.botW, d: c.botD, label: botLabel, count: d.qty });
              }
            });

            const grouped: typeof cutLines = [];
            cutLines.forEach((cl) => {
              const match = grouped.find(
                (g) => g.fb === cl.fb && g.side === cl.side && g.bot === cl.bot && g.height === cl.height
              );
              if (match) match.qty += cl.qty;
              else grouped.push({ ...cl });
            });

            const sheets = bottomPieces.length > 0 ? optimizeSheets(bottomPieces, 96, 48) : [];
            const totalBottoms = bottomPieces.reduce((sum, p) => sum + p.count, 0);
            const totalSheetUsed = sheets.reduce((sum, s) => sum + s.usedArea, 0);
            const totalSheetArea = sheets.length * 96 * 48;
            let tB = 0;
            let tW = 0;

            // Pre-calculate board counts for the summary line
            const boardCounts: string[] = [];
            [4, 6, 8, 10].forEach((ht) => {
              const pcs = hg[ht];
              if (!pcs || !pcs.length || pcs.every((p) => p.count === 0)) return;
              const n = optimizeCuts(pcs, 96).length;
              boardCounts.push(`${n}\u00d7${ht}"`);
            });

            return (
              <div key={list.id}>
                <h2>{list.name}</h2>

                {/* BUY LINE — compact material summary */}
                <div style={{
                  background: '#f0f0f0', border: '1.5px solid #333', borderRadius: 3,
                  padding: '3px 6px', margin: '2px 0 6px', fontWeight: 700, fontSize: 9,
                  display: 'flex', gap: 12, flexWrap: 'wrap',
                }}>
                  <span>BUY:</span>
                  {boardCounts.map((bc, i) => (
                    <span key={i}>{bc} boards</span>
                  ))}
                  {sheets.length > 0 && (
                    <span>{sheets.length}\u00d7 4&prime;&times;8&prime; ply</span>
                  )}
                  <span style={{ marginLeft: 'auto' }}>Bottoms: {totalBottoms}</span>
                </div>

                {/* CUT LIST — compact table */}
                <h3>Cut List</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Qty</th>
                      <th>F/B</th>
                      <th>Side</th>
                      <th>Bottom</th>
                      <th>Ht</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped.map((g, i) => (
                      <tr key={i}>
                        <td className="mono" style={{ fontWeight: 700 }}>{g.qty}</td>
                        <td className="mono">{g.fb}</td>
                        <td className="mono">{g.side}</td>
                        <td className="mono">{g.bot}</td>
                        <td>{g.height}&quot;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* BOARD LAYOUTS — compact bars */}
                <h3>Board Layout (96&quot;)</h3>
                {[4, 6, 8, 10].map((ht) => {
                  const pcs = hg[ht];
                  if (!pcs || !pcs.length || pcs.every((p) => p.count === 0)) return null;
                  const boards = optimizeCuts(pcs, 96);
                  tB += boards.length;
                  return (
                    <div key={ht}>
                      <div style={{ fontWeight: 700, fontSize: 9, margin: '4px 0 1px' }}>
                        {ht}&quot; &mdash; {boards.length} board{boards.length !== 1 ? 's' : ''}
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

                {/* SHEET LAYOUTS — compact */}
                {sheets.length > 0 && (
                  <>
                    <h3>Plywood Sheets (48&quot;&times;96&quot;)</h3>
                    {sheets.map((s, si) => (
                      <div key={si}>
                        <div style={{ fontWeight: 600, fontSize: 8, margin: '3px 0 1px' }}>
                          Sheet {si + 1} &mdash; {s.pieces.length} pc,{' '}
                          {((s.usedArea / s.totalArea) * 100).toFixed(0)}%
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

                {/* SUMMARY — single compact line */}
                <div style={{
                  borderTop: '1.5px solid #333', padding: '3px 0', marginTop: 4,
                  fontWeight: 600, fontSize: 9, display: 'flex', gap: 10, flexWrap: 'wrap',
                }}>
                  <span>Boards: {tB}</span>
                  {sheets.length > 0 && <span>Sheets: {sheets.length}</span>}
                  <span>Bottoms: {totalBottoms}</span>
                  <span>Drop: {dd(tW)}&quot;</span>
                  {sheets.length > 0 && totalSheetArea > 0 && (
                    <span>Ply usage: {((totalSheetUsed / totalSheetArea) * 100).toFixed(0)}%</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
