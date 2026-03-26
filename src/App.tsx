import { useState, useCallback, useEffect, useRef } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { DDLModal } from './components/DDLModal';
import { SearchBar } from './components/SearchBar';
import { ShortcutsPanel } from './components/ShortcutsPanel';
import { Home } from './components/Home';
import { useSchemaStore } from './store/schema-store';
import { useWorkspaceStore } from './store/workspace-store';
import './store/theme-store'; // ensure theme is applied on load

function App() {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'import' | 'export' | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
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
  }, [currentWorkspaceId, tables, relationships, updateWorkspaceSchema]);

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

  // Restore workspace from URL hash on initial load
  useEffect(() => {
    const hash = window.location.hash;
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
      </div>
    </ReactFlowProvider>
  );
}

export default App;
