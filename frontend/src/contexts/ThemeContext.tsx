// src/contexts/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { logger } from '@/utils/logger';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
  isDark: false,
});

/** Resolve 'system' to the actual effective value */
function resolveEffective(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

/** Apply/remove .dark class on <html> — this is what Tailwind + CSS vars read */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const effective = resolveEffective(theme);
  if (effective === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('cem-theme') as Theme | null;
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        // Apply immediately to prevent FOUC (flash of un-themed content)
        applyTheme(saved);
        return saved;
      }
    } catch (e) {
      logger.warn('ThemeProvider', 'Could not read cem-theme from localStorage', e);
    }
    return 'light';
  });

  // Apply theme class + persist whenever theme state changes
  useEffect(() => {
    applyTheme(theme);
    const effective = resolveEffective(theme);
    try {
      localStorage.setItem('cem-theme', theme);
    } catch (e) {
      logger.warn('ThemeProvider', 'Could not persist theme', e);
    }
    logger.info('ThemeProvider', `Theme set to "${theme}" (effective: ${effective})`);
  }, [theme]);

  // Listen for OS-level changes when mode is 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => { setThemeState(t); }, []);
  const toggleTheme = useCallback(() => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  const isDark = resolveEffective(theme) === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

/** ThemeToggle — only used inside Settings */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 ${
        isDark
          ? 'bg-gray-700 text-yellow-300 hover:bg-gray-600'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      } ${className}`}
    >
      <span className="text-lg leading-none">{isDark ? '🌙' : '☀️'}</span>
      <span className="text-sm font-medium hidden sm:inline">{isDark ? 'Dark' : 'Light'}</span>
    </button>
  );
}
