import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ThemeCtx } from './ThemeContextValue';

export type ThemeMode = 'light' | 'dark';

export interface ThemeContextValue {
  theme: ThemeMode;
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const THEME_STORAGE_KEY = 'theme';

const getPreferredTheme = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === 'dark' || storedTheme === 'light') {
    return storedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>(getPreferredTheme);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const isDark = themeMode === 'dark';

    root.classList.toggle('dark', isDark);
    body.classList.toggle('dark-mode', isDark);
    body.dataset.theme = themeMode;
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    setThemeMode(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeMode((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    theme: themeMode,
    isDarkMode: themeMode === 'dark',
    toggleTheme,
    setTheme,
  }), [setTheme, themeMode, toggleTheme]);

  return <ThemeCtx value={value}>{children}</ThemeCtx>;
};
