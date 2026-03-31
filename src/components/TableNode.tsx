import { memo, useState, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { Table } from '../types/schema';
import { useSchemaStore } from '../store/schema-store';

const TABLE_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#f97316',
];

function getColor(color?: string) {
  return color || TABLE_COLORS[0];
}

type TableNodeData = Table & { selected?: boolean };

function TableNodeComponent({ data, selected }: NodeProps & { data: TableNodeData }) {
  const tableFromStore = useSchemaStore((s) => s.tables.find((t) => t.id === data.id));
  const table = tableFromStore || (data as TableNodeData);
  const updateTable = useSchemaStore((s) => s.updateTable);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(table.name);

  const handleDoubleClick = useCallback(() => {
    setEditName(table.name);
    setEditing(true);
  }, [table.name]);

  const handleBlur = useCallback(() => {
    setEditing(false);
    if (editName.trim() && editName.trim() !== table.name) {
      updateTable(table.id, { name: editName.trim() });
    }
  }, [editName, table.name, table.id, updateTable]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        (e.target as HTMLInputElement).blur();
      }
      if (e.key === 'Escape') {
        setEditName(table.name);
        setEditing(false);
      }
    },
    [table.name]
  );

  const accentColor = getColor(table.color);
  const pkColumns = table.columns.filter((c) => c.isPrimaryKey);
  const isCompositeKey = pkColumns.length > 1;

  return (
    <div
      className={`min-w-[300px] rounded-2xl shadow-2xl transition-all duration-200 border-2 ${
        selected
          ? 'border-blue-500 shadow-blue-500/20'
          : ''
      }`}
      style={{ background: 'var(--bg-secondary)', borderColor: selected ? undefined : 'var(--border)' }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center gap-3 rounded-t-[14px]"
        style={{ background: 'var(--bg-tertiary)', borderBottom: `2px solid ${accentColor}` }}
        onDoubleClick={handleDoubleClick}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accentColor}15` }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </div>
        <div className="flex-1 min-w-0 text-base font-bold truncate" style={{ color: 'var(--text-primary)' }}>
          {editing ? (
            <input
              className="outline-none border border-blue-500/50 rounded px-2 py-0.5 w-full"
              style={{ background: 'var(--input-bg)', color: 'var(--text-primary)' }}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          ) : (
            table.name
          )}
        </div>
        {isCompositeKey && (
          <span className="text-[9px] font-bold text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded flex items-center gap-1 whitespace-nowrap">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
            CPK ({pkColumns.length})
          </span>
        )}
      </div>

      {/* Columns */}
      <div className="py-2 rounded-b-2xl" style={{ background: 'var(--bg-secondary)' }}>
        {table.columns.length === 0 && (
          <div className="px-4 py-4 text-sm italic text-center opacity-60" style={{ color: 'var(--text-muted)' }}>No columns defined</div>
        )}
        {table.columns.map((col) => (
          <div key={col.id} className="relative flex items-center gap-2 px-5 py-2.5 group" style={{ ['--tw-bg-opacity' as string]: 0 }}>
            <Handle type="target" position={Position.Left} id={`${col.id}-target`} className="!w-3 !h-3 !bg-blue-500 !border-2 !-left-[7px]" style={{ borderColor: 'var(--bg-secondary)' }} />
            {col.isPrimaryKey && (
              <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${isCompositeKey ? 'text-orange-400 bg-orange-400/10' : 'text-yellow-400 bg-yellow-400/10'}`}>
                {isCompositeKey ? 'CPK' : 'PK'}
              </span>
            )}
            {col.isForeignKey && (
              <span className="text-[9px] font-bold text-cyan-400 bg-cyan-400/10 px-1 py-0.5 rounded">FK</span>
            )}
            <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--text-secondary)' }}>{col.name}</span>
            {col.isUnique && (
              <span className="text-[9px] font-bold text-purple-400 bg-purple-400/10 px-1 py-0.5 rounded">UQ</span>
            )}
            {col.isIndexed && (
              <span className="text-[9px] font-bold text-green-400 bg-green-400/10 px-1 py-0.5 rounded">IDX</span>
            )}
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded uppercase" style={{ color: 'var(--text-muted)', background: 'var(--bg-hover)' }}>{col.type}</span>
            <Handle type="source" position={Position.Right} id={`${col.id}-source`} className="!w-3 !h-3 !bg-blue-500 !border-2 !-right-[7px]" style={{ borderColor: 'var(--bg-secondary)' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export const TableNode = memo(TableNodeComponent);
