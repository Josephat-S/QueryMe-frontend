import { use } from 'react';
import { ThemeCtx } from './ThemeContextValue';

export const useTheme = () => {
  const context = use(ThemeCtx);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};