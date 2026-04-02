import { useState, useEffect } from 'react';
import { useSchemaStore } from '../store/schema-store';
import { layoutDB, type LayoutRow } from '../lib/local-db';

interface LayoutPanelProps {
  workspaceId: string;
  onClose: () => void;
}

export function LayoutPanel({ workspaceId, onClose }: LayoutPanelProps) {
  const tables = useSchemaStore((s) => s.tables);
  const groups = useSchemaStore((s) => s.groups);
  const updateTablePosition = useSchemaStore((s) => s.updateTablePosition);
  const updateGroup = useSchemaStore((s) => s.updateGroup);
  const [layouts, setLayouts] = useState<LayoutRow[]>([]);
  const [saveName, setSaveName] = useState('');
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);

  const loadLayouts = async () => {
    const rows = await layoutDB.getByWorkspace(workspaceId);
    setLayouts(rows);
  };

  useEffect(() => {
    loadLayouts();
  }, [workspaceId]);

  const handleSave = async () => {
    const positions: Record<string, { x: number; y: number }> = {};
    for (const t of tables) {
      positions[t.id] = t.position;
    }
    const groupPositions: Record<string, { x: number; y: number; width: number; height: number }> = {};
    for (const g of (groups || [])) {
      groupPositions[g.id] = { ...g.position, ...g.size };
    }

    const row: LayoutRow = {
      id: `layout-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      workspaceId,
      name: saveName.trim() || `Layout ${new Date().toLocaleString('ko-KR')}`,
      positions,
      groupPositions,
      created_at: new Date().toISOString(),
    };

    await layoutDB.insert(row);
    setSaveName('');
    loadLayouts();
  };

  const handleRestore = (layout: LayoutRow) => {
    for (const [tableId, pos] of Object.entries(layout.positions)) {
      updateTablePosition(tableId, pos);
    }
    if (layout.groupPositions) {
      for (const [groupId, gp] of Object.entries(layout.groupPositions)) {
        updateGroup(groupId, {
          position: { x: gp.x, y: gp.y },
          size: { width: gp.width, height: gp.height },
        });
      }
    }
    setConfirmRestore(null);
  };

  const handleDelete = async (id: string) => {
    await layoutDB.remove(id);
    loadLayouts();
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-xl"
      style={{ background: 'var(--bg-modal)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl border shadow-2xl"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Saved Layouts</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Save and restore table arrangements</p>
          </div>
          <button className="rounded-lg p-2 transition-all hover:bg-white/5" style={{ color: 'var(--text-secondary)' }} onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Save new layout */}
        <div className="px-6 py-4 border-b flex gap-2" style={{ borderColor: 'var(--border)' }}>
          <input
            className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500"
            style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
            placeholder="Layout name (optional)"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <button
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 active:scale-95 transition-all whitespace-nowrap"
            onClick={handleSave}
          >
            Save Layout
          </button>
        </div>

        {/* Layout list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-3">
          {layouts.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No saved layouts yet.</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Click "Save Layout" to save the current table arrangement.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {layouts.map((layout) => (
                <LayoutItem
                  key={layout.id}
                  layout={layout}
                  isConfirming={confirmRestore === layout.id}
                  onRestore={() => setConfirmRestore(layout.id)}
                  onConfirmRestore={() => handleRestore(layout)}
                  onCancelRestore={() => setConfirmRestore(null)}
                  onRemove={() => handleDelete(layout.id)}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LayoutItem({
  layout,
  isConfirming,
  onRestore,
  onConfirmRestore,
  onCancelRestore,
  onRemove,
  formatDate,
}: {
  layout: LayoutRow;
  isConfirming: boolean;
  onRestore: () => void;
  onConfirmRestore: () => void;
  onCancelRestore: () => void;
  onRemove: () => void;
  formatDate: (iso: string) => string;
}) {
  const tableCount = Object.keys(layout.positions).length;
  const groupCount = Object.keys(layout.groupPositions || {}).length;

  if (isConfirming) {
    return (
      <div className="rounded-xl border border-amber-500/40 p-4 text-center" style={{ background: 'var(--bg-tertiary)' }}>
        <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
          Apply this layout? Table positions will change.
        </p>
        <div className="flex gap-2 justify-center">
          <button className="rounded-lg px-4 py-1.5 text-xs font-bold hover:bg-white/5 transition-all" style={{ color: 'var(--text-secondary)' }} onClick={onCancelRestore}>
            Cancel
          </button>
          <button className="rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-amber-500 active:scale-95 transition-all" onClick={onConfirmRestore}>
            Apply
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-3 rounded-xl px-4 py-3 transition-all hover:bg-white/5">
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate block" style={{ color: 'var(--text-primary)' }}>
          {layout.name}
        </span>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{formatDate(layout.created_at)}</span>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {tableCount} tables{groupCount > 0 ? `, ${groupCount} groups` : ''}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="rounded-lg p-1.5 text-blue-400 hover:bg-blue-500/10 transition-all"
          onClick={onRestore}
          title="Apply layout"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>
        <button
          className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10 transition-all"
          onClick={onRemove}
          title="Delete"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
