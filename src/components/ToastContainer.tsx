import { useEffect, useRef, useState } from 'react';
import { useToastStore, type Toast } from '../store/toast-store';

const TYPE_COLORS: Record<Toast['type'], string> = {
  info: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
};

const MAX_VISIBLE = 3;

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [state, setState] = useState<'entering' | 'visible' | 'exiting'>('entering');
  const duration = toast.duration || 4000;
  const startRef = useRef(Date.now());

  useEffect(() => {
    const frame = requestAnimationFrame(() => setState('visible'));
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleRemove = () => {
    setState('exiting');
    setTimeout(() => onRemove(toast.id), 150);
  };

  const handleUndo = () => {
    toast.undoAction?.();
    handleRemove();
  };

  const baseStyle: React.CSSProperties = {
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    borderColor: 'var(--border)',
    borderLeftColor: TYPE_COLORS[toast.type],
    borderLeftWidth: '3px',
    backdropFilter: 'blur(12px)',
    transition: state === 'exiting'
      ? 'opacity 150ms ease-out'
      : 'transform 200ms ease-out, opacity 200ms ease-out',
    transform: state === 'entering' ? 'translateY(16px)' : 'translateY(0)',
    opacity: state === 'entering' || state === 'exiting' ? 0 : 1,
  };

  return (
    <div
      className="relative flex items-center gap-3 rounded-lg border shadow-lg px-4 py-3 min-w-[320px] max-w-[420px] overflow-hidden"
      style={baseStyle}
    >
      <span className="flex-1 text-sm">{toast.message}</span>

      {toast.undoAction && (
        <button
          onClick={handleUndo}
          className="text-sm font-medium shrink-0 cursor-pointer hover:underline"
          style={{ color: '#60a5fa' }}
        >
          Undo
        </button>
      )}

      <button
        onClick={handleRemove}
        className="shrink-0 cursor-pointer opacity-50 hover:opacity-100 transition-opacity text-sm"
        style={{ color: 'var(--text-primary)' }}
        aria-label="Close"
      >
        &#x2715;
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: 'var(--border)' }}>
        <div
          className="h-full"
          style={{
            background: TYPE_COLORS[toast.type],
            animation: `toast-progress ${duration}ms linear forwards`,
            animationDelay: `${Math.max(0, startRef.current + 200 - Date.now())}ms`,
          }}
        />
      </div>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  const visibleToasts = toasts.slice(-MAX_VISIBLE);

  // Auto-remove oldest if over limit
  useEffect(() => {
    if (toasts.length > MAX_VISIBLE) {
      const excess = toasts.slice(0, toasts.length - MAX_VISIBLE);
      excess.forEach((t) => removeToast(t.id));
    }
  }, [toasts, removeToast]);

  if (visibleToasts.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-auto">
        {visibleToasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </>
  );
}
