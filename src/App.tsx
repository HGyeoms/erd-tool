import { useState, useCallback, useEffect, useRef } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { DDLModal } from './components/DDLModal';
import { SearchBar } from './components/SearchBar';
import { ShortcutsPanel } from './components/ShortcutsPanel';
import { Home } from './components/Home';
import { VersionPanel } from './components/VersionPanel';
import { useSchemaStore } from './store/schema-store';
import { useWorkspaceStore } from './store/workspace-store';
import { useVersionStore } from './store/version-store';
import { encodeSchema, decodeSchema } from './lib/share';
import './store/theme-store'; // ensure theme is applied on load

function App() {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'import' | 'export' | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const autoSave = useVersionStore((s) => s.autoSave);
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace);
  const closeWorkspace = useWorkspaceStore((s) => s.closeWorkspace);
  const updateWorkspaceSchema = useWorkspaceStore((s) => s.updateWorkspaceSchema);
  const tables = useSchemaStore((s) => s.tables);
  const relationships = useSchemaStore((s) => s.relationships);
  const setSchema = useSchemaStore((s) => s.setSchema);
  const skipNextWorkspaceSaveRef = useRef<string | null>(null);

  const currentWorkspace =
    workspaces.find((workspace) => workspace.id === currentWorkspaceId) ?? null;

  const handleSelectTable = useCallback((id: string | null) => {
    setSelectedTableId(id);
  }, []);

  useEffect(() => {
    if (!currentWorkspaceId) {
      return;
    }

    const workspace = useWorkspaceStore
      .getState()
      .workspaces.find((item) => item.id === currentWorkspaceId);

    if (!workspace) {
      return;
    }

    skipNextWorkspaceSaveRef.current = currentWorkspaceId;
    setSchema(workspace.schema);
    setSelectedTableId(null);
    setModalMode(null);
  }, [currentWorkspaceId, setSchema]);

  useEffect(() => {
    if (!currentWorkspaceId) {
      return;
    }

    if (skipNextWorkspaceSaveRef.current === currentWorkspaceId) {
      skipNextWorkspaceSaveRef.current = null;
      return;
    }

    updateWorkspaceSchema(currentWorkspaceId, { tables, relationships });
    autoSave(currentWorkspaceId, { tables, relationships });
  }, [currentWorkspaceId, tables, relationships, updateWorkspaceSchema, autoSave]);

  const handleOpenWorkspace = useCallback(
    (id: string) => {
      openWorkspace(id);
      window.history.pushState({ workspaceId: id }, '', `#workspace/${id}`);
    },
    [openWorkspace]
  );

  const handleGoHome = useCallback(() => {
    closeWorkspace();
    setSelectedTableId(null);
    setModalMode(null);
    window.history.pushState(null, '', window.location.pathname);
  }, [closeWorkspace]);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const workspaceId = e.state?.workspaceId;
      if (workspaceId) {
        const exists = useWorkspaceStore.getState().workspaces.some((w) => w.id === workspaceId);
        if (exists) {
          openWorkspace(workspaceId);
          return;
        }
      }
      closeWorkspace();
      setSelectedTableId(null);
      setModalMode(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [openWorkspace, closeWorkspace]);

  // Restore workspace from URL hash on initial load, or load shared schema
  useEffect(() => {
    const hash = window.location.hash;

    // Check for shared schema link
    const sharedMatch = hash.match(/^#shared\/(.+)$/);
    if (sharedMatch) {
      decodeSchema(sharedMatch[1])
        .then((schema) => {
          // Create a new workspace from the shared schema
          const ws = useWorkspaceStore.getState().addWorkspace('Shared Schema', 'Imported from shared link');
          useWorkspaceStore.getState().updateWorkspaceSchema(ws.id, schema);
          openWorkspace(ws.id);
          window.history.replaceState({ workspaceId: ws.id }, '', `#workspace/${ws.id}`);
        })
        .catch(() => {
          // Invalid share link, go to home
          window.history.replaceState(null, '', window.location.pathname);
        });
      return;
    }

    const match = hash.match(/^#workspace\/(.+)$/);
    if (match) {
      const id = match[1];
      const exists = useWorkspaceStore.getState().workspaces.some((w) => w.id === id);
      if (exists) {
        openWorkspace(id);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch((v) => !v);
      }
      if (e.key === '?' && !isInput) {
        setShowShortcuts((v) => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleShare = useCallback(async () => {
    const state = useSchemaStore.getState();
    const schema = {
      tables: state.tables,
      relationships: state.relationships,
      enums: state.enums,
      groups: state.groups,
    };
    try {
      const encoded = await encodeSchema(schema);
      const url = `${window.location.origin}${window.location.pathname}#shared/${encoded}`;
      await navigator.clipboard.writeText(url);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    } catch {
      // fallback: show alert
      alert('Failed to generate share link.');
    }
  }, []);

  if (!currentWorkspace) {
    return <Home onOpenWorkspace={handleOpenWorkspace} />;
  }

  return (
    <ReactFlowProvider>
      <div className="w-full h-full flex flex-col" style={{ background: 'var(--bg-primary)' }}>
        {/* Toolbar */}
        <Toolbar
          onGoHome={handleGoHome}
          workspaceName={currentWorkspace.name}
          onImportDDL={() => setModalMode('import')}
          onExportDDL={() => setModalMode('export')}
          onSearch={() => setShowSearch((v) => !v)}
          onShare={handleShare}
          onVersions={() => setShowVersions(true)}
        />

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Sidebar */}
          <Sidebar
            selectedTableId={selectedTableId}
            onSelectTable={handleSelectTable}
          />

          {/* Canvas */}
          <div className="flex-1">
            <Canvas
              selectedTableId={selectedTableId}
              onSelectTable={handleSelectTable}
            />
          </div>

          {/* Search Bar */}
          {showSearch && (
            <SearchBar
              onSelectTable={handleSelectTable}
              onClose={() => setShowSearch(false)}
            />
          )}
        </div>

        {/* DDL Modal */}
        {modalMode && (
          <DDLModal
            mode={modalMode}
            onClose={() => setModalMode(null)}
          />
        )}

        {/* Shortcuts Panel */}
        {showShortcuts && (
          <ShortcutsPanel onClose={() => setShowShortcuts(false)} />
        )}

        {/* Version Panel */}
        {showVersions && currentWorkspaceId && (
          <VersionPanel
            workspaceId={currentWorkspaceId}
            onClose={() => setShowVersions(false)}
          />
        )}

        {/* Share Toast */}
        {shareToast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 rounded-xl border px-5 py-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-sm font-medium">Share link copied to clipboard!</span>
          </div>
        )}
      </div>
    </ReactFlowProvider>
  );
}

export default App;
