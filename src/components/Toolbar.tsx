import { useState, useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useSchemaStore } from '../store/schema-store';
import { useThemeStore } from '../store/theme-store';
import type { Table, TableGroup } from '../types/schema';
import { autoLayout } from '../lib/auto-layout';

const TABLE_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#f97316',
];

const GROUP_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#06b6d4'];

interface ToolbarProps {
  onImportDDL: () => void;
  onExportDDL: () => void;
  onGoHome?: () => void;
  workspaceName?: string;
  onSearch?: () => void;
  onShare?: () => void;
  onAI?: () => void;
  onLayouts?: () => void;
  onLint?: () => void;
  onFindPath?: () => void;
}

export function Toolbar({ onImportDDL, onExportDDL, onGoHome, workspaceName, onSearch, onShare, onAI, onLayouts, onLint, onFindPath }: ToolbarProps) {
  const addTable = useSchemaStore((s) => s.addTable);
  const addGroup = useSchemaStore((s) => s.addGroup);
  const tables = useSchemaStore((s) => s.tables);
  const groups = useSchemaStore((s) => s.groups) || [];
  const store = useSchemaStore;
  const { fitView, screenToFlowPosition } = useReactFlow();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const handleAddTable = () => {
    const id = `table-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const color = TABLE_COLORS[tables.length % TABLE_COLORS.length];
    const center = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    const table: Table = {
      id,
      name: `new_table_${tables.length + 1}`,
      columns: [
        {
          id: `col-${Date.now()}-pk`,
          name: 'id',
          type: 'SERIAL',
          isPrimaryKey: true,
          isNullable: false,
          defaultValue: null,
        },
      ],
      position: { x: center.x - 150, y: center.y - 50 },
      color,
    };
    addTable(table);
  };

  const handleAddGroup = () => {
    const id = `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const color = GROUP_COLORS[groups.length % GROUP_COLORS.length];
    const center = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    const group: TableGroup = {
      id,
      name: `Group ${groups.length + 1}`,
      color,
      position: { x: center.x - 200, y: center.y - 150 },
      size: { width: 400, height: 300 },
    };
    addGroup(group);
  };

  const handleUndo = () => {
    (store as any).temporal?.getState()?.undo?.();
  };

  const handleRedo = () => {
    (store as any).temporal?.getState()?.redo?.();
  };

  const handleAutoLayout = () => {
    const state = store.getState();
    const schema = { tables: state.tables, relationships: state.relationships };
    const laid = autoLayout(schema);
    for (const table of laid.tables) {
      state.updateTablePosition(table.id, table.position);
    }
  };

  return (
    <div className="h-12 border-b flex items-center px-4 gap-1" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
      {/* Logo / Title */}
      <div className="flex items-center gap-2 mr-4">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
          <rect x="2" y="3" width="20" height="18" rx="3" />
          <line x1="2" y1="9" x2="22" y2="9" />
          <line x1="10" y1="3" x2="10" y2="21" />
        </svg>
        <span className="text-sm font-semibold tracking-wide" style={{ color: 'var(--text-primary)' }}>ERD Designer</span>
        {workspaceName ? (
          <span className="hidden md:inline text-xs text-gray-500 uppercase tracking-[0.2em]">
            / {workspaceName}
          </span>
        ) : null}
      </div>

      {onGoHome ? (
        <>
          <ToolbarButton
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5 9.5V21h14V9.5" />
              </svg>
            }
            label="Home"
            onClick={onGoHome}
          />
          <div className="w-px h-6 mx-2" style={{ background: 'var(--border)' }} />
        </>
      ) : null}

      {/* Action Buttons */}
      <ToolbarButton
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        }
        label="Add Table"
        onClick={handleAddTable}
      />

      <ToolbarButton
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="3" strokeDasharray="4 2" />
          </svg>
        }
        label="Add Group"
        onClick={handleAddGroup}
      />

      <div className="w-px h-6 mx-1" style={{ background: 'var(--border-light)' }} />

      <ToolbarButton
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        }
        label="Import DDL"
        onClick={onImportDDL}
      />

      <ToolbarButton
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        }
        label="Export DDL"
        onClick={onExportDDL}
      />

      <div className="w-px h-6 mx-1" style={{ background: 'var(--border-light)' }} />

      <ToolbarButton
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
        }
        label="Auto Layout"
        onClick={handleAutoLayout}
      />

      <ToolbarButton
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        }
        label="Fit View"
        onClick={() => fitView({ padding: 0.2, duration: 400 })}
      />

      <div className="w-px h-6 mx-1" style={{ background: 'var(--border-light)' }} />

      <ToolbarButton
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        }
        label="Undo"
        onClick={handleUndo}
        shortcut="⌘Z"
      />

      <ToolbarButton
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        }
        label="Redo"
        onClick={handleRedo}
        shortcut="⌘⇧Z"
      />

      {onSearch && (
        <>
          <div className="w-px h-6 mx-1" style={{ background: 'var(--border-light)' }} />
          <ToolbarButton
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            }
            label="Search"
            onClick={onSearch}
            shortcut="⌘F"
          />
        </>
      )}

      {(onShare || onAI || onLayouts) && (
        <>
          <div className="w-px h-6 mx-1" style={{ background: 'var(--border-light)' }} />
          {onLayouts && (
            <ToolbarButton
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2z" />
                  <path d="M3 9h18" />
                  <path d="M9 3v18" />
                </svg>
              }
              label="Layouts"
              onClick={onLayouts}
            />
          )}
          {onShare && (
            <ToolbarButton
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              }
              label="Share"
              onClick={onShare}
            />
          )}
          {onFindPath && (
            <ToolbarButton
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="5" cy="12" r="3" />
                  <circle cx="19" cy="12" r="3" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              }
              label="Find Path"
              onClick={onFindPath}
            />
          )}
          {onLint && (
            <ToolbarButton
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                </svg>
              }
              label="Schema Lint"
              onClick={onLint}
            />
          )}
          {onAI && (
            <ToolbarButton
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93L12 22" />
                  <path d="M12 2a4 4 0 0 0-4 4c0 1.95 1.4 3.58 3.25 3.93" />
                  <circle cx="12" cy="14" r="1" fill="currentColor" />
                </svg>
              }
              label="AI Assistant"
              onClick={onAI}
            />
          )}
        </>
      )}

      <div className="w-px h-6 mx-1" style={{ background: 'var(--border-light)' }} />

      <ToolbarButton
        icon={
          theme === 'dark' ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )
        }
        label={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        onClick={toggleTheme}
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Auto-save indicator */}
      <SaveIndicator />

      <div className="w-px h-4 mx-2" style={{ background: 'var(--border-light)' }} />

      {/* Table count */}
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        {tables.length} table{tables.length !== 1 ? 's' : ''}
      </span>
    </div>
  );
}

function SaveIndicator() {
  const tables = useSchemaStore((s) => s.tables);
  const relationships = useSchemaStore((s) => s.relationships);
  const [status, setStatus] = useState<'saved' | 'saving'>('saved');
  const prevRef = useRef({ t: tables.length, r: relationships.length });

  useEffect(() => {
    const prev = prevRef.current;
    if (prev.t !== tables.length || prev.r !== relationships.length) {
      setStatus('saving');
      const timer = setTimeout(() => setStatus('saved'), 600);
      prevRef.current = { t: tables.length, r: relationships.length };
      return () => clearTimeout(timer);
    }
  }, [tables.length, relationships.length]);

  return (
    <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
      {status === 'saving' ? (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Saving...
        </>
      ) : (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          Saved
        </>
      )}
    </span>
  );
}

function ToolbarButton({
  icon,
  label,
  onClick,
  shortcut,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  shortcut?: string;
}) {
  return (
    <button
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all text-xs group relative"
      style={{ color: 'var(--text-secondary)' }}
      onClick={onClick}
      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none flex items-center gap-1.5" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
        {label}
        {shortcut && <kbd className="text-[9px] px-1 py-0.5 rounded" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{shortcut}</kbd>}
      </span>
    </button>
  );
}
