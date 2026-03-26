import { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Adjust position to keep menu on screen
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - items.length * 36 - 16);

  return (
    <div
      ref={ref}
      className="fixed z-[9999] min-w-[180px] rounded-xl border border-gray-700/50 bg-[#1a1d27] py-1.5 shadow-2xl animate-in"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {items.map((item, i) => (
        <div key={i}>
          {item.divider && <div className="my-1 border-t border-gray-800" />}
          <button
            className={`w-full text-left px-4 py-2 text-xs flex items-center gap-2.5 transition-colors ${
              item.danger
                ? 'text-red-400 hover:bg-red-500/10'
                : 'text-gray-300 hover:bg-white/5'
            }`}
            onClick={() => {
              item.onClick();
              onClose();
            }}
          >
            {item.icon && <span className="w-4 flex-shrink-0">{item.icon}</span>}
            {item.label}
          </button>
        </div>
      ))}
    </div>
  );
}
