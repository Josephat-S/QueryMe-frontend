import React, { useCallback, useEffect, useMemo, useState, ReactNode } from 'react';
import { AuthContext } from './AuthContextContext';
import { authApi, userApi } from '../api';
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
  updateCurrentUser: (nextUser: AuthSessionUser) => void;
  resetPassword: (newPassword: string) => Promise<void>;
  signUp: (fullName: string, email: string, registrationNumber: string, password: string) => Promise<void>;
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
    if (result.mustResetPassword) {
      normalizedUser.mustResetPassword = true;
    }
    saveAuthState(result.token, normalizedUser, remember);
    setUser(normalizedUser);
  }, []);

  const logout = useCallback(() => {
    clearAuthState();
    setUser(null);
  }, []);

  const updateCurrentUser = useCallback((nextUser: AuthSessionUser) => {
    updateStoredUser(nextUser);
    setUser(nextUser);
  }, []);

  const resetPassword = useCallback(async (newPassword: string) => {
    if (!user) throw new Error('No user logged in.');
    
    const payload = { password: newPassword };
    if (user.role === 'STUDENT') {
      await userApi.updateStudent(user.id, payload);
    } else if (user.role === 'TEACHER') {
      await userApi.updateTeacher(user.id, payload);
    } else if (user.role === 'ADMIN') {
      await userApi.updateAdmin(user.id, payload);
    } else {
      throw new Error('Unsupported role for password reset.');
    }
    
    const nextUser = { ...user, mustResetPassword: false };
    updateCurrentUser(nextUser);
  }, [updateCurrentUser, user]);

  const signUp = useCallback(async (fullName: string, email: string, registrationNumber: string, password: string) => {
    await authApi.signUp({ fullName, email, registrationNumber, password });
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    isAuthenticated: Boolean(user && getStoredToken()),
    user,
    login,
    logout,
    updateCurrentUser,
    resetPassword,
    signUp,
  }), [login, logout, updateCurrentUser, resetPassword, user, signUp]);

  return (
    <AuthContext value={value}>
      {children}
    </AuthContext>
  );
};
