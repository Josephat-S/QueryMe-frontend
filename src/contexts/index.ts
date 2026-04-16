import { use } from 'react';
import { AuthProvider } from './AuthContext';
import { AuthContext } from './AuthContextContext';
import type { AuthContextType } from './AuthContext';
import type { AuthSessionUser, UserRole } from '../types/queryme';
import { ThemeProvider } from './ThemeContext';
import { useTheme } from './useTheme';

export const useAuth = () => {
  const context = use(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthProvider, ThemeProvider, useTheme };
export type { AuthContextType, AuthSessionUser, UserRole };
