import { useMemo, useState } from 'react';
import { useSchemaStore } from '../store/schema-store';
import { lintSchema, type LintResult, type LintSeverity } from '../lib/schema-linter';

const SEVERITY_CONFIG: Record<LintSeverity, { color: string; bg: string; icon: string }> = {
  error: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: '✕' },
  warning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: '⚠' },
  info: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: 'ℹ' },
};

interface LintPanelProps {
  onClose: () => void;
  onSelectTable: (tableId: string) => void;
}

export function LintPanel({ onClose, onSelectTable }: LintPanelProps) {
  const tables = useSchemaStore((s) => s.tables);
  const relationships = useSchemaStore((s) => s.relationships);
  const enums = useSchemaStore((s) => s.enums);
  const groups = useSchemaStore((s) => s.groups);

  const [filter, setFilter] = useState<LintSeverity | 'all'>('all');

  const results = useMemo(
    () => lintSchema({ tables, relationships, enums, groups }),
    [tables, relationships, enums, groups]
  );

  const filtered = filter === 'all' ? results : results.filter((r) => r.severity === filter);

  const counts = useMemo(() => {
    const c = { error: 0, warning: 0, info: 0 };
    for (const r of results) c[r.severity]++;
    return c;
  }, [results]);

  return (
    <div
      className="fixed right-4 top-16 bottom-4 w-80 z-50 rounded-2xl border shadow-2xl flex flex-col overflow-hidden"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
            <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Schema Lint</span>
          {results.length === 0 && (
            <span className="text-[10px] font-medium text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">All clear</span>
          )}
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

      {/* Summary badges */}
      <div className="px-4 py-2 flex gap-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <button
          className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all ${filter === 'all' ? 'ring-1 ring-white/20' : 'opacity-60 hover:opacity-100'}`}
          style={{ color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }}
          onClick={() => setFilter('all')}
        >
          All {results.length}
        </button>
        {(['error', 'warning', 'info'] as LintSeverity[]).map((sev) => (
          <button
            key={sev}
            className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all ${filter === sev ? 'ring-1 ring-white/20' : 'opacity-60 hover:opacity-100'}`}
            style={{ color: SEVERITY_CONFIG[sev].color, background: SEVERITY_CONFIG[sev].bg }}
            onClick={() => setFilter(filter === sev ? 'all' : sev)}
          >
            {SEVERITY_CONFIG[sev].icon} {counts[sev]}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4">
            <span className="text-2xl mb-2">&#10003;</span>
            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              {results.length === 0 ? 'No issues found. Your schema looks great!' : 'No issues match this filter.'}
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filtered.map((result) => (
              <LintItem key={result.id} result={result} onSelectTable={onSelectTable} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LintItem({ result, onSelectTable }: { result: LintResult; onSelectTable: (id: string) => void }) {
  const config = SEVERITY_CONFIG[result.severity];

  return (
    <button
      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group"
      onClick={() => result.tableId && onSelectTable(result.tableId)}
    >
      <div className="flex items-start gap-2">
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0"
          style={{ color: config.color, background: config.bg }}
        >
          {config.icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {result.message}
          </p>
          <span className="text-[9px] font-mono mt-0.5 block" style={{ color: 'var(--text-muted)' }}>
            {result.rule}
          </span>
        </div>
      </div>
    </button>
  );
}
