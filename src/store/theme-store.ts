import { create } from 'zustand';

export type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const STORAGE_KEY = 'erd-tool-theme';

function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // ignore
  }
  return 'dark';
}

export const useThemeStore = create<ThemeState>()((set) => ({
  theme: loadTheme(),

  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
      return { theme: next };
    }),

  setTheme: (theme: Theme) =>
    set(() => {
      localStorage.setItem(STORAGE_KEY, theme);
      applyTheme(theme);
      return { theme };
    }),
}));

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

// Apply on load
applyTheme(loadTheme());
