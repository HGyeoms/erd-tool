import { useSchemaStore } from '../store/schema-store';
import type { Table } from '../types/schema';
import { autoLayout } from '../lib/auto-layout';

const TABLE_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#f97316',
];

interface ToolbarProps {
  onImportDDL: () => void;
  onExportDDL: () => void;
}

export function Toolbar({ onImportDDL, onExportDDL }: ToolbarProps) {
  const addTable = useSchemaStore((s) => s.addTable);
  const tables = useSchemaStore((s) => s.tables);
  const store = useSchemaStore;

  const handleAddTable = () => {
    const id = `table-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const color = TABLE_COLORS[tables.length % TABLE_COLORS.length];
    // Offset new tables so they don't stack
    const offset = tables.length * 30;
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
      position: { x: 100 + offset, y: 100 + offset },
      color,
    };
    addTable(table);
  };

  const handleUndo = () => {
    (store as any).temporal?.getState()?.undo?.();
  };

  const handleRedo = () => {
    (store as any).temporal?.getState()?.redo?.();
  };

  const handleAutoLayout = () => {
    const state = store.getState();
    const schema = { tables: state.tables, relationships: state.relationships };
    const laid = autoLayout(schema);
    for (const table of laid.tables) {
      state.updateTablePosition(table.id, table.position);
    }
  };

  return (
    <div className="h-12 bg-[#1a1d27] border-b border-gray-800 flex items-center px-4 gap-1">
      {/* Logo / Title */}
      <div className="flex items-center gap-2 mr-4">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
          <rect x="2" y="3" width="20" height="18" rx="3" />
          <line x1="2" y1="9" x2="22" y2="9" />
          <line x1="10" y1="3" x2="10" y2="21" />
        </svg>
        <span className="text-white text-sm font-semibold tracking-wide">ERD Designer</span>
      </div>

      <div className="w-px h-6 bg-gray-700 mx-2" />

      {/* Action Buttons */}
      <ToolbarButton
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        }
        label="Add Table"
        onClick={handleAddTable}
      />

      <div className="w-px h-6 bg-gray-700/50 mx-1" />

      <ToolbarButton
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        }
        label="Import DDL"
        onClick={onImportDDL}
      />

      <ToolbarButton
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        }
        label="Export DDL"
        onClick={onExportDDL}
      />

      <div className="w-px h-6 bg-gray-700/50 mx-1" />

      <ToolbarButton
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
        }
        label="Auto Layout"
        onClick={handleAutoLayout}
      />

      <div className="w-px h-6 bg-gray-700/50 mx-1" />

      <ToolbarButton
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        }
        label="Undo"
        onClick={handleUndo}
      />

      <ToolbarButton
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        }
        label="Redo"
        onClick={handleRedo}
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Table count */}
      <span className="text-[10px] text-gray-500">
        {tables.length} table{tables.length !== 1 ? 's' : ''}
      </span>
    </div>
  );
}

function ToolbarButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/5 transition-all text-xs group relative"
      onClick={onClick}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-gray-300 text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-gray-700 sm:hidden">
        {label}
      </span>
    </button>
  );
}
