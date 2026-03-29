import React, { useState, ReactNode } from 'react';
import { AuthContext } from './AuthContextContext';

export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'GUEST';

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  signup: (name: string, email: string, password: string, role?: UserRole) => Promise<void>;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

// ── Mock credentials for development ──
const MOCK_USERS: Record<string, { password: string; user: User }> = {
  'admin@queryme.com': {
    password: 'admin123',
    user: { id: 1, email: 'admin@queryme.com', name: 'Admin User', role: 'ADMIN' },
  },
  'teacher@queryme.com': {
    password: 'teacher123',
    user: { id: 2, email: 'teacher@queryme.com', name: 'Prof. Smith', role: 'TEACHER' },
  },
  'student@queryme.com': {
    password: 'student123',
    user: { id: 3, email: 'student@queryme.com', name: 'John Student', role: 'STUDENT' },
  },
  'guest@queryme.com': {
    password: 'guest123',
    user: { id: 4, email: 'guest@queryme.com', name: 'Guest Viewer', role: 'GUEST' },
  },
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('queryme_user');
    if (stored) {
      try {
        return JSON.parse(stored) as User;
      } catch {
        localStorage.removeItem('queryme_user');
        return null;
      }
    }
    return null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return user !== null;
  });

  const login = async (email: string, password: string) => {
    // Mock login — match against MOCK_USERS
    const entry = MOCK_USERS[email.toLowerCase()];
    if (entry && entry.password === password) {
      localStorage.setItem('queryme_user', JSON.stringify(entry.user));
      localStorage.setItem('token', 'mock-jwt-' + entry.user.role.toLowerCase());
      setUser(entry.user);
      setIsAuthenticated(true);
      return;
    }
    throw new Error('Invalid email or password');
  };

  const signup = async (name: string, email: string, _password: string, role: UserRole = 'STUDENT') => {
    // Mock signup — just create a session
    const newUser: User = {
      id: Date.now(),
      email,
      name,
      role,
    };
    localStorage.setItem('queryme_user', JSON.stringify(newUser));
    localStorage.setItem('token', 'mock-jwt-' + role.toLowerCase());
    setUser(newUser);
    setIsAuthenticated(true);
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
