'use client';

import { Job } from '@/lib/types';

interface SidebarProps {
  jobs: Job[];
  selectedJobId: string | null;
  selectedListId: string | null;
  sidebarOpen: boolean;
  onCloseSidebar: () => void;
  onToggleJob: (jobId: string) => void;
  onSelectList: (jobId: string, listId: string) => void;
  onAddJob: () => void;
  onAddList: () => void;
  onRenameJob: (jobId: string) => void;
  onDeleteJob: (jobId: string) => void;
  onRenameList: (jobId: string, listId: string) => void;
  onDuplicateList: (jobId: string, listId: string) => void;
  onMoveList: (jobId: string, listId: string) => void;
  onDeleteList: (jobId: string, listId: string) => void;
  onShowSettings: () => void;
}

export default function Sidebar({
  jobs,
  selectedJobId,
  selectedListId,
  sidebarOpen,
  onCloseSidebar,
  onToggleJob,
  onSelectList,
  onAddJob,
  onAddList,
  onRenameJob,
  onDeleteJob,
  onRenameList,
  onDuplicateList,
  onMoveList,
  onDeleteList,
  onShowSettings,
}: SidebarProps) {
  return (
    <>
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={onCloseSidebar}
      />
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-header-text">
            <h1>&#9638; Drawer Calc</h1>
            <p>Real-time Sync</p>
          </div>
          <button className="sidebar-close" onClick={onCloseSidebar}>
            &times;
          </button>
        </div>
        <div className="sidebar-actions">
          <button className="btn btn-sidebar" onClick={onAddJob}>
            + Job
          </button>
          <button className="btn btn-sidebar" onClick={onAddList}>
            + List
          </button>
        </div>
        <div className="sidebar-tree">
          {jobs.map((j) => {
            const isOpen = j._open !== false;
            const isActive = j.id === selectedJobId && !selectedListId;
            return (
              <div className="job-item" key={j.id}>
                <div
                  className={`job-header ${isActive ? 'active' : ''}`}
                  onClick={() => onToggleJob(j.id)}
                >
                  <span className={`arrow ${isOpen ? 'open' : ''}`}>
                    &#9654;
                  </span>
                  <span className="name">{j.name}</span>
                  <span className="tag tag-amber">{j.lists.length}</span>
                  <span
                    className="job-actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="ibtn"
                      onClick={() => onRenameJob(j.id)}
                      title="Rename"
                    >
                      &#9998;
                    </button>
                    <button
                      className="ibtn"
                      onClick={() => onDeleteJob(j.id)}
                      title="Delete"
                    >
                      &#10005;
                    </button>
                  </span>
                </div>
                {isOpen && (
                  <div className="job-lists">
                    {j.lists.map((l) => {
                      const la =
                        selectedJobId === j.id && selectedListId === l.id;
                      return (
                        <div
                          key={l.id}
                          className={`list-item ${la ? 'active' : ''}`}
                          onClick={() => onSelectList(j.id, l.id)}
                        >
                          <span className="dot" />
                          <span
                            style={{
                              flex: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {l.name}
                          </span>
                          <span
                            className="list-actions"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              className="ibtn"
                              onClick={() => onRenameList(j.id, l.id)}
                              title="Rename"
                            >
                              &#9998;
                            </button>
                            <button
                              className="ibtn"
                              onClick={() => onDuplicateList(j.id, l.id)}
                              title="Copy"
                            >
                              &#10697;
                            </button>
                            <button
                              className="ibtn"
                              onClick={() => onMoveList(j.id, l.id)}
                              title="Move"
                            >
                              &#8644;
                            </button>
                            <button
                              className="ibtn"
                              onClick={() => onDeleteList(j.id, l.id)}
                              title="Delete"
                            >
                              &#10005;
                            </button>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="sidebar-bottom">
          <button
            className="btn btn-sidebar"
            onClick={onShowSettings}
            style={{ width: '100%' }}
          >
            &#9881; Settings
          </button>
        </div>
      </div>
    </>
  );
}
