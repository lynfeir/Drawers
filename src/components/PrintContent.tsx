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

            // Group cut lines
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
            let tB = 0;
            let tW = 0;

            return (
              <div key={list.id}>
                <h2>{list.name}</h2>

                <h3>Material List</h3>
                <table>
                  <thead>
                    <tr><th>Qty</th><th>Material</th></tr>
                  </thead>
                  <tbody>
                    {[4, 6, 8, 10].map((ht) => {
                      const pcs = hg[ht];
                      if (!pcs || !pcs.length || pcs.every((p) => p.count === 0)) return null;
                      const boards = optimizeCuts(pcs, 96);
                      return (
                        <tr key={ht}>
                          <td className="mono" style={{ fontWeight: 700 }}>{boards.length}</td>
                          <td>96&quot; board{boards.length !== 1 ? 's' : ''} &mdash; {ht}&quot; stock</td>
                        </tr>
                      );
                    })}
                    {sheets.length > 0 && (
                      <tr>
                        <td className="mono" style={{ fontWeight: 700 }}>{sheets.length}</td>
                        <td>4&prime;&times;8&prime; plywood sheet{sheets.length !== 1 ? 's' : ''} (1/4&quot;)</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <h3>Cut List</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Qty</th>
                      <th>F/B Length</th>
                      <th>Side Length</th>
                      <th>Bottom</th>
                      <th>Height</th>
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

                <h3>Board Cutting Layout (96&quot; Boards)</h3>
                {[4, 6, 8, 10].map((ht) => {
                  const pcs = hg[ht];
                  if (!pcs || !pcs.length || pcs.every((p) => p.count === 0)) return null;
                  const boards = optimizeCuts(pcs, 96);
                  tB += boards.length;
                  return (
                    <div key={ht}>
                      <div style={{ margin: '10px 0 6px', fontWeight: 700, fontSize: 14 }}>
                        {ht}&quot; Stock &mdash; {boards.length} board{boards.length !== 1 ? 's' : ''}
                      </div>
                      {boards.map((b, bi) => {
                        tW += b.remaining;
                        return (
                          <div
                            key={bi}
                            style={{
                              display: 'flex',
                              height: 24,
                              border: '1.5px solid #333',
                              margin: '4px 0',
                              fontSize: 10,
                              overflow: 'hidden',
                            }}
                          >
                            {b.pieces.map((p, pi) => (
                              <div
                                key={pi}
                                style={{
                                  width: `${((p.len / 96) * 100).toFixed(1)}%`,
                                  background: '#ddd',
                                  borderRight: '1.5px solid #333',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                }}
                              >
                                {p.label}
                              </div>
                            ))}
                            <div
                              style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#999',
                                fontStyle: 'italic',
                              }}
                            >
                              {dd(b.remaining)}&quot; drop
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                {sheets.length > 0 && (
                  <>
                    <h3>Plywood Sheet Layout (48&quot; &times; 96&quot;)</h3>
                    {sheets.map((s, si) => (
                      <div key={si}>
                        <div style={{ margin: '8px 0 4px', fontWeight: 600, fontSize: 12 }}>
                          Sheet {si + 1} &mdash; {s.pieces.length} piece{s.pieces.length !== 1 ? 's' : ''},{' '}
                          {((s.usedArea / s.totalArea) * 100).toFixed(0)}% used
                        </div>
                        <div style={{
                          position: 'relative',
                          width: '100%',
                          aspectRatio: '2/1',
                          border: '2px solid #333',
                          marginBottom: 8,
                        }}>
                          {s.pieces.map((p, pi) => (
                            <div key={pi} style={{
                              position: 'absolute',
                              left: `${(p.x / 96) * 100}%`,
                              top: `${(p.y / 48) * 100}%`,
                              width: `${(p.w / 96) * 100}%`,
                              height: `${(p.h / 48) * 100}%`,
                              border: '1px solid #333',
                              background: '#eee',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 9,
                              overflow: 'hidden',
                            }}>
                              {p.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )}

                <div
                  style={{
                    border: '2px solid #333',
                    padding: 12,
                    margin: '14px 0',
                    fontWeight: 600,
                    fontSize: 13,
                    lineHeight: 1.7,
                  }}
                >
                  <strong>Summary:</strong> {tB} board{tB !== 1 ? 's' : ''}
                  {[4, 6, 8, 10].map((ht) => {
                    const pcs = hg[ht];
                    if (!pcs || !pcs.length || pcs.every((p) => p.count === 0)) return null;
                    return (
                      <span key={ht}>
                        {' '}| {ht}&quot;: {optimizeCuts(pcs, 96).length}
                      </span>
                    );
                  })}
                  {sheets.length > 0 && <> | Sheets: {sheets.length}</>}
                  {' '}| Bottoms: {totalBottoms} | Drop: {dd(tW)}&quot;
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
