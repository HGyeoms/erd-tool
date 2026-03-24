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
  const table = data as TableNodeData;
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

  return (
    <div
      className={`min-w-[220px] rounded-lg shadow-xl transition-all duration-150 ${
        selected
          ? 'ring-2 ring-blue-400 shadow-blue-500/20'
          : 'ring-1 ring-gray-700/50 hover:ring-gray-600'
      }`}
      style={{ background: '#252830' }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center gap-2"
        style={{ borderBottom: `3px solid ${accentColor}` }}
        onDoubleClick={handleDoubleClick}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
        {editing ? (
          <input
            className="bg-transparent text-white text-sm font-semibold outline-none border-b border-blue-400 w-full"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        ) : (
          <span className="text-white text-sm font-semibold truncate cursor-default">
            {table.name}
          </span>
        )}
        <span className="ml-auto text-[10px] text-gray-500">{table.columns.length} cols</span>
      </div>

      {/* Columns */}
      <div className="py-1">
        {table.columns.length === 0 && (
          <div className="px-3 py-2 text-xs text-gray-500 italic">No columns</div>
        )}
        {table.columns.map((col) => (
          <div
            key={col.id}
            className="relative flex items-center gap-2 px-3 py-[5px] text-xs hover:bg-white/5 group"
          >
            <Handle
              type="target"
              position={Position.Left}
              id={`${col.id}-target`}
              className="!w-3 !h-3 !bg-blue-500/60 !border-blue-400 hover:!bg-blue-400 !-left-[6px]"
              style={{ top: '50%' }}
            />

            {/* Icon */}
            <span className="w-4 flex-shrink-0 text-center">
              {col.isPrimaryKey ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
              ) : col.isForeignKey ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2.5">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              ) : (
                <span className="text-gray-600">-</span>
              )}
            </span>

            {/* Name */}
            <span className={`${col.isPrimaryKey ? 'text-yellow-300 font-medium' : 'text-gray-300'} truncate`}>
              {col.name}
            </span>

            {/* Type */}
            <span className="ml-auto text-gray-500 font-mono text-[10px] flex-shrink-0">
              {col.type}
            </span>

            {/* Nullable badge */}
            {!col.isNullable && !col.isPrimaryKey && (
              <span className="text-[9px] text-orange-400/70 flex-shrink-0">NN</span>
            )}

            <Handle
              type="source"
              position={Position.Right}
              id={`${col.id}-source`}
              className="!w-3 !h-3 !bg-blue-500/60 !border-blue-400 hover:!bg-blue-400 !-right-[6px]"
              style={{ top: '50%' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export const TableNode = memo(TableNodeComponent);
