'use client';

import { Job } from '@/lib/types';
import { calcDrawer, dd, optimizeSheets } from '@/lib/math';

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

            // Pieces for sheets
            const boxPieces: { w: number; d: number; label: string; count: number }[] = [];
            const bottomPieces: { w: number; d: number; label: string; count: number }[] = [];
            groups.forEach((g) => {
              boxPieces.push({ w: g.cutW, d: g.height, label: `FB ${dd(g.cutW)}x${dd(g.height)}`, count: 2 * g.totalQty });
              boxPieces.push({ w: g.cutD, d: g.height, label: `S ${dd(g.cutD)}x${dd(g.height)}`, count: 2 * g.totalQty });
              const botLabel = `${dd(g.botW)} \u00d7 ${dd(g.botD)}`;
              const existing = bottomPieces.find((b) => b.label === botLabel);
              if (existing) existing.count += g.totalQty;
              else bottomPieces.push({ w: g.botW, d: g.botD, label: botLabel, count: g.totalQty });
            });

            const boxSheets = boxPieces.length > 0 ? optimizeSheets(boxPieces, 96, 48) : [];
            const bottomSheets = bottomPieces.length > 0 ? optimizeSheets(bottomPieces, 96, 48) : [];
            const totalDrawers = groups.reduce((sum, g) => sum + g.totalQty, 0);
            const totalBoxUsed = boxSheets.reduce((sum, s) => sum + s.usedArea, 0);
            const totalBoxArea = boxSheets.length * 96 * 48;
            const totalBotUsed = bottomSheets.reduce((sum, s) => sum + s.usedArea, 0);
            const totalBotArea = bottomSheets.length * 96 * 48;

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
                  {boxSheets.length > 0 && <span>{boxSheets.length}\u00d7 box sheet{boxSheets.length !== 1 ? 's' : ''}</span>}
                  {bottomSheets.length > 0 && <span>{bottomSheets.length}\u00d7 bottom sheet{bottomSheets.length !== 1 ? 's' : ''}</span>}
                  <span style={{ marginLeft: 'auto' }}>{totalDrawers} drawer{totalDrawers !== 1 ? 's' : ''}</span>
                </div>

                {/* DRAWER CUT LIST */}
                <h3>Cut List</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Qty</th>
                      <th>Part</th>
                      <th>Size</th>
                      <th>Slide</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g, i) => (
                      <>
                        <tr key={`fb-${i}`}>
                          <td className="mono" style={{ fontWeight: 700 }}>{2 * g.totalQty}</td>
                          <td>F/B</td>
                          <td className="mono">{dd(g.cutW)} &times; {dd(g.height)}&quot;</td>
                          <td rowSpan={3} style={{ verticalAlign: 'middle', fontWeight: 600 }}>{g.slideSize}&quot;</td>
                        </tr>
                        <tr key={`s-${i}`}>
                          <td className="mono" style={{ fontWeight: 700 }}>{2 * g.totalQty}</td>
                          <td>Side</td>
                          <td className="mono">{dd(g.cutD)} &times; {dd(g.height)}&quot;</td>
                        </tr>
                        <tr key={`b-${i}`} style={{ borderBottom: '2px solid #999' }}>
                          <td className="mono" style={{ fontWeight: 700 }}>{g.totalQty}</td>
                          <td>Bottom</td>
                          <td className="mono">{dd(g.botW)} &times; {dd(g.botD)}</td>
                        </tr>
                      </>
                    ))}
                  </tbody>
                </table>

                {/* BOX SHEET LAYOUTS */}
                {boxSheets.length > 0 && (
                  <>
                    <h3>Box Sheets (48&quot;&times;96&quot;)</h3>
                    {boxSheets.map((s, si) => (
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

                {/* BOTTOM SHEET LAYOUTS */}
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

                {/* SUMMARY LINE */}
                <div style={{
                  borderTop: '1.5px solid #333', padding: '3px 0', marginTop: 4,
                  fontWeight: 600, fontSize: 9, display: 'flex', gap: 10, flexWrap: 'wrap',
                }}>
                  <span>{totalDrawers} drawer{totalDrawers !== 1 ? 's' : ''}</span>
                  <span>Box: {boxSheets.length} sheet{boxSheets.length !== 1 ? 's' : ''}
                    {totalBoxArea > 0 && ` (${((totalBoxUsed / totalBoxArea) * 100).toFixed(0)}%)`}
                  </span>
                  <span>Bottom: {bottomSheets.length} sheet{bottomSheets.length !== 1 ? 's' : ''}
                    {totalBotArea > 0 && ` (${((totalBotUsed / totalBotArea) * 100).toFixed(0)}%)`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
