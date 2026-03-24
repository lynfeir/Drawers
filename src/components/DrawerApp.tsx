'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppData, Job, CutList } from '@/lib/types';
import { loadLocal, saveLocal, saveToSupabase, loadFromSupabase, deleteJobFromSupabase, deleteListFromSupabase } from '@/lib/storage';
import { isSupabaseConfigured, subscribeToChanges } from '@/lib/supabase';
import Sidebar from './Sidebar';
import Workspace from './Workspace';
import Modal, { ModalButton } from './Modal';
import PrintContent from './PrintContent';

let _nextId = 1;
function uid() {
  return 'd' + _nextId++ + (Date.now() % 10000);
}

type SyncState = 'saved' | 'saving' | 'error' | null;

export default function DrawerApp() {
  const [data, setData] = useState<AppData>({ jobs: [] });
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>(null);
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Loading...');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);
  const [modalButtons, setModalButtons] = useState<ModalButton[]>([]);

  // Print state
  const [printJobs, setPrintJobs] = useState<Job[] | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  const lastSaveRef = useRef(0);

  const hasSupabase = isSupabaseConfigured();

  // ── Helpers ──

  const getJob = useCallback(
    (id: string) => dataRef.current.jobs.find((j) => j.id === id) || null,
    []
  );

  const getList = useCallback(
    (jid: string, lid: string) => {
      const j = getJob(jid);
      return j ? j.lists.find((l) => l.id === lid) || null : null;
    },
    [getJob]
  );

  const updateData = useCallback(
    (updater: (d: AppData) => AppData) => {
      setData((prev) => {
        const next = updater(prev);
        saveLocal(next);
        // Debounced Supabase sync
        if (hasSupabase) {
          setSyncState('saving');
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
          saveTimerRef.current = setTimeout(async () => {
            lastSaveRef.current = Date.now();
            const ok = await saveToSupabase(next);
            lastSaveRef.current = Date.now();
            setSyncState(ok ? 'saved' : 'error');
          }, 1500);
        }
        return next;
      });
    },
    [hasSupabase]
  );

  // Deep clone helper
  const clone = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

  // ── Modal helpers ──

  const openModal = useCallback(
    (title: string, content: React.ReactNode, buttons: ModalButton[]) => {
      setModalTitle(title);
      setModalContent(content);
      setModalButtons(buttons);
      setModalOpen(true);
    },
    []
  );

  const closeModal = useCallback(() => setModalOpen(false), []);

  // ── Boot ──

  useEffect(() => {
    async function boot() {
      setLoadingText('Loading data...');
      let loaded: AppData | null = null;

      if (hasSupabase) {
        setLoadingText('Loading from Supabase...');
        loaded = await loadFromSupabase();
        if (loaded) {
          setSyncState('saved');
        }
      }

      if (!loaded) {
        loaded = loadLocal();
      }

      if (loaded) {
        // Ensure IDs exist
        loaded.jobs.forEach((j) => {
          if (!j.id) j.id = uid();
          j._open = j._open !== false;
          j.lists.forEach((l) => {
            if (!l.id) l.id = uid();
          });
        });
        setData(loaded);
        saveLocal(loaded);
      }
      setLoading(false);
    }
    boot();
  }, [hasSupabase]);

  // ── Real-time sync ──

  useEffect(() => {
    if (!hasSupabase) return;

    let reloadTimer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = subscribeToChanges(() => {
      if (Date.now() - lastSaveRef.current < 3000) return;
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(async () => {
        const fresh = await loadFromSupabase();
        if (fresh) {
          fresh.jobs.forEach((j) => {
            const existing = dataRef.current.jobs.find((pj) => pj.id === j.id);
            j._open = existing ? existing._open : true;
            if (!j.id) j.id = uid();
            j.lists.forEach((l) => { if (!l.id) l.id = uid(); });
          });
          setData(fresh);
          saveLocal(fresh);
          setSyncState('saved');
        }
      }, 500);
    });

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      if (unsubscribe) unsubscribe();
    };
  }, [hasSupabase]);

  // ── Job Actions ──

  const addJob = useCallback(() => {
    let inputRef: HTMLInputElement | null = null;

    openModal(
      'New Job',
      <div>
        <label>Job Name</label>
        <input
          ref={(el) => {
            inputRef = el;
            if (el) setTimeout(() => el.focus(), 50);
          }}
          placeholder="e.g. Rocky River"
          id="modal-input"
        />
      </div>,
      [
        {
          label: 'Create',
          cls: 'btn-accent',
          action: () => {
            const el = document.getElementById('modal-input') as HTMLInputElement;
            const n = el?.value.trim();
            if (!n) return;
            updateData((d) => ({
              ...d,
              jobs: [...d.jobs, { id: uid(), name: n, lists: [], _open: true }],
            }));
            closeModal();
          },
        },
      ]
    );
  }, [openModal, closeModal, updateData]);

  const renameJob = useCallback(
    (jid: string) => {
      const j = dataRef.current.jobs.find((x) => x.id === jid);
      if (!j) return;
      openModal(
        'Rename Job',
        <div>
          <label>Job Name</label>
          <input defaultValue={j.name} id="modal-input" autoFocus />
        </div>,
        [
          {
            label: 'Save',
            cls: 'btn-accent',
            action: () => {
              const el = document.getElementById('modal-input') as HTMLInputElement;
              const newName = el?.value.trim();
              if (!newName) return;
              updateData((d) => ({
                ...d,
                jobs: d.jobs.map((x) => (x.id === jid ? { ...x, name: newName } : x)),
              }));
              closeModal();
            },
          },
        ]
      );
    },
    [openModal, closeModal, updateData]
  );

  const deleteJob = useCallback(
    (jid: string) => {
      const j = dataRef.current.jobs.find((x) => x.id === jid);
      if (!j) return;
      openModal(
        'Delete Job',
        <div>
          <p style={{ marginBottom: 8 }}>
            Delete <strong>{j.name}</strong> and all its lists?
          </p>
        </div>,
        [
          { label: 'Cancel', cls: 'btn-outline', action: closeModal },
          {
            label: 'Delete',
            cls: 'btn-danger',
            action: () => {
              if (hasSupabase) {
                lastSaveRef.current = Date.now();
                deleteJobFromSupabase(jid);
              }
              updateData((d) => ({
                ...d,
                jobs: d.jobs.filter((x) => x.id !== jid),
              }));
              if (selectedJobId === jid) {
                setSelectedJobId(null);
                setSelectedListId(null);
              }
              closeModal();
            },
          },
        ]
      );
    },
    [openModal, closeModal, updateData, hasSupabase, selectedJobId]
  );

  const toggleJob = useCallback(
    (jid: string) => {
      updateData((d) => ({
        ...d,
        jobs: d.jobs.map((j) =>
          j.id === jid ? { ...j, _open: j._open === false } : j
        ),
      }));
      setSelectedJobId(jid);
    },
    [updateData]
  );

  // ── List Actions ──

  const addListToJob = useCallback(() => {
    if (!dataRef.current.jobs.length) {
      addJob();
      return;
    }
    openModal(
      'New List',
      <div>
        <label>Job</label>
        <select id="modal-job">
          {dataRef.current.jobs.map((j) => (
            <option key={j.id} value={j.id} selected={j.id === selectedJobId || undefined}>
              {j.name}
            </option>
          ))}
        </select>
        <label>List Name</label>
        <input id="modal-input" placeholder="e.g. Reception Desk" autoFocus />
      </div>,
      [
        {
          label: 'Create',
          cls: 'btn-accent',
          action: () => {
            const jobEl = document.getElementById('modal-job') as HTMLSelectElement;
            const nameEl = document.getElementById('modal-input') as HTMLInputElement;
            const jid = jobEl?.value;
            const n = nameEl?.value.trim();
            if (!n || !jid) return;
            const newId = uid();
            updateData((d) => ({
              ...d,
              jobs: d.jobs.map((j) =>
                j.id === jid
                  ? {
                      ...j,
                      _open: true,
                      lists: [...j.lists, { id: newId, name: n, drawers: [] }],
                    }
                  : j
              ),
            }));
            setSelectedJobId(jid);
            setSelectedListId(newId);
            setSidebarOpen(false);
            closeModal();
          },
        },
      ]
    );
  }, [addJob, openModal, closeModal, updateData, selectedJobId]);

  const selectList = useCallback(
    (jid: string, lid: string) => {
      setSelectedJobId(jid);
      setSelectedListId(lid);
      updateData((d) => ({
        ...d,
        jobs: d.jobs.map((j) => (j.id === jid ? { ...j, _open: true } : j)),
      }));
      setSidebarOpen(false);
    },
    [updateData]
  );

  const renameList = useCallback(
    (jid: string, lid: string) => {
      const l = getList(jid, lid);
      if (!l) return;
      openModal(
        'Rename List',
        <div>
          <label>List Name</label>
          <input defaultValue={l.name} id="modal-input" autoFocus />
        </div>,
        [
          {
            label: 'Save',
            cls: 'btn-accent',
            action: () => {
              const el = document.getElementById('modal-input') as HTMLInputElement;
              const newName = el?.value.trim();
              if (!newName) return;
              updateData((d) => ({
                ...d,
                jobs: d.jobs.map((j) =>
                  j.id === jid
                    ? {
                        ...j,
                        lists: j.lists.map((x) =>
                          x.id === lid ? { ...x, name: newName } : x
                        ),
                      }
                    : j
                ),
              }));
              closeModal();
            },
          },
        ]
      );
    },
    [getList, openModal, closeModal, updateData]
  );

  const duplicateList = useCallback(
    (jid: string, lid: string) => {
      const l = getList(jid, lid);
      if (!l) return;
      const copy: CutList = { ...clone(l), id: uid(), name: l.name + ' copy' };
      updateData((d) => ({
        ...d,
        jobs: d.jobs.map((j) =>
          j.id === jid ? { ...j, lists: [...j.lists, copy] } : j
        ),
      }));
    },
    [getList, updateData]
  );

  const moveList = useCallback(
    (jid: string, lid: string) => {
      const otherJobs = dataRef.current.jobs.filter((j) => j.id !== jid);
      if (!otherJobs.length) return;
      openModal(
        'Move List',
        <div>
          <label>Move to Job</label>
          <select id="modal-job">
            {otherJobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name}
              </option>
            ))}
          </select>
        </div>,
        [
          { label: 'Cancel', cls: 'btn-outline', action: closeModal },
          {
            label: 'Move',
            cls: 'btn-accent',
            action: () => {
              const el = document.getElementById('modal-job') as HTMLSelectElement;
              const targetJid = el?.value;
              if (!targetJid) return;
              updateData((d) => {
                const srcJob = d.jobs.find((j) => j.id === jid);
                if (!srcJob) return d;
                const idx = srcJob.lists.findIndex((l) => l.id === lid);
                if (idx === -1) return d;
                const moved = srcJob.lists[idx];
                return {
                  ...d,
                  jobs: d.jobs.map((j) => {
                    if (j.id === jid) {
                      return { ...j, lists: j.lists.filter((l) => l.id !== lid) };
                    }
                    if (j.id === targetJid) {
                      return { ...j, _open: true, lists: [...j.lists, moved] };
                    }
                    return j;
                  }),
                };
              });
              if (selectedListId === lid) setSelectedJobId(targetJid);
              closeModal();
            },
          },
        ]
      );
    },
    [openModal, closeModal, updateData, selectedListId]
  );

  const deleteList = useCallback(
    (jid: string, lid: string) => {
      const l = getList(jid, lid);
      if (!l) return;
      openModal(
        'Delete List',
        <p>
          Delete <strong>{l.name}</strong>?
        </p>,
        [
          { label: 'Cancel', cls: 'btn-outline', action: closeModal },
          {
            label: 'Delete',
            cls: 'btn-danger',
            action: () => {
              if (hasSupabase) {
                lastSaveRef.current = Date.now();
                deleteListFromSupabase(lid);
              }
              updateData((d) => ({
                ...d,
                jobs: d.jobs.map((j) =>
                  j.id === jid
                    ? { ...j, lists: j.lists.filter((x) => x.id !== lid) }
                    : j
                ),
              }));
              if (selectedListId === lid) setSelectedListId(null);
              closeModal();
            },
          },
        ]
      );
    },
    [getList, openModal, closeModal, updateData, hasSupabase, selectedListId]
  );

  // ── Drawer Actions ──

  const addDrawer = useCallback(() => {
    if (!selectedJobId || !selectedListId) return;
    updateData((d) => ({
      ...d,
      jobs: d.jobs.map((j) =>
        j.id === selectedJobId
          ? {
              ...j,
              lists: j.lists.map((l) =>
                l.id === selectedListId
                  ? {
                      ...l,
                      drawers: [
                        ...l.drawers,
                        { openWidth: '', openDepth: '', height: '4', qty: 1 },
                      ],
                    }
                  : l
              ),
            }
          : j
      ),
    }));
  }, [selectedJobId, selectedListId, updateData]);

  const updateDrawer = useCallback(
    (idx: number, field: string, value: string | number) => {
      if (!selectedJobId || !selectedListId) return;
      updateData((d) => ({
        ...d,
        jobs: d.jobs.map((j) =>
          j.id === selectedJobId
            ? {
                ...j,
                lists: j.lists.map((l) =>
                  l.id === selectedListId
                    ? {
                        ...l,
                        drawers: l.drawers.map((dr, di) =>
                          di === idx ? { ...dr, [field]: value } : dr
                        ),
                      }
                    : l
                ),
              }
            : j
        ),
      }));
    },
    [selectedJobId, selectedListId, updateData]
  );

  const removeDrawer = useCallback(
    (idx: number) => {
      if (!selectedJobId || !selectedListId) return;
      updateData((d) => ({
        ...d,
        jobs: d.jobs.map((j) =>
          j.id === selectedJobId
            ? {
                ...j,
                lists: j.lists.map((l) =>
                  l.id === selectedListId
                    ? { ...l, drawers: l.drawers.filter((_, di) => di !== idx) }
                    : l
                ),
              }
            : j
        ),
      }));
    },
    [selectedJobId, selectedListId, updateData]
  );

  const duplicateDrawer = useCallback(
    (idx: number) => {
      if (!selectedJobId || !selectedListId) return;
      updateData((d) => ({
        ...d,
        jobs: d.jobs.map((j) =>
          j.id === selectedJobId
            ? {
                ...j,
                lists: j.lists.map((l) => {
                  if (l.id !== selectedListId) return l;
                  const newDrawers = [...l.drawers];
                  newDrawers.splice(idx + 1, 0, clone(l.drawers[idx]));
                  return { ...l, drawers: newDrawers };
                }),
              }
            : j
        ),
      }));
    },
    [selectedJobId, selectedListId, updateData]
  );

  const moveDrawer = useCallback(
    (idx: number, dir: number) => {
      if (!selectedJobId || !selectedListId) return;
      updateData((d) => ({
        ...d,
        jobs: d.jobs.map((j) =>
          j.id === selectedJobId
            ? {
                ...j,
                lists: j.lists.map((l) => {
                  if (l.id !== selectedListId) return l;
                  const ni = idx + dir;
                  if (ni < 0 || ni >= l.drawers.length) return l;
                  const newDrawers = [...l.drawers];
                  [newDrawers[idx], newDrawers[ni]] = [newDrawers[ni], newDrawers[idx]];
                  return { ...l, drawers: newDrawers };
                }),
              }
            : j
        ),
      }));
    },
    [selectedJobId, selectedListId, updateData]
  );

  const clearAllDrawers = useCallback(() => {
    if (!selectedJobId || !selectedListId) return;
    const list = getList(selectedJobId, selectedListId);
    if (!list || !list.drawers.length) return;
    openModal(
      'Clear All',
      <p>Remove all {list.drawers.length} drawer(s)?</p>,
      [
        { label: 'Cancel', cls: 'btn-outline', action: closeModal },
        {
          label: 'Clear All',
          cls: 'btn-danger',
          action: () => {
            updateData((d) => ({
              ...d,
              jobs: d.jobs.map((j) =>
                j.id === selectedJobId
                  ? {
                      ...j,
                      lists: j.lists.map((l) =>
                        l.id === selectedListId ? { ...l, drawers: [] } : l
                      ),
                    }
                  : j
              ),
            }));
            closeModal();
          },
        },
      ]
    );
  }, [selectedJobId, selectedListId, getList, openModal, closeModal, updateData]);

  // ── Print ──

  const printCurrentList = useCallback(() => {
    if (!selectedJobId || !selectedListId) return;
    const job = getJob(selectedJobId);
    const list = getList(selectedJobId, selectedListId);
    if (!job || !list) return;
    setPrintJobs([{ ...job, lists: [list] }]);
    setTimeout(() => window.print(), 150);
  }, [selectedJobId, selectedListId, getJob, getList]);

  const printJob = useCallback(() => {
    if (!selectedJobId) return;
    const job = getJob(selectedJobId);
    if (!job) return;
    setPrintJobs([job]);
    setTimeout(() => window.print(), 150);
  }, [selectedJobId, getJob]);

  // ── Export / Import ──

  const exportData = useCallback(() => {
    const clean = JSON.parse(
      JSON.stringify(data, (k, v) => (k.startsWith('_') ? undefined : v))
    );
    const blob = new Blob([JSON.stringify(clean, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'drawer-cutlist-export.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }, [data]);

  const importData = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imp = JSON.parse(ev.target?.result as string);
          if (imp.jobs) {
            updateData((d) => {
              const newJobs = imp.jobs.map((j: Job) => ({
                ...j,
                id: uid(),
                _open: true,
                lists: j.lists.map((l: CutList) => ({ ...l, id: uid() })),
              }));
              return { ...d, jobs: [...d.jobs, ...newJobs] };
            });
          }
        } catch (err) {
          alert('Invalid file: ' + (err as Error).message);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [updateData]
  );

  // ── Settings ──

  const showSettings = useCallback(() => {
    openModal(
      'Settings',
      <div>
        <label>Status</label>
        <p
          style={{
            marginBottom: 12,
            fontWeight: 600,
            color: hasSupabase ? 'var(--success)' : 'var(--text-muted)',
          }}
        >
          {hasSupabase ? 'Connected \u2014 Real-time Sync' : 'Offline Mode (localStorage only)'}
        </p>
        {hasSupabase && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            Enable Realtime on jobs, lists, and drawers tables in Supabase for live sync across devices.
          </p>
        )}
        {!hasSupabase && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to
            enable cloud sync.
          </p>
        )}
      </div>,
      [{ label: 'Close', cls: 'btn-outline', action: closeModal }]
    );
  }, [hasSupabase, openModal, closeModal]);

  // ── Derived state ──

  const currentJob = selectedJobId
    ? data.jobs.find((j) => j.id === selectedJobId) || null
    : null;
  const currentList =
    currentJob && selectedListId
      ? currentJob.lists.find((l) => l.id === selectedListId) || null
      : null;

  const importInputRef = useRef<HTMLInputElement>(null);

  if (loading) {
    return (
      <div className="loading-overlay show">
        <div className="spinner" />
        <span>{loadingText}</span>
      </div>
    );
  }

  return (
    <>
      <div className="app">
        <Sidebar
          jobs={data.jobs}
          selectedJobId={selectedJobId}
          selectedListId={selectedListId}
          sidebarOpen={sidebarOpen}
          onCloseSidebar={() => setSidebarOpen(false)}
          onToggleJob={toggleJob}
          onSelectList={selectList}
          onAddJob={addJob}
          onAddList={addListToJob}
          onRenameJob={renameJob}
          onDeleteJob={deleteJob}
          onRenameList={renameList}
          onDuplicateList={duplicateList}
          onMoveList={moveList}
          onDeleteList={deleteList}
          onShowSettings={showSettings}
        />

        <div className="main">
          <div className="topbar no-print">
            <button
              className="hamburger"
              onClick={() => setSidebarOpen(true)}
              aria-label="Menu"
            >
              <span />
              <span />
              <span />
            </button>

            {hasSupabase && syncState && (
              <span className={`sync-badge sync-${syncState}`}>
                <span className="sync-dot" />
                <span>
                  {syncState === 'saved'
                    ? 'Saved'
                    : syncState === 'saving'
                    ? 'Saving...'
                    : 'Error'}
                </span>
              </span>
            )}

            <div className="topbar-sep" />

            <div className="topbar-group">
              <button className="btn btn-accent btn-sm" onClick={exportData}>
                &#8681; Export
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => importInputRef.current?.click()}
              >
                &#8679; Import
              </button>
              <input
                type="file"
                ref={importInputRef}
                accept=".json"
                onChange={importData}
                style={{ display: 'none' }}
              />
            </div>

            <div style={{ flex: 1, minWidth: 8 }} />

            <div className="topbar-group">
              {selectedListId && (
                <button
                  className="btn btn-accent btn-sm"
                  onClick={printCurrentList}
                >
                  Print List
                </button>
              )}
              {selectedJobId && (
                <button className="btn btn-dark btn-sm" onClick={printJob}>
                  Print Job
                </button>
              )}
            </div>
          </div>

          <div className="workspace screen-content">
            <Workspace
              job={currentJob}
              list={currentList}
              onAddDrawer={addDrawer}
              onUpdateDrawer={updateDrawer}
              onRemoveDrawer={removeDrawer}
              onDuplicateDrawer={duplicateDrawer}
              onMoveDrawer={moveDrawer}
              onClearAll={clearAllDrawers}
              onPrintList={printCurrentList}
            />
          </div>

          <div className="workspace print-content">
            {printJobs && <PrintContent jobs={printJobs} />}
          </div>
        </div>
      </div>

      <Modal
        open={modalOpen}
        title={modalTitle}
        onClose={closeModal}
        buttons={modalButtons}
      >
        {modalContent}
      </Modal>
    </>
  );
}
