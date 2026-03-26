import { useState } from 'react';
import { useVersionStore, type SchemaVersion } from '../store/version-store';
import { useSchemaStore } from '../store/schema-store';

interface VersionPanelProps {
  workspaceId: string;
  onClose: () => void;
}

export function VersionPanel({ workspaceId, onClose }: VersionPanelProps) {
  const versions = useVersionStore((s) => s.versions.filter((v) => v.workspaceId === workspaceId));
  const saveVersion = useVersionStore((s) => s.saveVersion);
  const removeVersion = useVersionStore((s) => s.removeVersion);
  const restoreVersion = useVersionStore((s) => s.restoreVersion);
  const setSchema = useSchemaStore((s) => s.setSchema);
  const tables = useSchemaStore((s) => s.tables);
  const relationships = useSchemaStore((s) => s.relationships);
  const enums = useSchemaStore((s) => s.enums);
  const groups = useSchemaStore((s) => s.groups);
  const [saveName, setSaveName] = useState('');
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);

  const handleSave = () => {
    const schema = { tables, relationships, enums, groups };
    saveVersion(workspaceId, schema, saveName.trim() || undefined);
    setSaveName('');
  };

  const handleRestore = (versionId: string) => {
    const schema = restoreVersion(versionId);
    if (schema) {
      setSchema(schema);
      setConfirmRestore(null);
    }
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
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Version History</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Save snapshots and restore previous versions</p>
          </div>
          <button className="rounded-lg p-2 transition-all hover:bg-white/5" style={{ color: 'var(--text-secondary)' }} onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Save new version */}
        <div className="px-6 py-4 border-b flex gap-2" style={{ borderColor: 'var(--border)' }}>
          <input
            className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500"
            style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
            placeholder="Version name (optional)"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <button
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 active:scale-95 transition-all whitespace-nowrap"
            onClick={handleSave}
          >
            Save Snapshot
          </button>
        </div>

        {/* Version list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-3">
          {versions.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No saved versions yet.</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Click "Save Snapshot" to create your first version.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {versions.map((v) => (
                <VersionItem
                  key={v.id}
                  version={v}
                  isConfirming={confirmRestore === v.id}
                  onRestore={() => setConfirmRestore(v.id)}
                  onConfirmRestore={() => handleRestore(v.id)}
                  onCancelRestore={() => setConfirmRestore(null)}
                  onRemove={() => removeVersion(v.id)}
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

function VersionItem({
  version: v,
  isConfirming,
  onRestore,
  onConfirmRestore,
  onCancelRestore,
  onRemove,
  formatDate,
}: {
  version: SchemaVersion;
  isConfirming: boolean;
  onRestore: () => void;
  onConfirmRestore: () => void;
  onCancelRestore: () => void;
  onRemove: () => void;
  formatDate: (iso: string) => string;
}) {
  const tableCount = v.schema.tables?.length || 0;
  const relCount = v.schema.relationships?.length || 0;

  if (isConfirming) {
    return (
      <div className="rounded-xl border border-amber-500/40 p-4 text-center" style={{ background: 'var(--bg-tertiary)' }}>
        <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
          Restore this version? Current schema will be replaced.
        </p>
        <div className="flex gap-2 justify-center">
          <button className="rounded-lg px-4 py-1.5 text-xs font-bold hover:bg-white/5 transition-all" style={{ color: 'var(--text-secondary)' }} onClick={onCancelRestore}>
            Cancel
          </button>
          <button className="rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-amber-500 active:scale-95 transition-all" onClick={onConfirmRestore}>
            Restore
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-3 rounded-xl px-4 py-3 transition-all hover:bg-white/5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {v.label}
          </span>
          {v.auto && (
            <span className="flex-shrink-0 rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-400">
              AUTO
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{formatDate(v.createdAt)}</span>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{tableCount} tables, {relCount} rel</span>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="rounded-lg p-1.5 text-blue-400 hover:bg-blue-500/10 transition-all"
          onClick={onRestore}
          title="Restore"
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
