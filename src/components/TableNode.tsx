import { memo, useState, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { Table } from '../types/schema';
import { useSchemaStore } from '../store/schema-store';

function getColor(color?: string) {
  return color || '#3b82f6';
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
  const compositeKeys = table.compositeKeys || [];

  // Build a set of column IDs that are part of any composite key
  const compositeColumnIds = new Set<string>();
  for (const ck of compositeKeys) {
    for (const colId of ck.columnIds) {
      compositeColumnIds.add(colId);
    }
  }

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
        {compositeKeys.length > 0 && (
          <span className="text-[9px] font-bold text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded whitespace-nowrap">
            IDX {compositeKeys.length}
          </span>
        )}
      </div>

      {/* Columns */}
      <div className="py-2" style={{ background: 'var(--bg-secondary)' }}>
        {table.columns.length === 0 && (
          <div className="px-4 py-4 text-sm italic text-center opacity-60" style={{ color: 'var(--text-muted)' }}>No columns defined</div>
        )}
        {table.columns.map((col) => (
          <div key={col.id} className="relative flex items-center gap-2 px-5 py-2.5 group" style={{ ['--tw-bg-opacity' as string]: 0 }}>
            <Handle type="target" position={Position.Left} id={`${col.id}-target`} className="!w-3 !h-3 !bg-blue-500 !border-2 !-left-[7px]" style={{ borderColor: 'var(--bg-secondary)' }} />
            {col.isPrimaryKey && (
              <span className="text-[9px] font-bold text-yellow-400 bg-yellow-400/10 px-1 py-0.5 rounded">PK</span>
            )}
            {col.isForeignKey && (
              <span className="text-[9px] font-bold text-cyan-400 bg-cyan-400/10 px-1 py-0.5 rounded">FK</span>
            )}
            {compositeColumnIds.has(col.id) && (
              <span className="text-[9px] font-bold text-orange-400 bg-orange-400/10 px-1 py-0.5 rounded">CK</span>
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

      {/* Composite Keys / Indexes */}
      {compositeKeys.length > 0 && (
        <div className="border-t px-4 py-2 rounded-b-2xl" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          {compositeKeys.map((ck) => {
            const colNames = ck.columnIds
              .map((cid) => table.columns.find((c) => c.id === cid)?.name)
              .filter(Boolean);
            const typeColor = ck.type === 'PRIMARY' ? 'text-yellow-400 bg-yellow-400/10' : ck.type === 'UNIQUE' ? 'text-purple-400 bg-purple-400/10' : 'text-orange-400 bg-orange-400/10';
            return (
              <div key={ck.id} className="flex items-center gap-1.5 py-1">
                <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${typeColor}`}>{ck.type}</span>
                <span className="text-[10px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                  ({colNames.join(', ')})
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const TableNode = memo(TableNodeComponent);
