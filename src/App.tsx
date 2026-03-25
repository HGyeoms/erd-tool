import { useState, useCallback, useEffect, useRef } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { DDLModal } from './components/DDLModal';
import { Home } from './components/Home';
import { useSchemaStore } from './store/schema-store';
import { useWorkspaceStore } from './store/workspace-store';

function App() {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'import' | 'export' | null>(null);
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
    },
    [openWorkspace]
  );

  const handleGoHome = useCallback(() => {
    closeWorkspace();
    setSelectedTableId(null);
    setModalMode(null);
  }, [closeWorkspace]);

  if (!currentWorkspace) {
    return <Home onOpenWorkspace={handleOpenWorkspace} />;
  }

  return (
    <ReactFlowProvider>
      <div className="w-full h-full flex flex-col" style={{ background: '#0f1117' }}>
        {/* Toolbar */}
        <Toolbar
          onGoHome={handleGoHome}
          workspaceName={currentWorkspace.name}
          onImportDDL={() => setModalMode('import')}
          onExportDDL={() => setModalMode('export')}
        />

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
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
        </div>

        {/* DDL Modal */}
        {modalMode && (
          <DDLModal
            mode={modalMode}
            onClose={() => setModalMode(null)}
          />
        )}
      </div>
    </ReactFlowProvider>
  );
}

export default App;
