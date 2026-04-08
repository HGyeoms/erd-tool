import { useState, useMemo } from 'react';
import { useSchemaStore } from '../store/schema-store';
import { findPath, type PathResult } from '../lib/find-path';

interface FindPathPanelProps {
  onClose: () => void;
  onHighlightPath: (tableIds: string[], relationshipIds: string[]) => void;
  initialTableId?: string | null;
}

export function FindPathPanel({ onClose, onHighlightPath, initialTableId }: FindPathPanelProps) {
  const tables = useSchemaStore((s) => s.tables);
  const relationships = useSchemaStore((s) => s.relationships);

  const [sourceId, setSourceId] = useState<string>(initialTableId || '');
  const [targetId, setTargetId] = useState<string>('');

  const result: PathResult | null | 'no-path' = useMemo(() => {
    if (!sourceId || !targetId || sourceId === targetId) return null;
    const r = findPath(sourceId, targetId, relationships);
    return r || 'no-path';
  }, [sourceId, targetId, relationships]);

  const pathTables = useMemo(() => {
    if (!result || result === 'no-path') return [];
    return result.tableIds.map((id) => tables.find((t) => t.id === id)).filter(Boolean);
  }, [result, tables]);

  const handleHighlight = () => {
    if (result && result !== 'no-path') {
      onHighlightPath(result.tableIds, result.relationshipIds);
    }
  };

  return (
    <div
      className="fixed left-1/2 top-16 -translate-x-1/2 z-50 w-96 rounded-2xl border shadow-2xl overflow-hidden"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
            <circle cx="5" cy="12" r="3" />
            <circle cx="19" cy="12" r="3" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Find Path</span>
        </div>
        <button
          className="p-1 rounded-md hover:bg-white/10 transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onClick={onClose}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Selectors */}
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>From</label>
          <select
            className="w-full text-xs px-3 py-2 rounded-lg border outline-none transition-all focus:border-purple-500"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
          >
            <option value="">Select table...</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-center">
          <button
            className="p-1 rounded-md hover:bg-white/10 transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onClick={() => { const tmp = sourceId; setSourceId(targetId); setTargetId(tmp); }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>To</label>
          <select
            className="w-full text-xs px-3 py-2 rounded-lg border outline-none transition-all focus:border-purple-500"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          >
            <option value="">Select table...</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="px-4 pb-4">
          {result === 'no-path' ? (
            <div className="text-center py-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)' }}>
              <p className="text-xs text-red-400">No FK path found between these tables.</p>
            </div>
          ) : (
            <>
              <div className="rounded-lg p-3 space-y-1" style={{ background: 'var(--bg-tertiary)' }}>
                <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                  Path ({result.tableIds.length - 1} hop{result.tableIds.length - 1 > 1 ? 's' : ''})
                </div>
                <div className="flex items-center flex-wrap gap-1">
                  {pathTables.map((t, i) => (
                    <span key={t!.id} className="flex items-center gap-1">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded"
                        style={{
                          color: i === 0 || i === pathTables.length - 1 ? '#8b5cf6' : 'var(--text-secondary)',
                          background: i === 0 || i === pathTables.length - 1 ? 'rgba(139,92,246,0.12)' : 'var(--bg-secondary)',
                        }}
                      >
                        {t!.name}
                      </span>
                      {i < pathTables.length - 1 && (
                        <span style={{ color: 'var(--text-muted)' }}>→</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
              <button
                className="mt-2 w-full text-xs font-medium py-2 rounded-lg bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 transition-colors"
                onClick={handleHighlight}
              >
                Highlight Path on Canvas
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
