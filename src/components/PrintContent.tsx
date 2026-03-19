'use client';

import { Job, CutPiece } from '@/lib/types';
import { calcDrawer, dd, optimizeCuts } from '@/lib/math';

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

            const hg: Record<number, CutPiece[]> = { 4: [], 6: [], 8: [], 10: [] };
            const allBot: string[] = [];
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
                for (let q = 0; q < d.qty; q++) {
                  allBot.push(`${dd(c.botW)} \u00d7 ${dd(c.botD)}`);
                }
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

            const botMap: Record<string, number> = {};
            allBot.forEach((b) => {
              if (botMap[b]) botMap[b]++;
              else botMap[b] = 1;
            });

            let tB = 0;
            let tW = 0;

            return (
              <div key={list.id}>
                <h2>{list.name}</h2>

                <h3>Opening Sizes (Reference)</h3>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Width</th>
                      <th>Depth</th>
                      <th>Height</th>
                      <th>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.drawers.map((d, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td className="mono">{d.openWidth}</td>
                        <td className="mono">{d.openDepth}</td>
                        <td>{d.height}&quot;</td>
                        <td>{d.qty}</td>
                      </tr>
                    ))}
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

                <h3>Parts Summary</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Qty</th>
                      <th>Part</th>
                      <th>Size</th>
                      <th>Height</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[4, 6, 8, 10].map((ht) => {
                      const pcs = hg[ht];
                      if (!pcs || !pcs.length) return null;
                      const partMap: Record<string, number> = {};
                      pcs.forEach((p) => {
                        if (partMap[p.label]) partMap[p.label] += p.count;
                        else partMap[p.label] = p.count;
                      });
                      return Object.keys(partMap).map((k) => {
                        const isF = k.startsWith('F/B');
                        return (
                          <tr key={`${ht}-${k}`}>
                            <td className="mono" style={{ fontWeight: 700 }}>{partMap[k]}</td>
                            <td>{isF ? 'Front/Back' : 'Side'}</td>
                            <td className="mono">{k.replace(/^(F\/B|S)\s*/, '')}</td>
                            <td>{ht}&quot;</td>
                          </tr>
                        );
                      });
                    })}
                    {Object.keys(botMap).map((k) => (
                      <tr key={`bot-${k}`}>
                        <td className="mono" style={{ fontWeight: 700 }}>{botMap[k]}</td>
                        <td>Bottom</td>
                        <td className="mono">{k}</td>
                        <td>&mdash;</td>
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

                {Object.keys(botMap).length > 0 && (
                  <>
                    <div style={{ margin: '12px 0 6px', fontWeight: 700, fontSize: 14 }}>
                      Bottoms &mdash; {allBot.length} piece{allBot.length !== 1 ? 's' : ''}
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>Qty</th>
                          <th>Size</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(botMap).map((k) => (
                          <tr key={k}>
                            <td className="mono" style={{ fontWeight: 700 }}>{botMap[k]}</td>
                            <td className="mono">{k}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                  {' '}| Bottoms: {allBot.length} | Drop: {dd(tW)}&quot;
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
