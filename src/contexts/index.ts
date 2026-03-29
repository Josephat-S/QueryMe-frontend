import { use } from 'react';
import { AuthProvider } from './AuthContext';
import { AuthContext } from './AuthContextContext';
import type { AuthContextType, User, UserRole } from './AuthContext';

export const useAuth = () => {
  const context = use(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthProvider };
export type { AuthContextType, User, UserRole };
