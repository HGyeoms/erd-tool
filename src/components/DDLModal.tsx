import { useState, useCallback } from 'react';
import { useSchemaStore } from '../store/schema-store';
import { parseDDL } from '../lib/ddl-parser';
import { exportDDL } from '../lib/ddl-exporter';

interface DDLModalProps {
  mode: 'import' | 'export';
  onClose: () => void;
}

export function DDLModal({ mode, onClose }: DDLModalProps) {
  const [ddlText, setDdlText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dialect, setDialect] = useState<'postgresql' | 'mysql'>('postgresql');

  const importSchema = useSchemaStore((s) => s.importSchema);
  const tables = useSchemaStore((s) => s.tables);
  const relationships = useSchemaStore((s) => s.relationships);

  const generateDDL = useCallback(() => {
    return exportDDL({ tables, relationships }, dialect);
  }, [tables, relationships, dialect]);

  const handleImport = () => {
    setError(null);
    try {
      // Try to dynamically import the parser if available
      const parsed = parseDDL(ddlText);
      if (parsed.tables.length === 0) {
        setError('No valid CREATE TABLE statements found. Please check your DDL syntax.');
        return;
      }
      importSchema(parsed);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to parse DDL. Please check the syntax.');
    }
  };

  const handleCopy = async () => {
    const ddl = generateDDL();
    await navigator.clipboard.writeText(ddl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportedDDL = mode === 'export' ? generateDDL() : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
      style={{ background: 'var(--bg-modal)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="rounded-xl border shadow-2xl w-[600px] max-h-[80vh] flex flex-col overflow-hidden" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {mode === 'import' ? 'Import DDL' : 'Export DDL'}
          </h2>
          <button
            className="text-gray-500 hover:text-gray-300 transition-colors"
            onClick={onClose}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Dialect selector for export */}
        {mode === 'export' && (
          <div className="px-5 pt-3 flex items-center gap-2">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Dialect:</span>
            <button
              className={`text-xs px-2.5 py-1 rounded-md transition-all ${
                dialect === 'postgresql'
                  ? 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
              onClick={() => setDialect('postgresql')}
            >
              PostgreSQL
            </button>
            <button
              className={`text-xs px-2.5 py-1 rounded-md transition-all ${
                dialect === 'mysql'
                  ? 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
              onClick={() => setDialect('mysql')}
            >
              MySQL
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 px-5 py-4 overflow-auto">
          {mode === 'import' ? (
            <>
              <p className="text-xs text-gray-500 mb-3">
                Paste your CREATE TABLE statements below. Both PostgreSQL and MySQL syntax are supported.
              </p>
              <textarea
                className="w-full h-64 text-xs font-mono p-4 rounded-lg border focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none resize-none custom-scrollbar"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
                placeholder={`CREATE TABLE users (\n  id SERIAL PRIMARY KEY,\n  email VARCHAR(255) NOT NULL,\n  name VARCHAR(100),\n  created_at TIMESTAMP DEFAULT NOW()\n);`}
                value={ddlText}
                onChange={(e) => {
                  setDdlText(e.target.value);
                  setError(null);
                }}
                spellCheck={false}
              />
            </>
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-3">
                Generated DDL for {tables.length} table{tables.length !== 1 ? 's' : ''}.
              </p>
              <textarea
                className="w-full h-64 text-xs font-mono p-4 rounded-lg border outline-none resize-none custom-scrollbar"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
                value={exportedDDL}
                readOnly
                spellCheck={false}
              />
            </>
          )}

          {/* Error display */}
          {error && (
            <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-400 flex items-start gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            className="px-4 py-1.5 text-xs text-gray-400 hover:text-gray-300 hover:bg-white/5 rounded-md transition-all"
            onClick={onClose}
          >
            Cancel
          </button>
          {mode === 'import' ? (
            <button
              className="px-4 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-all font-medium"
              onClick={handleImport}
              disabled={!ddlText.trim()}
            >
              Parse & Import
            </button>
          ) : (
            <button
              className="px-4 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-all font-medium flex items-center gap-1.5"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy DDL
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

