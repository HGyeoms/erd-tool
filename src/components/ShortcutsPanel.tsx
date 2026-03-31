import { useEffect } from 'react';

interface ShortcutsPanelProps {
  onClose: () => void;
}

const SHORTCUTS = [
  { category: 'Mode', items: [
    { keys: ['V', 'ㅍ'], description: 'Select mode' },
    { keys: ['H', 'ㅗ'], description: 'Hand (pan) mode' },
  ]},
  { category: 'Edit', items: [
    { keys: ['⌘', 'Z'], description: 'Undo' },
    { keys: ['⌘', '⇧', 'Z'], description: 'Redo' },
    { keys: ['⌫'], description: 'Delete selected' },
  ]},
  { category: 'Navigation', items: [
    { keys: ['⌘', 'F'], description: 'Search tables/columns' },
    { keys: ['?'], description: 'Toggle shortcuts panel' },
  ]},
  { category: 'Canvas', items: [
    { keys: ['Scroll'], description: 'Zoom in/out' },
    { keys: ['Click + Drag'], description: 'Move table / Select area' },
    { keys: ['Middle Click + Drag'], description: 'Pan canvas' },
  ]},
];

export function ShortcutsPanel({ onClose }: ShortcutsPanelProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '?') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm"
      style={{ background: 'var(--bg-modal)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border shadow-2xl animate-in" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Keyboard Shortcuts</h2>
          <button
            className="rounded-lg p-1.5 text-gray-600 transition-all hover:bg-gray-800 hover:text-white"
            onClick={onClose}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {SHORTCUTS.map((group) => (
            <div key={group.category}>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2">
                {group.category}
              </h3>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div key={item.description} className="flex items-center justify-between py-1">
                    <span className="text-xs text-gray-400">{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, i) => (
                        <span key={i}>
                          {i > 0 && <span className="text-gray-600 text-[10px] mx-0.5">+</span>}
                          <kbd className="inline-block min-w-[24px] text-center text-[10px] font-medium border rounded px-1.5 py-0.5" style={{ color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}>
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
