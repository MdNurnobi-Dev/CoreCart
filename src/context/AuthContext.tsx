import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface User {
  id: number;
  name: string;
  email: string;
  role?: string;
  phone?: string;
  avatar_url?: string;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (updatedFields: Partial<User>) => void;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Synchronous initialization from localStorage prevents logout on page reload
  const [token, setToken] = useState<string | null>(() => {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState<boolean>(true);

  // Function to fetch latest profile from database
  const refreshUser = useCallback(async (): Promise<User | null> => {
    const currentToken = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
    if (!currentToken) {
      setLoading(false);
      return null;
    }

    try {
      const res = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });

      if (res.ok) {
        const userData: User = await res.json();
        if (userData && userData.id) {
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          return userData;
        }
      } else if (res.status === 401) {
        console.warn('Session expired on server verification');
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return null;
      }
    } catch (err) {
      console.warn('Network issue fetching user profile on startup:', err);
    } finally {
      setLoading(false);
    }
    return null;
  }, [token]);

  // Verify and sync user profile with database on mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback((newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    try {
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
    } catch (err) {
      console.error('Failed to save user session:', err);
    }
  }, []);

  const updateUser = useCallback((updatedFields: Partial<User>) => {
    setUser(prev => {
      const updated = prev ? { ...prev, ...updatedFields } : (updatedFields as User);
      try {
        localStorage.setItem('user', JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to update local storage user:', err);
      }
      return updated;
    });
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (err) {
      console.error('Failed to clear session:', err);
    }
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
      console.warn('Authentication expired, logging out...');
      logout();
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
