import { memo, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps, useViewport } from '@xyflow/react';
import type { Table } from '../types/schema';
import { useSchemaStore } from '../store/schema-store';
import { inferColumnType } from '../lib/column-inference';

function getColor(color?: string) {
  return color || '#3b82f6';
}

/* ── Column type → color mapping ── */
const TYPE_COLORS: Record<string, string> = {
  INTEGER: '#3b82f6',
  BIGINT: '#3b82f6',
  SMALLINT: '#3b82f6',
  SERIAL: '#06b6d4',
  BIGSERIAL: '#06b6d4',
  VARCHAR: '#10b981',
  TEXT: '#10b981',
  CHAR: '#10b981',
  BOOLEAN: '#8b5cf6',
  TIMESTAMP: '#f59e0b',
  DATE: '#f59e0b',
  TIME: '#f59e0b',
  DECIMAL: '#6366f1',
  FLOAT: '#6366f1',
  'DOUBLE PRECISION': '#6366f1',
  UUID: '#ec4899',
  JSON: '#f97316',
  JSONB: '#f97316',
};

function getTypeColor(type: string): string {
  const base = type.split('(')[0].toUpperCase().trim();
  return TYPE_COLORS[base] || '#6b7280';
}

/* ── Table role → color mapping ── */
const ROLE_COLORS: Record<string, string> = {
  ENTITY: '#3b82f6',
  JUNCTION: '#8b5cf6',
  LOOKUP: '#10b981',
  AGGREGATE: '#f59e0b',
  LOG: '#ef4444',
  CONFIG: '#06b6d4',
};

type TableNodeData = Table & { selected?: boolean };

function TableNodeComponent({ data, selected }: NodeProps & { data: TableNodeData }) {
  const tableFromStore = useSchemaStore((s) => s.tables.find((t) => t.id === data.id));
  const table = tableFromStore || (data as TableNodeData);
  const relationships = useSchemaStore((s) => s.relationships);
  const updateTable = useSchemaStore((s) => s.updateTable);
  const addColumn = useSchemaStore((s) => s.addColumn);
  const { zoom } = useViewport();

  // Semantic zoom levels
  const zoomLevel = zoom >= 0.6 ? 'full' : zoom >= 0.3 ? 'compact' : 'pill';
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(table.name);
  const [quickAddName, setQuickAddName] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const quickAddRef = useRef<HTMLInputElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isNew, setIsNew] = useState(true);

  useEffect(() => {
    if (isNew) {
      const timer = setTimeout(() => setIsNew(false), 350);
      return () => clearTimeout(timer);
    }
  }, [isNew]);

  const stats = useMemo(() => {
    const relCount = relationships.filter(
      (r) => r.sourceTableId === table.id || r.targetTableId === table.id
    ).length;
    const fkCount = table.columns.filter((c) => c.isForeignKey).length;
    return { cols: table.columns.length, rels: relCount, fks: fkCount };
  }, [table.id, table.columns, relationships]);

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

  const handleQuickAdd = useCallback(() => {
    const name = quickAddName.trim();
    if (!name) { setShowQuickAdd(false); return; }
    const id = `col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const inferredType = inferColumnType(name) || 'VARCHAR(255)';
    addColumn(table.id, {
      id,
      name,
      type: inferredType,
      isPrimaryKey: false,
      isNullable: true,
      defaultValue: null,
    });
    setQuickAddName('');
    // Keep input open for rapid entry
    setTimeout(() => quickAddRef.current?.focus(), 50);
  }, [quickAddName, table.id, addColumn]);

  const accentColor = getColor(table.color);
  const compositeKeys = table.compositeKeys || [];

  // Build a set of column IDs that are part of any composite key
  const compositeColumnIds = new Set<string>();
  for (const ck of compositeKeys) {
    for (const colId of ck.columnIds) {
      compositeColumnIds.add(colId);
    }
  }

  // Pill mode: just name + color
  if (zoomLevel === 'pill') {
    return (
      <div
        ref={nodeRef}
        className={`table-node rounded-xl px-4 py-2 border-2 transition-all duration-200 ${isNew ? 'node-enter' : ''} ${selected ? 'border-blue-500' : ''}`}
        style={{ background: accentColor, borderColor: selected ? undefined : `${accentColor}80` }}
      >
        <span className="text-sm font-bold text-white truncate">{table.name}</span>
        {table.columns.map((col) => (
          <span key={col.id}>
            <Handle type="target" position={Position.Left} id={`${col.id}-target`} className="!w-2 !h-2 !bg-white/50 !border-0 !-left-[5px]" style={{ top: '50%' }} />
            <Handle type="source" position={Position.Right} id={`${col.id}-source`} className="!w-2 !h-2 !bg-white/50 !border-0 !-right-[5px]" style={{ top: '50%' }} />
          </span>
        ))}
      </div>
    );
  }

  // Compact mode: name + PK columns only + stats
  if (zoomLevel === 'compact') {
    const pkCols = table.columns.filter((c) => c.isPrimaryKey || c.isForeignKey);
    return (
      <div
        ref={nodeRef}
        className={`table-node min-w-[200px] rounded-2xl transition-all duration-200 border-2 ${isNew ? 'node-enter' : ''} ${selected ? 'border-blue-500' : ''}`}
        style={{ background: 'var(--bg-secondary)', borderColor: selected ? undefined : 'var(--border)' }}
      >
        <div className="px-4 py-3 flex items-center gap-2 rounded-t-[14px]" style={{ background: 'var(--bg-tertiary)', borderBottom: `2px solid ${accentColor}` }}>
          <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: `${accentColor}15` }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
          </div>
          <span className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{table.name}</span>
          {table.role && (
            <span className="text-[8px] font-bold px-1 py-0.5 rounded whitespace-nowrap" style={{ color: ROLE_COLORS[table.role] || '#6b7280', background: `${ROLE_COLORS[table.role] || '#6b7280'}15` }}>{table.role}</span>
          )}
        </div>
        <div className="py-1" style={{ background: 'var(--bg-secondary)' }}>
          {pkCols.map((col) => (
            <div key={col.id} className="relative flex items-center gap-1.5 px-4 py-1.5">
              <Handle type="target" position={Position.Left} id={`${col.id}-target`} className="!w-2 !h-2 !bg-blue-500 !border-0 !-left-[5px]" style={{ borderColor: 'var(--bg-secondary)' }} />
              <span className="text-[8px] font-bold text-yellow-400">{col.isPrimaryKey ? 'PK' : 'FK'}</span>
              <span className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>{col.name}</span>
              <Handle type="source" position={Position.Right} id={`${col.id}-source`} className="!w-2 !h-2 !bg-blue-500 !border-0 !-right-[5px]" style={{ borderColor: 'var(--bg-secondary)' }} />
            </div>
          ))}
          {/* Hidden handles for non-PK/FK columns so edges still connect */}
          {table.columns.filter((c) => !c.isPrimaryKey && !c.isForeignKey).map((col) => (
            <span key={col.id}>
              <Handle type="target" position={Position.Left} id={`${col.id}-target`} className="!w-0 !h-0 !opacity-0 !-left-[5px]" />
              <Handle type="source" position={Position.Right} id={`${col.id}-source`} className="!w-0 !h-0 !opacity-0 !-right-[5px]" />
            </span>
          ))}
        </div>
        <div className="border-t px-3 py-1.5 rounded-b-2xl flex justify-around text-[9px]" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          <span>{stats.cols} cols</span>
          <span>{stats.rels} rels</span>
        </div>
      </div>
    );
  }

  // Full mode (default)
  return (
    <div
      ref={nodeRef}
      className={`table-node min-w-[300px] rounded-2xl transition-all duration-200 border-2 ${
        isNew ? 'node-enter' : ''
      } ${
        selected
          ? 'border-blue-500'
          : ''
      }`}
      style={{
        background: 'var(--bg-secondary)',
        borderColor: selected ? undefined : 'var(--border)',
        ...(selected ? { boxShadow: 'var(--shadow-hover), 0 0 0 4px rgba(59,130,246,0.15)' } : {}),
      }}
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
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <div className="text-base font-bold truncate" style={{ color: 'var(--text-primary)' }}>
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
          {table.role && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
              style={{ color: ROLE_COLORS[table.role] || '#6b7280', background: `${ROLE_COLORS[table.role] || '#6b7280'}15` }}
            >
              {table.role}
            </span>
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
            <span
              className="text-[11px] font-mono px-1.5 py-0.5 rounded uppercase"
              style={{ color: getTypeColor(col.type), background: `${getTypeColor(col.type)}12`, borderLeft: `2px solid ${getTypeColor(col.type)}` }}
            >{col.type}</span>
            <Handle type="source" position={Position.Right} id={`${col.id}-source`} className="!w-3 !h-3 !bg-blue-500 !border-2 !-right-[7px]" style={{ borderColor: 'var(--bg-secondary)' }} />
          </div>
        ))}

        {/* Inline Quick-Add */}
        {showQuickAdd ? (
          <div className="px-5 py-2 flex items-center gap-2">
            <span className="text-[9px] font-bold text-green-400 bg-green-400/10 px-1 py-0.5 rounded">+</span>
            <input
              ref={quickAddRef}
              className="flex-1 text-sm px-2 py-1 rounded border outline-none"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
              value={quickAddName}
              onChange={(e) => setQuickAddName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleQuickAdd(); }
                if (e.key === 'Escape') { setShowQuickAdd(false); setQuickAddName(''); }
                e.stopPropagation();
              }}
              onBlur={() => { if (!quickAddName.trim()) { setShowQuickAdd(false); setQuickAddName(''); } }}
              placeholder="column name..."
              autoFocus
            />
          </div>
        ) : (
          <button
            className="w-full px-5 py-1.5 text-[11px] text-blue-400/60 hover:text-blue-400 hover:bg-blue-500/5 transition-colors text-left flex items-center gap-1.5"
            onClick={() => { setShowQuickAdd(true); setTimeout(() => quickAddRef.current?.focus(), 50); }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add column
          </button>
        )}
      </div>

      {/* Composite Keys / Indexes */}
      {compositeKeys.length > 0 && (
        <div className="border-t px-4 py-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
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

      {/* Stats Footer */}
      <div className="border-t px-4 py-2 rounded-b-2xl flex justify-around gap-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
          <span style={{ color: 'var(--text-secondary)' }}>≡</span> {stats.cols} Cols
        </span>
        <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
          <span style={{ color: 'var(--text-secondary)' }}>⟷</span> {stats.rels} Rels
        </span>
        {stats.fks > 0 && (
          <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>↗</span> {stats.fks} FK
          </span>
        )}
      </div>
    </div>
  );
}

export const TableNode = memo(TableNodeComponent);
