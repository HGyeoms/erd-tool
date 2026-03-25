import { useState } from 'react';
import { useSchemaStore } from '../store/schema-store';
import type { Column } from '../types/schema';

const SQL_TYPES = [
  'INTEGER', 'BIGINT', 'SMALLINT', 'SERIAL', 'BIGSERIAL',
  'VARCHAR(255)', 'TEXT', 'CHAR(1)',
  'BOOLEAN',
  'TIMESTAMP', 'DATE', 'TIME',
  'DECIMAL(10,2)', 'FLOAT', 'DOUBLE PRECISION',
  'UUID', 'JSON', 'JSONB',
];

interface SidebarProps {
  selectedTableId: string | null;
  onSelectTable: (id: string | null) => void;
}

export function Sidebar({ selectedTableId, onSelectTable }: SidebarProps) {
  const tables = useSchemaStore((s) => s.tables);
  const removeTable = useSchemaStore((s) => s.removeTable);
  const addColumn = useSchemaStore((s) => s.addColumn);
  const updateColumn = useSchemaStore((s) => s.updateColumn);
  const removeColumn = useSchemaStore((s) => s.removeColumn);
  const updateTable = useSchemaStore((s) => s.updateTable);

  const selectedTable = tables.find((t) => t.id === selectedTableId) || null;
  const [tableListCollapsed, setTableListCollapsed] = useState(false);

  const handleAddColumn = () => {
    if (!selectedTable) return;
    const id = `col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    addColumn(selectedTable.id, {
      id,
      name: `column_${selectedTable.columns.length + 1}`,
      type: 'VARCHAR(255)',
      isPrimaryKey: false,
      isNullable: true,
      defaultValue: null,
    });
  };

  const handleDeleteTable = () => {
    if (!selectedTable) return;
    removeTable(selectedTable.id);
    onSelectTable(null);
  };

  return (
    <div className="w-72 h-full bg-[#1a1d27] border-r border-gray-800 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800">
        <h2 className="text-white text-sm font-semibold tracking-wide flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Schema Explorer
        </h2>
      </div>

      {/* Table List */}
      <div className="flex-shrink-0">
        <button
          className="w-full px-4 py-2 flex items-center justify-between text-xs text-gray-400 hover:text-gray-300 transition-colors"
          onClick={() => setTableListCollapsed(!tableListCollapsed)}
        >
          <span className="uppercase tracking-wider font-medium">
            Tables ({tables.length})
          </span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transition-transform ${tableListCollapsed ? '-rotate-90' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {!tableListCollapsed && (
          <div className="px-2 pb-2 space-y-0.5 max-h-48 overflow-y-auto custom-scrollbar">
            {tables.length === 0 && (
              <div className="px-2 py-3 text-xs text-gray-600 italic text-center">
                No tables yet. Click "Add Table" to start.
              </div>
            )}
            {tables.map((t) => (
              <button
                key={t.id}
                className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition-all ${
                  t.id === selectedTableId
                    ? 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'
                }`}
                onClick={() => onSelectTable(t.id)}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: t.color || '#3b82f6' }}
                  />
                  <span className="truncate font-medium">{t.name}</span>
                  <span className="ml-auto text-[11px] text-gray-500">{t.columns.length}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-800" />

      {/* Column Editor */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {!selectedTable ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 px-4">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 opacity-40">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <p className="text-xs text-center">Select a table to edit its columns</p>
          </div>
        ) : (
          <div className="p-3">
            {/* Table name editor */}
            <div className="mb-3">
              <label className="block text-[11px] text-gray-400 uppercase tracking-wider mb-1">
                Table Name
              </label>
              <input
                className="w-full bg-[#252830] text-white text-xs px-3 py-1.5 rounded-md border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all"
                value={selectedTable.name}
                onChange={(e) => updateTable(selectedTable.id, { name: e.target.value })}
              />
            </div>

            {/* Column header */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-gray-400 uppercase tracking-wider">
                Columns ({selectedTable.columns.length})
              </span>
              <button
                className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                onClick={handleAddColumn}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add
              </button>
            </div>

            {/* Column list */}
            <div className="space-y-2">
              {selectedTable.columns.map((col) => (
                <ColumnEditor
                  key={col.id}
                  column={col}
                  tableId={selectedTable.id}
                  updateColumn={updateColumn}
                  removeColumn={removeColumn}
                />
              ))}
            </div>

            {selectedTable.columns.length === 0 && (
              <div className="text-center py-4">
                <p className="text-xs text-gray-600 mb-2">No columns yet</p>
                <button
                  className="text-xs text-blue-400 hover:text-blue-300 px-3 py-1 rounded-md bg-blue-500/10 hover:bg-blue-500/20 transition-all"
                  onClick={handleAddColumn}
                >
                  Add first column
                </button>
              </div>
            )}

            {/* Delete table */}
            <div className="mt-4 pt-3 border-t border-gray-800">
              <button
                className="w-full text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 py-2 rounded-md transition-all flex items-center justify-center gap-1.5"
                onClick={handleDeleteTable}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete Table
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ColumnEditor({
  column,
  tableId,
  updateColumn,
  removeColumn,
}: {
  column: Column;
  tableId: string;
  updateColumn: (tableId: string, colId: string, updates: Partial<Omit<Column, 'id'>>) => void;
  removeColumn: (tableId: string, colId: string) => void;
}) {
  return (
    <div className="bg-[#252830] rounded-md p-2.5 border border-gray-700/50 hover:border-gray-600/50 transition-all group">
      {/* Name + Delete */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <input
          className="flex-1 bg-transparent text-gray-200 text-xs outline-none border-b border-transparent focus:border-gray-600 transition-colors"
          value={column.name}
          onChange={(e) => updateColumn(tableId, column.id, { name: e.target.value })}
          placeholder="column_name"
        />
        <button
          className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-0.5"
          onClick={() => removeColumn(tableId, column.id)}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Type dropdown */}
      <div className="mb-1.5">
        <select
          className="w-full bg-[#1a1d27] text-gray-400 text-[11px] px-2 py-1 rounded border border-gray-700 outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
          value={column.type}
          onChange={(e) => updateColumn(tableId, column.id, { type: e.target.value })}
        >
          {SQL_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
          {!SQL_TYPES.includes(column.type) && (
            <option value={column.type}>{column.type}</option>
          )}
        </select>
      </div>

      {/* Checkboxes + Default */}
      <div className="flex items-center gap-3 text-[11px]">
        <label className="flex items-center gap-1 text-gray-500 cursor-pointer hover:text-gray-400 transition-colors">
          <input
            type="checkbox"
            checked={column.isPrimaryKey}
            onChange={(e) => updateColumn(tableId, column.id, { isPrimaryKey: e.target.checked })}
            className="rounded border-gray-600 bg-[#1a1d27] text-blue-500 focus:ring-blue-500/30 w-3 h-3"
          />
          PK
        </label>
        <label className="flex items-center gap-1 text-gray-500 cursor-pointer hover:text-gray-400 transition-colors">
          <input
            type="checkbox"
            checked={column.isNullable}
            onChange={(e) => updateColumn(tableId, column.id, { isNullable: e.target.checked })}
            className="rounded border-gray-600 bg-[#1a1d27] text-blue-500 focus:ring-blue-500/30 w-3 h-3"
          />
          Null
        </label>
        <input
          className="flex-1 bg-[#1a1d27] text-gray-400 text-[11px] px-2 py-0.5 rounded border border-gray-700/50 outline-none focus:border-gray-600 transition-colors"
          value={column.defaultValue || ''}
          onChange={(e) => updateColumn(tableId, column.id, { defaultValue: e.target.value || null })}
          placeholder="default"
        />
      </div>
    </div>
  );
}
