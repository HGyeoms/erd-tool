import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useSchemaStore } from '../store/schema-store';

interface SearchBarProps {
  onSelectTable: (id: string | null) => void;
  onClose: () => void;
}

interface SearchResult {
  tableId: string;
  tableName: string;
  matchType: 'table' | 'column';
  columnName?: string;
}

export function SearchBar({ onSelectTable, onClose }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const tables = useSchemaStore((s) => s.tables);
  const { setCenter, getNode } = useReactFlow();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const matches: SearchResult[] = [];
    for (const table of tables) {
      if (table.name.toLowerCase().includes(q)) {
        matches.push({ tableId: table.id, tableName: table.name, matchType: 'table' });
      }
      for (const col of table.columns) {
        if (col.name.toLowerCase().includes(q)) {
          matches.push({ tableId: table.id, tableName: table.name, matchType: 'column', columnName: col.name });
        }
      }
    }
    return matches.slice(0, 20);
  }, [query, tables]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const navigateToResult = useCallback(
    (result: SearchResult) => {
      onSelectTable(result.tableId);
      const node = getNode(result.tableId);
      if (node) {
        setCenter(node.position.x + (node.measured?.width ?? 300) / 2, node.position.y + (node.measured?.height ?? 100) / 2, {
          zoom: 1.2,
          duration: 400,
        });
      }
      onClose();
    },
    [onSelectTable, onClose, setCenter, getNode]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      navigateToResult(results[selectedIndex]);
    }
  };

  return (
    <div className="absolute top-12 left-0 right-0 z-50 flex justify-center px-4 pt-2">
      <div className="w-full max-w-md rounded-xl border border-gray-700 bg-[#1a1d27] shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-gray-600"
            placeholder="Search tables and columns..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="text-[10px] text-gray-600 border border-gray-700 rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        {results.length > 0 && (
          <div className="max-h-64 overflow-y-auto custom-scrollbar py-1">
            {results.map((r, i) => (
              <button
                key={`${r.tableId}-${r.columnName ?? 'table'}-${i}`}
                className={`w-full text-left px-4 py-2 flex items-center gap-3 text-xs transition-colors ${
                  i === selectedIndex ? 'bg-blue-500/15 text-white' : 'text-gray-400 hover:bg-white/5'
                }`}
                onClick={() => navigateToResult(r)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                {r.matchType === 'table' ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
                    <line x1="4" y1="9" x2="20" y2="9" />
                    <line x1="4" y1="15" x2="20" y2="15" />
                  </svg>
                )}
                <span className="font-medium">
                  {r.matchType === 'column' ? (
                    <>
                      <span className="text-gray-500">{r.tableName}.</span>
                      {r.columnName}
                    </>
                  ) : (
                    r.tableName
                  )}
                </span>
                <span className="ml-auto text-[10px] uppercase tracking-wider text-gray-600">
                  {r.matchType}
                </span>
              </button>
            ))}
          </div>
        )}

        {query && results.length === 0 && (
          <div className="px-4 py-6 text-center text-xs text-gray-600">
            No results found
          </div>
        )}
      </div>
    </div>
  );
}
