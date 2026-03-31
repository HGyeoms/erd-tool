import { useState, useCallback, useRef, useEffect } from 'react';
import { useSchemaStore } from '../store/schema-store';
import type { Column, EnumType, CompositeKey } from '../types/schema';

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
  const reorderColumns = useSchemaStore((s) => s.reorderColumns);
  const updateTable = useSchemaStore((s) => s.updateTable);
  const enums = useSchemaStore((s) => s.enums) || [];
  const addEnum = useSchemaStore((s) => s.addEnum);
  const updateEnum = useSchemaStore((s) => s.updateEnum);
  const removeEnum = useSchemaStore((s) => s.removeEnum);
  const addCompositeKey = useSchemaStore((s) => s.addCompositeKey);
  const updateCompositeKey = useSchemaStore((s) => s.updateCompositeKey);
  const removeCompositeKey = useSchemaStore((s) => s.removeCompositeKey);

  const selectedTable = tables.find((t) => t.id === selectedTableId) || null;
  const [tableListCollapsed, setTableListCollapsed] = useState(false);
  const [enumListCollapsed, setEnumListCollapsed] = useState(true);
  const [editingEnumId, setEditingEnumId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(288); // 72 * 4 = 288px (w-72)
  const isResizing = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = Math.min(Math.max(e.clientX, 200), 600);
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

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

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (dragIndex !== null && selectedTable && dragIndex !== index) {
      reorderColumns(selectedTable.id, dragIndex, index);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDeleteTable = () => {
    if (!selectedTable) return;
    removeTable(selectedTable.id);
    onSelectTable(null);
  };

  return (
    <div className="h-full border-r flex flex-col overflow-hidden relative" style={{ width: sidebarWidth, background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-sm font-semibold tracking-wide flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
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
          className="w-full px-4 py-2 flex items-center justify-between text-xs transition-colors"
          style={{ color: 'var(--text-secondary)' }}
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

      {/* Enum Types */}
      <div className="flex-shrink-0">
        <button
          className="w-full px-4 py-2 flex items-center justify-between text-xs text-gray-400 hover:text-gray-300 transition-colors"
          onClick={() => setEnumListCollapsed(!enumListCollapsed)}
        >
          <span className="uppercase tracking-wider font-medium">
            Enums ({enums.length})
          </span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transition-transform ${enumListCollapsed ? '-rotate-90' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {!enumListCollapsed && (
          <div className="px-3 pb-2 space-y-1.5">
            {enums.map((enumType) => (
              <EnumEditor
                key={enumType.id}
                enumType={enumType}
                isEditing={editingEnumId === enumType.id}
                onToggleEdit={() => setEditingEnumId(editingEnumId === enumType.id ? null : enumType.id)}
                updateEnum={updateEnum}
                removeEnum={removeEnum}
              />
            ))}
            <button
              className="w-full text-[11px] text-blue-400 hover:text-blue-300 py-1.5 rounded-md hover:bg-blue-500/10 transition-all flex items-center justify-center gap-1"
              onClick={() => {
                const id = `enum-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                addEnum({ id, name: `status_${enums.length + 1}`, values: ['value1', 'value2'] });
                setEditingEnumId(id);
                setEnumListCollapsed(false);
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Enum
            </button>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t" style={{ borderColor: 'var(--border)' }} />

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
              <label className="block text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                Table Name
              </label>
              <input
                className="w-full text-xs px-3 py-1.5 rounded-md border focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                value={selectedTable.name}
                onChange={(e) => updateTable(selectedTable.id, { name: e.target.value })}
              />
            </div>

            {/* Table comment */}
            <div className="mb-3">
              <label className="block text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                Comment
              </label>
              <textarea
                className="w-full text-xs px-3 py-1.5 rounded-md border focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all resize-none min-h-[48px]"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
                value={selectedTable.comment || ''}
                onChange={(e) => updateTable(selectedTable.id, { comment: e.target.value || undefined })}
                placeholder="Table description..."
              />
            </div>

            {/* Table color picker */}
            <div className="mb-3">
              <label className="block text-[11px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Color
              </label>
              <div className="flex items-center gap-1.5">
                {['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#f97316'].map((c) => (
                  <button
                    key={c}
                    className={`w-5 h-5 rounded-full transition-all ${
                      (selectedTable.color || '#3b82f6') === c
                        ? 'ring-2 ring-white/40 scale-110'
                        : 'hover:scale-110 opacity-70 hover:opacity-100'
                    }`}
                    style={{ background: c }}
                    onClick={() => updateTable(selectedTable.id, { color: c })}
                  />
                ))}
              </div>
            </div>

            {/* Column header */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
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
              {selectedTable.columns.map((col, index) => (
                <ColumnEditor
                  key={col.id}
                  column={col}
                  index={index}
                  tableId={selectedTable.id}
                  updateColumn={updateColumn}
                  removeColumn={removeColumn}
                  isDragging={dragIndex === index}
                  isDragOver={dragOverIndex === index}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  enums={enums}
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

            {/* Composite Keys / Indexes */}
            <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Indexes ({(selectedTable.compositeKeys || []).length})
                </span>
                <button
                  className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                  onClick={() => {
                    const id = `ck-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                    addCompositeKey(selectedTable.id, {
                      id,
                      name: `idx_${selectedTable.name}_${(selectedTable.compositeKeys || []).length + 1}`,
                      type: 'INDEX',
                      columnIds: [],
                    });
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {(selectedTable.compositeKeys || []).map((ck) => (
                  <CompositeKeyEditor
                    key={ck.id}
                    compositeKey={ck}
                    tableId={selectedTable.id}
                    columns={selectedTable.columns}
                    updateCompositeKey={updateCompositeKey}
                    removeCompositeKey={removeCompositeKey}
                  />
                ))}
              </div>
            </div>

            {/* Delete table */}
            <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
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

      {/* Resize handle */}
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/40 active:bg-blue-500/60 transition-colors"
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}

function ColumnEditor({
  column,
  index,
  tableId,
  updateColumn,
  removeColumn,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  enums,
}: {
  column: Column;
  index: number;
  tableId: string;
  updateColumn: (tableId: string, colId: string, updates: Partial<Omit<Column, 'id'>>) => void;
  removeColumn: (tableId: string, colId: string) => void;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
  enums: EnumType[];
}) {
  return (
    <div
      className={`rounded-md p-2.5 border transition-all group ${
        isDragOver ? 'border-blue-500/60' : isDragging ? 'opacity-40' : ''
      }`}
      style={{ background: isDragOver ? 'rgba(59,130,246,0.05)' : 'var(--bg-tertiary)', borderColor: isDragOver ? undefined : 'var(--border-light)' }}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={() => onDrop(index)}
      onDragEnd={onDragEnd}
    >
      {/* Name + Delete */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="3" className="flex-shrink-0 cursor-grab active:cursor-grabbing">
          <circle cx="8" cy="6" r="1.5" /><circle cx="16" cy="6" r="1.5" />
          <circle cx="8" cy="12" r="1.5" /><circle cx="16" cy="12" r="1.5" />
          <circle cx="8" cy="18" r="1.5" /><circle cx="16" cy="18" r="1.5" />
        </svg>
        <input
          className="flex-1 bg-transparent text-xs outline-none border-b border-transparent focus:border-gray-600 transition-colors"
          style={{ color: 'var(--text-primary)' }}
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
          className="w-full text-[11px] px-2 py-1 rounded border outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
          value={column.type}
          onChange={(e) => updateColumn(tableId, column.id, { type: e.target.value })}
        >
          {SQL_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
          {enums.length > 0 && (
            <optgroup label="ENUM Types">
              {enums.map((e) => (
                <option key={e.id} value={e.name}>{e.name}</option>
              ))}
            </optgroup>
          )}
          {!SQL_TYPES.includes(column.type) && !enums.some((e) => e.name === column.type) && (
            <option value={column.type}>{column.type}</option>
          )}
        </select>
      </div>

      {/* Checkboxes */}
      <div className="flex items-center gap-2 text-[11px] mb-1.5">
        <label className="flex items-center gap-1 cursor-pointer transition-colors" style={{ color: 'var(--text-muted)' }}>
          <input
            type="checkbox"
            checked={column.isPrimaryKey}
            onChange={(e) => updateColumn(tableId, column.id, { isPrimaryKey: e.target.checked })}
            className="rounded border-gray-600 text-blue-500 focus:ring-blue-500/30 w-3 h-3"
            style={{ background: 'var(--bg-secondary)' }}
          />
          PK
        </label>
        <label className="flex items-center gap-1 cursor-pointer transition-colors" style={{ color: 'var(--text-muted)' }}>
          <input
            type="checkbox"
            checked={column.isNullable}
            onChange={(e) => updateColumn(tableId, column.id, { isNullable: e.target.checked })}
            className="rounded border-gray-600 text-blue-500 focus:ring-blue-500/30 w-3 h-3"
            style={{ background: 'var(--bg-secondary)' }}
          />
          Null
        </label>
        <label className="flex items-center gap-1 cursor-pointer transition-colors" style={{ color: 'var(--text-muted)' }}>
          <input
            type="checkbox"
            checked={column.isUnique || false}
            onChange={(e) => updateColumn(tableId, column.id, { isUnique: e.target.checked || undefined })}
            className="rounded border-gray-600 text-purple-500 focus:ring-purple-500/30 w-3 h-3"
            style={{ background: 'var(--bg-secondary)' }}
          />
          UQ
        </label>
        <label className="flex items-center gap-1 cursor-pointer transition-colors" style={{ color: 'var(--text-muted)' }}>
          <input
            type="checkbox"
            checked={column.isIndexed || false}
            onChange={(e) => updateColumn(tableId, column.id, { isIndexed: e.target.checked || undefined })}
            className="rounded border-gray-600 text-green-500 focus:ring-green-500/30 w-3 h-3"
            style={{ background: 'var(--bg-secondary)' }}
          />
          IDX
        </label>
      </div>
      {/* Default + Comment */}
      <div className="flex gap-1.5">
        <input
          className="flex-1 text-[11px] px-2 py-0.5 rounded border outline-none focus:border-gray-600 transition-colors"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderColor: 'var(--border-light)' }}
          value={column.defaultValue || ''}
          onChange={(e) => updateColumn(tableId, column.id, { defaultValue: e.target.value || null })}
          placeholder="default"
        />
        <input
          className="flex-1 text-[11px] px-2 py-0.5 rounded border outline-none focus:border-gray-600 transition-colors"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderColor: 'var(--border-light)' }}
          value={column.comment || ''}
          onChange={(e) => updateColumn(tableId, column.id, { comment: e.target.value || undefined })}
          placeholder="comment"
        />
      </div>
    </div>
  );
}

function EnumEditor({
  enumType,
  isEditing,
  onToggleEdit,
  updateEnum,
  removeEnum,
}: {
  enumType: EnumType;
  isEditing: boolean;
  onToggleEdit: () => void;
  updateEnum: (enumId: string, updates: Partial<Omit<EnumType, 'id'>>) => void;
  removeEnum: (enumId: string) => void;
}) {
  const [newValue, setNewValue] = useState('');

  const handleAddValue = () => {
    const trimmed = newValue.trim();
    if (!trimmed || enumType.values.includes(trimmed)) return;
    updateEnum(enumType.id, { values: [...enumType.values, trimmed] });
    setNewValue('');
  };

  const handleRemoveValue = (val: string) => {
    updateEnum(enumType.id, { values: enumType.values.filter((v) => v !== val) });
  };

  return (
    <div className="rounded-md border overflow-hidden" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-light)' }}>
      <div
        className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={onToggleEdit}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" className="flex-shrink-0">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <line x1="8" y1="9" x2="16" y2="9" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="12" y2="17" />
        </svg>
        <span className="text-xs truncate flex-1 font-medium" style={{ color: 'var(--text-primary)' }}>{enumType.name}</span>
        <span className="text-[10px] text-gray-500">{enumType.values.length}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-gray-500 transition-transform ${isEditing ? '' : '-rotate-90'}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {isEditing && (
        <div className="px-2.5 pb-2.5 space-y-1.5 border-t pt-2" style={{ borderColor: 'var(--border-light)' }}>
          {/* Enum name */}
          <input
            className="w-full text-xs px-2 py-1 rounded border focus:border-blue-500 outline-none transition-colors"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
            value={enumType.name}
            onChange={(e) => updateEnum(enumType.id, { name: e.target.value })}
            placeholder="enum_name"
          />

          {/* Values list */}
          <div className="space-y-0.5">
            {enumType.values.map((val) => (
              <div key={val} className="flex items-center gap-1 group">
                <span className="text-[11px] flex-1 truncate px-1" style={{ color: 'var(--text-secondary)' }}>{val}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-0.5"
                  onClick={() => handleRemoveValue(val)}
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Add value */}
          <div className="flex gap-1">
            <input
              className="flex-1 text-[11px] px-2 py-0.5 rounded border outline-none focus:border-gray-600 transition-colors"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderColor: 'var(--border-light)' }}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddValue(); }}
              placeholder="new value..."
            />
            <button
              className="text-[10px] text-blue-400 hover:text-blue-300 px-1.5 rounded hover:bg-blue-500/10 transition-all"
              onClick={handleAddValue}
            >
              Add
            </button>
          </div>

          {/* Delete enum */}
          <button
            className="w-full text-[11px] text-red-400/70 hover:text-red-400 py-1 rounded hover:bg-red-500/10 transition-all"
            onClick={() => removeEnum(enumType.id)}
          >
            Delete Enum
          </button>
        </div>
      )}
    </div>
  );
}

function CompositeKeyEditor({
  compositeKey,
  tableId,
  columns,
  updateCompositeKey,
  removeCompositeKey,
}: {
  compositeKey: CompositeKey;
  tableId: string;
  columns: Column[];
  updateCompositeKey: (tableId: string, keyId: string, updates: Partial<Omit<CompositeKey, 'id'>>) => void;
  removeCompositeKey: (tableId: string, keyId: string) => void;
}) {
  const toggleColumn = (colId: string) => {
    const current = compositeKey.columnIds;
    const next = current.includes(colId)
      ? current.filter((id) => id !== colId)
      : [...current, colId];
    updateCompositeKey(tableId, compositeKey.id, { columnIds: next });
  };

  return (
    <div className="rounded-md p-2.5 border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-light)' }}>
      {/* Name */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <input
          className="flex-1 bg-transparent text-xs outline-none border-b border-transparent focus:border-gray-600 transition-colors"
          style={{ color: 'var(--text-primary)' }}
          value={compositeKey.name}
          onChange={(e) => updateCompositeKey(tableId, compositeKey.id, { name: e.target.value })}
          placeholder="index_name"
        />
        <button
          className="text-gray-600 hover:text-red-400 transition-all p-0.5"
          onClick={() => removeCompositeKey(tableId, compositeKey.id)}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Type selector */}
      <div className="flex items-center gap-1 mb-1.5">
        {(['INDEX', 'UNIQUE', 'PRIMARY'] as const).map((t) => (
          <button
            key={t}
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded transition-all ${
              compositeKey.type === t
                ? t === 'PRIMARY' ? 'text-yellow-400 bg-yellow-400/15 ring-1 ring-yellow-400/30'
                : t === 'UNIQUE' ? 'text-purple-400 bg-purple-400/15 ring-1 ring-purple-400/30'
                : 'text-orange-400 bg-orange-400/15 ring-1 ring-orange-400/30'
                : 'text-gray-500 hover:text-gray-400 hover:bg-white/5'
            }`}
            onClick={() => updateCompositeKey(tableId, compositeKey.id, { type: t })}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Column selection */}
      <div className="space-y-0.5">
        {columns.map((col) => (
          <label key={col.id} className="flex items-center gap-1.5 cursor-pointer text-[11px] py-0.5" style={{ color: 'var(--text-muted)' }}>
            <input
              type="checkbox"
              checked={compositeKey.columnIds.includes(col.id)}
              onChange={() => toggleColumn(col.id)}
              className="rounded border-gray-600 text-orange-500 focus:ring-orange-500/30 w-3 h-3"
              style={{ background: 'var(--bg-secondary)' }}
            />
            <span className={compositeKey.columnIds.includes(col.id) ? 'text-orange-400' : ''}>{col.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
