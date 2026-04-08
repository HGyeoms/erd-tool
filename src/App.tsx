import { useState, useCallback, useEffect, useRef } from 'react';
import { ReactFlowProvider, useReactFlow } from '@xyflow/react';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { DDLModal } from './components/DDLModal';
import { SearchBar } from './components/SearchBar';
import { CommandPalette } from './components/CommandPalette';
import { ShortcutsPanel } from './components/ShortcutsPanel';
import { Home } from './components/Home';
import { LoginScreen } from './components/LoginScreen';
import { AIPanel } from './components/AIPanel';
import { LayoutPanel } from './components/LayoutPanel';
import { LintPanel } from './components/LintPanel';
import { FindPathPanel } from './components/FindPathPanel';
import { ToastContainer } from './components/ToastContainer';
import { useSchemaStore } from './store/schema-store';
import { useWorkspaceStore } from './store/workspace-store';
import { useUserStore } from './store/user-store';
import { encodeSchema, decodeSchema } from './lib/share';
import { autoLayout } from './lib/auto-layout';
import type { Table, TableGroup } from './types/schema';
import './store/theme-store'; // ensure theme is applied on load

const TABLE_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#f97316',
];
const GROUP_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#06b6d4'];

function CommandPaletteConnector({
  isOpen,
  onClose,
  onSelectTable,
  onImportDDL,
  onExportDDL,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectTable: (tableId: string) => void;
  onImportDDL: () => void;
  onExportDDL: () => void;
}) {
  const { fitView, screenToFlowPosition } = useReactFlow();
  const addTable = useSchemaStore((s) => s.addTable);
  const addGroup = useSchemaStore((s) => s.addGroup);
  const tables = useSchemaStore((s) => s.tables);
  const groups = useSchemaStore((s) => s.groups) || [];
  const store = useSchemaStore;

  const handleAddTable = useCallback(() => {
    const id = `table-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const color = TABLE_COLORS[tables.length % TABLE_COLORS.length];
    const center = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    const table: Table = {
      id,
      name: `new_table_${tables.length + 1}`,
      columns: [
        {
          id: `col-${Date.now()}-pk`,
          name: 'id',
          type: 'SERIAL',
          isPrimaryKey: true,
          isNullable: false,
          defaultValue: null,
        },
      ],
      position: { x: center.x - 150, y: center.y - 50 },
      color,
    };
    addTable(table);
  }, [tables.length, screenToFlowPosition, addTable]);

  const handleAddGroup = useCallback(() => {
    const id = `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const color = GROUP_COLORS[groups.length % GROUP_COLORS.length];
    const center = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    const group: TableGroup = {
      id,
      name: `Group ${groups.length + 1}`,
      color,
      position: { x: center.x - 200, y: center.y - 150 },
      size: { width: 400, height: 300 },
    };
    addGroup(group);
  }, [groups.length, screenToFlowPosition, addGroup]);

  const handleAutoLayout = useCallback(() => {
    const state = store.getState();
    const schema = { tables: state.tables, relationships: state.relationships };
    const laid = autoLayout(schema);
    for (const table of laid.tables) {
      state.updateTablePosition(table.id, table.position);
    }
  }, [store]);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 400 });
  }, [fitView]);

  return (
    <CommandPalette
      isOpen={isOpen}
      onClose={onClose}
      onSelectTable={onSelectTable}
      onAddTable={handleAddTable}
      onAddGroup={handleAddGroup}
      onAutoLayout={handleAutoLayout}
      onExportDDL={onExportDDL}
      onImportDDL={onImportDDL}
      onFitView={handleFitView}
    />
  );
}

function App() {
  const nickname = useUserStore((s) => s.nickname);

  if (!nickname) {
    return <LoginScreen />;
  }

  return <AppMain />;
}

function AppMain() {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'import' | 'export' | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showLayouts, setShowLayouts] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showLint, setShowLint] = useState(false);
  const [showFindPath, setShowFindPath] = useState(false);
  const [highlightPath, setHighlightPath] = useState<{ tableIds: string[]; relationshipIds: string[] } | null>(null);
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace);
  const closeWorkspace = useWorkspaceStore((s) => s.closeWorkspace);
  const updateWorkspaceSchema = useWorkspaceStore((s) => s.updateWorkspaceSchema);
  const tables = useSchemaStore((s) => s.tables);
  const relationships = useSchemaStore((s) => s.relationships);
  const enums = useSchemaStore((s) => s.enums);
  const groups = useSchemaStore((s) => s.groups);
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

    updateWorkspaceSchema(currentWorkspaceId, { tables, relationships, enums, groups });
  }, [currentWorkspaceId, tables, relationships, enums, groups, updateWorkspaceSchema]);

  const handleOpenWorkspace = useCallback(
    (id: string) => {
      openWorkspace(id);
      window.history.pushState({ workspaceId: id }, '', `#database/${id}`);
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
          window.history.replaceState({ workspaceId: ws.id }, '', `#database/${ws.id}`);
        })
        .catch(() => {
          // Invalid share link, go to home
          window.history.replaceState(null, '', window.location.pathname);
        });
      return;
    }

    const match = hash.match(/^#(?:database|workspace)\/(.+)$/);
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

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette((v) => !v);
      }
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
          onAI={() => setShowAI((v) => !v)}
          onLayouts={() => setShowLayouts(true)}
          onLint={() => setShowLint((v) => !v)}
          onFindPath={() => setShowFindPath((v) => !v)}
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
              highlightPath={highlightPath}
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

        {/* AI Panel */}
        {showAI && <AIPanel onClose={() => setShowAI(false)} />}

        {/* Command Palette */}
        <CommandPaletteConnector
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          onSelectTable={(id) => { setSelectedTableId(id); }}
          onImportDDL={() => setModalMode('import')}
          onExportDDL={() => setModalMode('export')}
        />

        {/* Layout Panel */}
        {showLayouts && currentWorkspaceId && (
          <LayoutPanel
            workspaceId={currentWorkspaceId}
            onClose={() => setShowLayouts(false)}
          />
        )}

        {/* Find Path Panel */}
        {showFindPath && (
          <FindPathPanel
            onClose={() => { setShowFindPath(false); setHighlightPath(null); }}
            onHighlightPath={(tableIds, relationshipIds) => setHighlightPath({ tableIds, relationshipIds })}
            initialTableId={selectedTableId}
          />
        )}

        {/* Lint Panel */}
        {showLint && (
          <LintPanel
            onClose={() => setShowLint(false)}
            onSelectTable={(id) => { setSelectedTableId(id); }}
          />
        )}

        {/* Toast Notifications */}
        <ToastContainer />

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
