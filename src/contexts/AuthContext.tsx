import React, { useCallback, useEffect, useMemo, useState, ReactNode } from 'react';
import { AuthContext } from './AuthContextContext';
import { authApi } from '../api';
import type { AuthSessionUser } from '../types/queryme';
import {
  clearAuthState,
  getStoredToken,
  getStoredUser,
  saveAuthState,
  updateStoredUser,
} from '../utils/authStorage';
import { toAuthSessionUser } from '../utils/queryme';

export interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthSessionUser | null;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => void;
  signup: (fullName: string, email: string, password: string) => Promise<void>;
  updateCurrentUser: (nextUser: AuthSessionUser) => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthSessionUser | null>(() => getStoredUser());

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
    };

    window.addEventListener('qm:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('qm:unauthorized', handleUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string, remember = false) => {
    const result = await authApi.signIn(email, password);
    if (!result.token) {
      throw new Error('Authentication response is missing a token.');
    }

    const normalizedUser = toAuthSessionUser(result, email);
    saveAuthState(result.token, normalizedUser, remember);
    setUser(normalizedUser);
  }, []);

  const signup = useCallback(async (fullName: string, email: string, password: string) => {
    await authApi.signUp({ fullName, email, password, role: 'STUDENT' });
    await login(email, password, false);
  }, [login]);

  const logout = useCallback(() => {
    clearAuthState();
    setUser(null);
  }, []);

  const updateCurrentUser = useCallback((nextUser: AuthSessionUser) => {
    updateStoredUser(nextUser);
    setUser(nextUser);
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    isAuthenticated: Boolean(user && getStoredToken()),
    user,
    login,
    logout,
    signup,
    updateCurrentUser,
  }), [login, logout, signup, updateCurrentUser, user]);

  return (
    <AuthContext value={value}>
      {children}
    </AuthContext>
  );
};
