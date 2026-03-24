import { useState, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { DDLModal } from './components/DDLModal';

function App() {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'import' | 'export' | null>(null);

  const handleSelectTable = useCallback((id: string | null) => {
    setSelectedTableId(id);
  }, []);

  return (
    <ReactFlowProvider>
      <div className="w-full h-full flex flex-col" style={{ background: '#0f1117' }}>
        {/* Toolbar */}
        <Toolbar
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
