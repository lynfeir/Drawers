'use client';

import { Job, CutList } from '@/lib/types';
import CutSummary from './CutSummary';

interface WorkspaceProps {
  job: Job | null;
  list: CutList | null;
  onAddDrawer: () => void;
  onUpdateDrawer: (idx: number, field: string, value: string | number) => void;
  onRemoveDrawer: (idx: number) => void;
  onDuplicateDrawer: (idx: number) => void;
  onMoveDrawer: (idx: number, dir: number) => void;
  onClearAll: () => void;
  onPrintList: () => void;
}

export default function Workspace({
  job,
  list,
  onAddDrawer,
  onUpdateDrawer,
  onRemoveDrawer,
  onDuplicateDrawer,
  onMoveDrawer,
  onClearAll,
  onPrintList,
}: WorkspaceProps) {
  if (!job || !list) {
    return (
      <div className="empty-state">
        <h3>No list selected</h3>
        <p>
          Tap the menu to create a job, add lists under it, then select a list
          to start adding drawers.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h2>
            {job.name} &rsaquo; {list.name}
          </h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="btn btn-accent btn-sm" onClick={onAddDrawer}>
              + Add Drawer
            </button>
            <button className="btn btn-outline btn-sm" onClick={onClearAll}>
              Clear All
            </button>
          </div>
        </div>

        {/* DESKTOP TABLE */}
        <div className="drawer-table-wrap">
          <div style={{ overflowX: 'auto' }}>
            <table className="drawer-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Opening W</th>
                  <th>Opening D</th>
                  <th>Height</th>
                  <th>Qty</th>
                  <th style={{ minWidth: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.drawers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        textAlign: 'center',
                        padding: 20,
                        color: 'var(--text-muted)',
                      }}
                    >
                      No drawers yet
                    </td>
                  </tr>
                ) : (
                  list.drawers.map((d, i) => {
                    return (
                      <tr key={i}>
                        <td
                          style={{
                            color: 'var(--text-muted)',
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {i + 1}
                        </td>
                        <td>
                          <input
                            type="text"
                            className="mono"
                            defaultValue={d.openWidth}
                            onBlur={(e) =>
                              onUpdateDrawer(i, 'openWidth', e.target.value)
                            }
                            placeholder="30 9/16"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="mono"
                            defaultValue={d.openDepth}
                            onBlur={(e) =>
                              onUpdateDrawer(i, 'openDepth', e.target.value)
                            }
                            placeholder="21"
                          />
                        </td>
                        <td>
                          <select
                            value={d.height}
                            onChange={(e) =>
                              onUpdateDrawer(i, 'height', +e.target.value)
                            }
                          >
                            {[4, 6, 8, 10].map((v) => (
                              <option key={v} value={v}>
                                {v}&quot;
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="mono qty-input"
                            defaultValue={d.qty}
                            onBlur={(e) =>
                              onUpdateDrawer(
                                i,
                                'qty',
                                Math.max(1, parseInt(e.target.value) || 1)
                              )
                            }
                          />
                        </td>
                        <td className="act-cell">
                          <button
                            className="btn-icon"
                            onClick={() => onMoveDrawer(i, -1)}
                            title="Up"
                            disabled={i === 0}
                          >
                            &#9650;
                          </button>
                          <button
                            className="btn-icon"
                            onClick={() => onMoveDrawer(i, 1)}
                            title="Down"
                            disabled={i === list.drawers.length - 1}
                          >
                            &#9660;
                          </button>
                          <button
                            className="btn-icon"
                            onClick={() => onDuplicateDrawer(i)}
                            title="Duplicate"
                          >
                            &#10697;
                          </button>
                          <button
                            className="btn-icon"
                            onClick={() => onRemoveDrawer(i)}
                            title="Delete"
                            style={{ color: 'var(--danger)' }}
                          >
                            &#10005;
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MOBILE CARDS */}
        <div className="drawer-cards-wrap" style={{ padding: 12 }}>
          {list.drawers.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 30,
                color: 'var(--text-muted)',
              }}
            >
              No drawers yet. Tap &quot;+ Add Drawer&quot;.
            </div>
          ) : (
            list.drawers.map((d, i) => {
              return (
                <div className="drawer-card" key={i}>
                  <div className="drawer-card-header">
                    <span className="dnum">#{i + 1}</span>
                    <span className="dtitle">
                      {d.openWidth || '\u2014'} &times;{' '}
                      {d.openDepth || '\u2014'} @ {d.height}&quot; (&times;
                      {d.qty})
                    </span>
                    <div className="drawer-card-actions">
                      <button
                        className="btn-icon"
                        onClick={() => onMoveDrawer(i, -1)}
                        disabled={i === 0}
                      >
                        &#9650;
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => onMoveDrawer(i, 1)}
                        disabled={i === list.drawers.length - 1}
                      >
                        &#9660;
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => onDuplicateDrawer(i)}
                      >
                        &#10697;
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => onRemoveDrawer(i)}
                        style={{ color: 'var(--danger)' }}
                      >
                        &#10005;
                      </button>
                    </div>
                  </div>
                  <div className="drawer-card-body">
                    <div className="field-row">
                      <div className="field">
                        <label>Opening Width</label>
                        <input
                          type="text"
                          defaultValue={d.openWidth}
                          onBlur={(e) =>
                            onUpdateDrawer(i, 'openWidth', e.target.value)
                          }
                          placeholder="30 9/16"
                        />
                      </div>
                      <div className="field">
                        <label>Opening Depth</label>
                        <input
                          type="text"
                          defaultValue={d.openDepth}
                          onBlur={(e) =>
                            onUpdateDrawer(i, 'openDepth', e.target.value)
                          }
                          placeholder="21"
                        />
                      </div>
                    </div>
                    <div className="field-row">
                      <div className="field">
                        <label>Height</label>
                        <select
                          value={d.height}
                          onChange={(e) =>
                            onUpdateDrawer(i, 'height', +e.target.value)
                          }
                        >
                          {[4, 6, 8, 10].map((v) => (
                            <option key={v} value={v}>
                              {v}&quot;
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label>Quantity</label>
                        <input
                          type="text"
                          defaultValue={d.qty}
                          onBlur={(e) =>
                            onUpdateDrawer(
                              i,
                              'qty',
                              Math.max(1, parseInt(e.target.value) || 1)
                            )
                          }
                          inputMode="numeric"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {list.drawers.length > 0 && (
        <CutSummary list={list} onPrint={onPrintList} />
      )}
    </>
  );
}
