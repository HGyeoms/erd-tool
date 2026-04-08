import { useState, useRef, useEffect } from 'react';
import { useUserStore } from '../store/user-store';
import { useThemeStore } from '../store/theme-store';

export function LoginScreen() {
  const [value, setValue] = useState('');
  const setNickname = useUserStore((s) => s.setNickname);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed.length < 1) return;
    setNickname(trimmed);
  };

  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Theme toggle */}
      <button
        className="fixed right-5 top-5 rounded-xl p-2.5 transition-all hover:bg-black/10 active:scale-90"
        style={{ color: 'var(--text-secondary)' }}
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {theme === 'dark' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>

      <div className="flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/90 shadow-[0_0_40px_rgba(37,99,235,0.2)]">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="2" y="3" width="20" height="18" rx="3" />
              <line x1="2" y1="9" x2="22" y2="9" />
              <line x1="10" y1="3" x2="10" y2="21" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              ERD Designer
            </h1>
            <p className="mt-1.5 text-sm text-gray-500">
              Enter your nickname to get started
            </p>
          </div>
        </div>

        {/* Input Card */}
        <div
          className="w-[340px] rounded-2xl border p-6 shadow-xl"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
        >
          <label className="mb-2.5 block text-[11px] font-bold uppercase tracking-widest text-blue-400">
            Nickname
          </label>
          <input
            ref={inputRef}
            className="w-full rounded-lg border px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
            style={{
              background: 'var(--input-bg)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border)',
            }}
            placeholder="e.g. gyeom"
            maxLength={20}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <button
            className="mt-4 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-blue-500 disabled:opacity-20 active:scale-95"
            onClick={handleSubmit}
            disabled={!value.trim()}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
