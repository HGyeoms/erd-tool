import { useState, useEffect, useRef } from 'react';
import { useWorkspaceStore } from '../store/workspace-store';
import { useThemeStore } from '../store/theme-store';
import type { Workspace } from '../store/workspace-store';

interface HomeProps {
  onOpenWorkspace: (id: string) => void;
}

export function Home({ onOpenWorkspace }: HomeProps) {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const addWorkspace = useWorkspaceStore((s) => s.addWorkspace);
  const removeWorkspace = useWorkspaceStore((s) => s.removeWorkspace);
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const handleDelete = (id: string) => {
    removeWorkspace(id);
    setDeleteConfirm(null);
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Header Area */}
      <div className="border-b backdrop-blur-xl px-6 py-4 sm:px-8 sm:py-5" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--bg-secondary) 50%, transparent)' }}>
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/90 shadow-[0_0_20px_rgba(37,99,235,0.15)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <rect x="2" y="3" width="20" height="18" rx="3" />
                <line x1="2" y1="9" x2="22" y2="9" />
                <line x1="10" y1="3" x2="10" y2="21" />
              </svg>
            </div>
            <h1 className="text-lg font-bold tracking-tight sm:text-xl" style={{ color: 'var(--text-primary)' }}>My Workspaces</h1>
          </div>
          <div className="flex items-center gap-2">
          <button
            className="rounded-xl p-2.5 transition-all hover:bg-black/10 active:scale-90"
            style={{ color: 'var(--text-secondary)' }}
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-blue-500 active:scale-95 sm:px-5"
            onClick={() => setShowModal(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Project
          </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="grid min-h-full place-items-center px-6 py-10 sm:px-8 sm:py-14">
          <div>
            {workspaces.length > 0 && (
              <div className="mb-6 text-center sm:mb-8">
                <p className="text-sm text-gray-500">
                  Choose a workspace to continue, or start a fresh ERD.
                </p>
              </div>
            )}

            {workspaces.length > 0 ? (
              <div className="mx-auto grid max-w-[960px] grid-cols-1 justify-items-center gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                {workspaces.map((ws) => (
                  <WorkspaceCard
                    key={ws.id}
                    workspace={ws}
                    onOpen={() => onOpenWorkspace(ws.id)}
                    onDelete={() => setDeleteConfirm(ws.id)}
                    isDeleting={deleteConfirm === ws.id}
                    onConfirmDelete={() => handleDelete(ws.id)}
                    onCancelDelete={() => setDeleteConfirm(null)}
                  />
                ))}

                {/* Add Workspace card */}
                <button
                  className="group flex min-h-[200px] w-[280px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 transition-all hover:border-blue-500/40 hover:bg-blue-500/5 sm:min-h-[220px]"
                  style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--card-bg) 30%, transparent)' }}
                  onClick={() => setShowModal(true)}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/5 bg-gray-800/80 transition-all group-hover:scale-105 group-hover:bg-blue-500/20">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" className="transition-colors group-hover:stroke-blue-400" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <span className="block text-base font-bold text-gray-400 transition-colors group-hover:text-blue-400">
                      Add Workspace
                    </span>
                    <span className="mt-1 block text-[11px] uppercase tracking-widest text-gray-600">
                      New project
                    </span>
                  </div>
                </button>
              </div>
            ) : (
              /* Empty State */
              <div className="flex flex-col items-center justify-center text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600/10 sm:h-24 sm:w-24">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" className="sm:h-12 sm:w-12">
                    <rect x="2" y="3" width="20" height="18" rx="3" />
                    <line x1="2" y1="9" x2="22" y2="9" />
                    <line x1="10" y1="3" x2="10" y2="21" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: 'var(--text-primary)' }}>Start your first ERD</h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-gray-500 sm:text-base">
                  Create a workspace to visually design and organize your database schema.
                </p>
                <button
                  className="mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold uppercase tracking-widest text-white transition-all hover:bg-blue-500 active:scale-95"
                  onClick={() => setShowModal(true)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Create Workspace
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <CreateModal
          onClose={() => setShowModal(false)}
          onCreate={(name, desc) => {
            const ws = addWorkspace(name, desc);
            setShowModal(false);
            onOpenWorkspace(ws.id);
          }}
        />
      )}
    </div>
  );
}

function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, desc: string) => void; }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onCreate(name.trim(), desc.trim());
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-xl sm:p-8"
      style={{ background: 'var(--bg-modal)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in duration-200" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between px-8 pb-4 pt-8">
          <div>
            <h2 className="text-lg font-bold tracking-tight sm:text-xl" style={{ color: 'var(--text-primary)' }}>New Project</h2>
            <p className="mt-1 text-[13px] text-gray-500">Initialize your database architecture</p>
          </div>
          <button className="rounded-lg p-2 text-gray-600 transition-all hover:bg-gray-800 hover:text-white active:scale-90" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="space-y-6 px-8 py-6">
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-blue-400">Project Name</label>
            <input
              ref={inputRef}
              className="w-full rounded-lg border px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
              placeholder="e.g. user_service"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Description</label>
            <textarea
              className="min-h-[100px] w-full resize-none rounded-lg border px-4 py-3 text-sm leading-relaxed outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              style={{ background: 'var(--input-bg)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
              placeholder="What are the goals of this system?"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3 px-8 pb-8 pt-2">
          <button className="flex-1 rounded-xl bg-gray-800/50 py-3 text-sm font-bold text-gray-400 transition-all hover:bg-gray-800 active:scale-95" onClick={onClose}>Cancel</button>
          <button
            className="flex-[1.5] rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-blue-500 disabled:opacity-20 active:scale-95"
            onClick={handleSubmit}
            disabled={!name.trim()}
          >
            Create Workspace
          </button>
        </div>
      </div>
    </div>
  );
}

interface WorkspaceCardProps {
  workspace: Workspace;
  onOpen: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

function WorkspaceCard({
  workspace: ws,
  onOpen,
  onDelete,
  isDeleting,
  onConfirmDelete,
  onCancelDelete,
}: WorkspaceCardProps) {
  const tableCount = ws.schema.tables.length;
  const relationshipCount = ws.schema.relationships.length;
  const createdDate = new Date(ws.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });

  if (isDeleting) {
    return (
      <div className="flex min-h-[200px] w-[280px] flex-col items-center justify-center gap-5 rounded-2xl border border-red-500/40 p-8 text-center animate-in fade-in zoom-in sm:min-h-[220px]" style={{ background: 'var(--bg-tertiary)' }}>
        <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Delete this workspace?</p>
        <div className="flex w-full gap-3">
          <button className="flex-1 rounded-xl bg-gray-800 py-2.5 text-sm font-bold text-gray-300 active:scale-95" onClick={(e) => { e.stopPropagation(); onCancelDelete(); }}>No</button>
          <button className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white shadow-lg active:scale-95" onClick={(e) => { e.stopPropagation(); onConfirmDelete(); }}>Yes</button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative flex min-h-[200px] w-[280px] cursor-pointer flex-col rounded-2xl border transition-all duration-200 hover:border-blue-500/35 hover:shadow-xl sm:min-h-[220px]"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
      onClick={onOpen}
    >
      <div className="p-6">
        <div className="mb-2.5 flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: ws.color, boxShadow: `0 0 10px ${ws.color}` }} />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Workspace</span>
        </div>
        <h3
          className="text-sm font-semibold leading-snug"
          style={{ color: 'var(--text-primary)', overflowWrap: 'anywhere', wordBreak: 'break-word' as const }}
          style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
        >
          {ws.name}
        </h3>
        <p
          className="mt-2 text-xs leading-relaxed line-clamp-3"
          style={{ color: 'var(--text-secondary)' }}
          style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
        >
          {ws.description || 'Start mapping your schema visually.'}
        </p>
      </div>

      <div className="flex-1" />

      <div className="flex flex-col gap-2 px-6 pb-6">
        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-white/5 bg-black/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
            {tableCount} TABLES
          </div>
          <div className="rounded-xl border border-white/5 bg-black/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
            {relationshipCount} REL
          </div>
          <div className="flex-1" />
          <button
            className="rounded-xl p-2.5 text-gray-700 transition-all hover:bg-red-500/10 hover:text-red-500 active:scale-90 sm:opacity-0 sm:group-hover:opacity-100"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
          </button>
        </div>
        <span className="text-[10px] tracking-wide text-gray-600">{createdDate}</span>
      </div>
    </div>
  );
}
