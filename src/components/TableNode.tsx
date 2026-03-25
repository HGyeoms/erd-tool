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
      className={`min-w-[300px] rounded-2xl shadow-2xl transition-all duration-200 border-2 ${
        selected
          ? 'border-blue-500 shadow-blue-500/20'
          : 'border-gray-800 hover:border-gray-700'
      }`}
      style={{ background: '#1c1f2b' }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center gap-3 bg-[#252836] rounded-t-[14px]"
        style={{ borderBottom: `2px solid ${accentColor}` }}
        onDoubleClick={handleDoubleClick}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accentColor}15` }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </div>
        <div className="flex-1 min-w-0 text-white text-base font-bold truncate">
          {editing ? (
            <input
              className="bg-[#13151c] text-white outline-none border border-blue-500/50 rounded px-2 py-0.5 w-full"
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
      </div>

      {/* Columns */}
      <div className="py-2 bg-[#1c1f2b] rounded-b-2xl">
        {table.columns.length === 0 && (
          <div className="px-4 py-4 text-sm text-gray-500 italic text-center opacity-60">No columns defined</div>
        )}
        {table.columns.map((col) => (
          <div key={col.id} className="relative flex items-center gap-3 px-5 py-2.5 hover:bg-white/5 group">
            <Handle type="target" position={Position.Left} id={`${col.id}-target`} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-gray-900 !-left-[7px]" />
            <span className="flex-1 text-sm text-gray-300 font-medium truncate">{col.name}</span>
            <span className="text-[11px] font-mono text-gray-400 bg-black/20 px-1.5 py-0.5 rounded uppercase">{col.type}</span>
            <Handle type="source" position={Position.Right} id={`${col.id}-source`} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-gray-900 !-right-[7px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export const TableNode = memo(TableNodeComponent);
