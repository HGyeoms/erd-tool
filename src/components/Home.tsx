import { useState, useEffect, useRef } from 'react';
import { useWorkspaceStore } from '../store/workspace-store';
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

  const handleDelete = (id: string) => {
    removeWorkspace(id);
    setDeleteConfirm(null);
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: '#0f1117' }}>
      {/* Header Area */}
      <div className="border-b border-gray-800/60 bg-[#161922]/70 backdrop-blur-xl px-6 py-6 sm:px-8 sm:py-7">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 shadow-[0_0_30px_rgba(37,99,235,0.22)] sm:h-13 sm:w-13">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <rect x="2" y="3" width="20" height="18" rx="3" />
                <line x1="2" y1="9" x2="22" y2="9" />
                <line x1="10" y1="3" x2="10" y2="21" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-[2rem]">My Workspaces</h1>
              <p className="mt-1 text-xs font-semibold tracking-[0.18em] text-gray-500/80 uppercase sm:text-sm">
                Design, revisit, and organize your database projects
              </p>
            </div>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-black uppercase tracking-[0.22em] text-white transition-all hover:bg-blue-500 active:scale-95 sm:px-6"
            onClick={() => setShowModal(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Project
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="mx-auto flex min-h-full w-full max-w-6xl items-start justify-center px-6 py-10 sm:px-8 sm:py-14">
          <div className="w-full">
            <div className="mb-8 text-center sm:mb-10">
              <p className="text-sm font-medium text-gray-400 sm:text-base">
                Choose a workspace to continue, or start a fresh ERD.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-6 sm:gap-8">
            {/* Workspace Listing */}
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

            {/* Always show "Add Workspace" card */}
            <button
              className="group flex min-h-[240px] w-full max-w-[340px] flex-col items-center justify-center gap-4 rounded-[28px] border-2 border-dashed border-gray-800 bg-[#161922]/35 px-8 py-10 transition-all hover:border-blue-500/45 hover:bg-blue-500/5 sm:min-h-[260px]"
              onClick={() => setShowModal(true)}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/5 bg-gray-800 shadow-xl transition-all group-hover:scale-105 group-hover:bg-blue-500/20">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6b7280" className="transition-colors group-hover:stroke-blue-400" strokeWidth="3">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <div className="text-center">
                <span className="block text-lg font-black tracking-tight text-gray-300 transition-colors group-hover:text-blue-400 sm:text-xl">
                  Add Workspace
                </span>
                <span className="mt-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-600">
                  Create new project
                </span>
              </div>
            </button>
            </div>

            {/* Empty State (If no workspaces exist) */}
            {workspaces.length === 0 && (
              <div className="mx-auto mt-8 flex max-w-2xl flex-col items-center justify-center rounded-[32px] border border-gray-800/70 bg-[#161922]/25 px-8 py-12 text-center sm:mt-10 sm:px-10">
                <p className="text-lg font-semibold text-gray-300 sm:text-xl">No workspaces yet.</p>
                <p className="mt-2 max-w-lg text-sm leading-6 text-gray-500 sm:text-base">
                  Start with a blank project and keep each schema separated by workspace.
                </p>
                <button
                  className="mt-6 rounded-2xl bg-gray-800 px-6 py-3 text-sm font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-gray-700 active:scale-95"
                  onClick={() => setShowModal(true)}
                >
                  Create Your First ERD
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
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl sm:p-8"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-[32px] border border-gray-700/60 bg-[#1a1d27] shadow-[0_40px_80px_-20px_rgba(0,0,0,1)] animate-in fade-in zoom-in duration-300 sm:rounded-[40px]">
        <div className="flex items-start justify-between px-6 pb-6 pt-7 sm:px-10 sm:pb-7 sm:pt-10">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">New Project</h2>
            <p className="mt-2 text-sm font-medium text-gray-500 sm:text-base">Initialize your database architecture</p>
          </div>
          <button className="p-2 text-gray-600 transition-all hover:text-white active:scale-90 sm:p-3" onClick={onClose}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="space-y-8 px-6 py-6 sm:px-10 sm:py-8">
          <div className="space-y-3">
            <label className="ml-1 text-[11px] font-black uppercase tracking-[0.28em] text-blue-500 sm:ml-2">Project Name</label>
            <input
              ref={inputRef}
              className="w-full rounded-[24px] border-2 border-gray-800 bg-[#0d0e14] px-5 py-4 text-lg font-semibold text-white outline-none transition-all placeholder:text-gray-700 focus:border-blue-600 sm:px-6 sm:py-5 sm:text-2xl"
              placeholder="e.g. user_service"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <div className="space-y-3">
            <label className="ml-1 text-[11px] font-black uppercase tracking-[0.28em] text-gray-500 sm:ml-2">Description</label>
            <textarea
              className="min-h-[150px] w-full resize-none rounded-[24px] border-2 border-gray-800 bg-[#0d0e14] px-5 py-4 text-base leading-7 text-gray-200 outline-none transition-all placeholder:text-gray-700 focus:border-blue-600 sm:px-6 sm:py-5 sm:text-lg"
              placeholder="What are the goals of this system?"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 px-6 pb-6 pt-2 sm:flex-row sm:gap-4 sm:px-10 sm:pb-10">
          <button className="flex-1 rounded-[20px] bg-gray-800/40 py-3.5 text-sm font-black uppercase tracking-[0.2em] text-gray-300 transition-all hover:bg-gray-800 active:scale-95 sm:py-4" onClick={onClose}>Cancel</button>
          <button 
            className="flex-[1.4] rounded-[20px] bg-blue-600 py-3.5 text-sm font-black uppercase tracking-[0.2em] text-white shadow-2xl transition-all hover:bg-blue-500 disabled:opacity-20 active:scale-95 sm:py-4"
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

  if (isDeleting) {
    return (
      <div className="flex min-h-[240px] w-full max-w-[340px] flex-col items-center justify-center gap-6 rounded-[28px] border border-red-500/40 bg-[#1c1f2b] p-8 text-center animate-in fade-in zoom-in sm:min-h-[260px]">
        <p className="text-lg font-black tracking-tight text-white sm:text-xl">Delete this workspace?</p>
        <div className="flex w-full gap-3">
          <button className="flex-1 rounded-2xl bg-gray-800 py-3 text-sm font-black uppercase tracking-[0.18em] text-gray-300 active:scale-95" onClick={(e) => { e.stopPropagation(); onCancelDelete(); }}>No</button>
          <button className="flex-1 rounded-2xl bg-red-600 py-3 text-sm font-black uppercase tracking-[0.18em] text-white shadow-xl active:scale-95" onClick={(e) => { e.stopPropagation(); onConfirmDelete(); }}>Yes</button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative flex min-h-[240px] w-full max-w-[340px] cursor-pointer flex-col overflow-hidden rounded-[28px] border border-gray-800 bg-[#161922] transition-all duration-300 hover:border-blue-500/40 hover:shadow-2xl sm:min-h-[260px]"
      onClick={onOpen}
    >
      <div className="px-6 pb-4 pt-6 sm:px-7 sm:pt-7">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-3.5 w-3.5 rounded-full" style={{ background: ws.color, boxShadow: `0 0 16px ${ws.color}` }} />
          <span className="text-[10px] font-bold uppercase tracking-[0.32em] text-gray-500">Workspace</span>
        </div>
        <h3
          className="text-xl font-black leading-snug text-white sm:text-2xl"
          style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
        >
          {ws.name}
        </h3>
        <p
          className="mt-3 text-sm leading-6 text-gray-400 sm:text-[15px]"
          style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
        >
          {ws.description || 'Start mapping your schema visually.'}
        </p>
      </div>
      
      <div className="flex-1" />

      <div className="flex items-center justify-between px-6 pb-6 sm:px-7 sm:pb-7">
        <div className="rounded-xl border border-white/5 bg-black/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
          {tableCount} TABLES
        </div>
        <button
          className="rounded-xl p-2.5 text-gray-700 transition-all hover:bg-red-500/10 hover:text-red-500 active:scale-90 sm:opacity-0 sm:group-hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
        </button>
      </div>
    </div>
  );
}
