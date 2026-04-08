import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSchemaStore } from '../store/schema-store';
import { useThemeStore } from '../store/theme-store';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTable: (tableId: string) => void;
  onAddTable: () => void;
  onAddGroup: () => void;
  onAutoLayout: () => void;
  onExportDDL: () => void;
  onImportDDL: () => void;
  onFitView: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  category: 'Tables' | 'Actions' | 'Settings';
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

// Simple fuzzy match: all query chars must appear in order in the label.
// Returns indices of matching characters, or null if no match.
function fuzzyMatch(query: string, text: string): number[] | null {
  const lower = text.toLowerCase();
  const chars = query.toLowerCase().split('');
  const indices: number[] = [];
  let fromIndex = 0;
  for (const ch of chars) {
    const idx = lower.indexOf(ch, fromIndex);
    if (idx === -1) return null;
    indices.push(idx);
    fromIndex = idx + 1;
  }
  return indices;
}

function HighlightedLabel({ text, indices }: { text: string; indices: number[] }) {
  const set = new Set(indices);
  return (
    <span>
      {text.split('').map((ch, i) =>
        set.has(i) ? (
          <span key={i} className="text-blue-400 font-semibold">{ch}</span>
        ) : (
          <span key={i}>{ch}</span>
        )
      )}
    </span>
  );
}

// Icons as small SVG components
const TableIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="9" y1="3" x2="9" y2="21" />
  </svg>
);

const PlusIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const LayoutIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
  </svg>
);

const ExportIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const ImportIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const FitIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
    <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
    <path d="M3 16v3a2 2 0 0 0 2 2h3" />
    <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
  </svg>
);

const ThemeIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const GroupIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="1" width="22" height="22" rx="3" strokeDasharray="4 2" />
  </svg>
);

const SettingsIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export function CommandPalette({
  isOpen,
  onClose,
  onSelectTable,
  onAddTable,
  onAddGroup,
  onAutoLayout,
  onExportDDL,
  onImportDDL,
  onFitView,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const tables = useSchemaStore((s) => s.tables);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  // Build the full command list
  const allItems = useMemo<CommandItem[]>(() => {
    const tableItems: CommandItem[] = tables.map((t) => ({
      id: `table-${t.id}`,
      label: t.name,
      category: 'Tables' as const,
      icon: TableIcon,
      action: () => {
        onSelectTable(t.id);
        onClose();
      },
    }));

    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const mod = isMac ? '\u2318' : 'Ctrl';

    const actionItems: CommandItem[] = [
      { id: 'add-table', label: 'Add Table', category: 'Actions', icon: PlusIcon, action: () => { onAddTable(); onClose(); } },
      { id: 'add-group', label: 'Add Group', category: 'Actions', icon: GroupIcon, action: () => { onAddGroup(); onClose(); } },
      { id: 'auto-layout', label: 'Auto Layout', category: 'Actions', icon: LayoutIcon, action: () => { onAutoLayout(); onClose(); } },
      { id: 'export-ddl', label: 'Export DDL', category: 'Actions', icon: ExportIcon, action: () => { onExportDDL(); onClose(); } },
      { id: 'import-ddl', label: 'Import DDL', category: 'Actions', icon: ImportIcon, action: () => { onImportDDL(); onClose(); } },
      { id: 'fit-view', label: 'Fit View', category: 'Actions', icon: FitIcon, action: () => { onFitView(); onClose(); } },
      { id: 'toggle-theme', label: 'Toggle Theme', category: 'Actions', icon: ThemeIcon, shortcut: `${mod}+Shift+T`, action: () => { toggleTheme(); onClose(); } },
      { id: 'zoom-to-fit', label: 'Zoom to Fit', category: 'Actions', icon: FitIcon, action: () => { onFitView(); onClose(); } },
    ];

    const settingsItems: CommandItem[] = [
      {
        id: 'theme-setting',
        label: theme === 'dark' ? 'Light Theme' : 'Dark Theme',
        category: 'Settings',
        icon: SettingsIcon,
        action: () => { toggleTheme(); onClose(); },
      },
    ];

    return [...tableItems, ...actionItems, ...settingsItems];
  }, [tables, theme, toggleTheme, onSelectTable, onAddTable, onAddGroup, onAutoLayout, onExportDDL, onImportDDL, onFitView, onClose]);

  // Filter items by fuzzy match
  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      return allItems.map((item) => ({ item, indices: [] as number[] }));
    }
    const results: { item: CommandItem; indices: number[] }[] = [];
    for (const item of allItems) {
      const indices = fuzzyMatch(query, item.label);
      if (indices) {
        results.push({ item, indices });
      }
    }
    return results;
  }, [query, allItems]);

  // Group filtered items by category
  const groupedItems = useMemo(() => {
    const groups: { category: string; items: { item: CommandItem; indices: number[]; flatIndex: number }[] }[] = [];
    const categoryOrder: string[] = ['Tables', 'Actions', 'Settings'];
    let flatIndex = 0;

    for (const cat of categoryOrder) {
      const catItems = filteredItems
        .filter((r) => r.item.category === cat)
        .map((r) => ({ ...r, flatIndex: flatIndex++ }));
      if (catItems.length > 0) {
        groups.push({ category: cat, items: catItems });
      }
    }
    return groups;
  }, [filteredItems]);

  const totalItems = filteredItems.length;

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Small delay to ensure the DOM is ready
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector(`[data-index="${selectedIndex}"]`);
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const executeItem = useCallback((item: CommandItem) => {
    item.action();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1 < totalItems ? i + 1 : i));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i > 0 ? i - 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredItems[selectedIndex];
        if (selected) {
          executeItem(selected.item);
        }
      }
    },
    [onClose, totalItems, filteredItems, selectedIndex, executeItem]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]"
      style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-[560px] rounded-xl border shadow-2xl overflow-hidden"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border)',
          animation: 'commandPaletteIn 150ms ease-out',
        }}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
            placeholder="Type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd
            className="text-[10px] rounded px-1.5 py-0.5 border"
            style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', background: 'var(--bg-tertiary)' }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto custom-scrollbar py-1">
          {groupedItems.length === 0 && query.trim() && (
            <div className="px-4 py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              No results found
            </div>
          )}
          {groupedItems.map((group) => (
            <div key={group.category}>
              {/* Section header */}
              <div
                className="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                {group.category}
              </div>
              {group.items.map(({ item, indices, flatIndex }) => (
                <button
                  key={item.id}
                  data-index={flatIndex}
                  className={`w-full text-left px-4 py-2 flex items-center gap-3 text-sm transition-colors ${
                    flatIndex === selectedIndex ? 'bg-blue-500/15' : 'hover:bg-white/5'
                  }`}
                  style={{ color: flatIndex === selectedIndex ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                  onClick={() => executeItem(item)}
                  onMouseEnter={() => setSelectedIndex(flatIndex)}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span className="flex-1 truncate">
                    {indices.length > 0 ? (
                      <HighlightedLabel text={item.label} indices={indices} />
                    ) : (
                      item.label
                    )}
                  </span>
                  {item.shortcut && (
                    <kbd
                      className="text-[10px] rounded px-1.5 py-0.5 border flex-shrink-0"
                      style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', background: 'var(--bg-tertiary)' }}
                    >
                      {item.shortcut}
                    </kbd>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Keyframe animation */}
      <style>{`
        @keyframes commandPaletteIn {
          from {
            opacity: 0;
            transform: scale(0.98);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
