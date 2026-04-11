import React, { useState, ReactNode } from 'react';
import { AuthContext } from './AuthContextContext';
import { authApi } from '../services/api';

export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'GUEST';

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  signup: (name: string, email: string, password: string, role?: UserRole) => Promise<void>;
}

export interface User {
  id: string | number;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('queryme_user');
    const token = localStorage.getItem('token');
    if (!stored || !token) {
      localStorage.removeItem('queryme_user');
      localStorage.removeItem('token');
      return null;
    }

    try {
      return JSON.parse(stored) as User;
    } catch {
      localStorage.removeItem('queryme_user');
      localStorage.removeItem('token');
      return null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return user !== null && !!localStorage.getItem('token');
  });

  const login = async (email: string, password: string) => {
    try {
      const result = await authApi.signin(email, password);
      const token = result.token;

      if (!token) {
        throw new Error('Invalid authentication response');
      }

      const backendUser = result.user;
      if (!backendUser) {
        throw new Error('Authentication response is missing user information');
      }

      // Extract role from either role or roles field
      let userRole: UserRole = 'GUEST';
      if (backendUser.role) {
        userRole = backendUser.role as UserRole;
      } else if (backendUser.roles && backendUser.roles.length > 0) {
        // Map backend roles format (e.g., "ROLE_STUDENT" -> "STUDENT")
        const roleStr = backendUser.roles[0].replace('ROLE_', '').toUpperCase();
        userRole = roleStr as UserRole;
      }

      const user: User = {
        id: backendUser.id,
        email: backendUser.email,
        name: backendUser.name || backendUser.fullName || email.split('@')[0],
        role: userRole,
      };

      localStorage.setItem('queryme_user', JSON.stringify(user));
      localStorage.setItem('token', token);
      setUser(user);
      setIsAuthenticated(true);
    } catch (error) {
      throw error;
    }
  };

  const signup = async (name: string, email: string, password: string, role: UserRole = 'STUDENT') => {
    try {
      await authApi.signup(name, email, password, role);
      await login(email, password);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('queryme_user');
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext value={{ isAuthenticated, user, login, logout, signup }}>
      {children}
    </AuthContext>
  );
};
