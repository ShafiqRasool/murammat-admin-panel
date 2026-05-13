import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../api/axios';

// ─── Types ────────────────────────────────────────────────────────────
interface AdminUser {
  id: string;
  email: string;
  roles: string[];
}

interface AuthContextType {
  user: AdminUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string, adminSecret: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser]       = useState<AdminUser | null>(null);
  const [token, setToken]     = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('admin_token');
    const storedUser  = localStorage.getItem('admin_user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.clear();
      }
    }
    setIsLoading(false);
  }, []);

  // Login: calls POST /api/auth/login, expects { token, user }
  const login = async (email: string, password: string, adminSecret: string) => {
    // Store the secret BEFORE the API call so the axios interceptor
    // can attach x-admin-secret-key on the very first request
    localStorage.setItem('admin_secret', adminSecret);

    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: jwtToken, user: userData } = response.data;

      // Verify user has admin role
      if (!userData?.roles?.includes('admin')) {
        // Clean up the secret we pre-stored if role check fails
        localStorage.removeItem('admin_secret');
        throw new Error('Access denied. Admin role required.');
      }

      // Persist full session
      localStorage.setItem('admin_token', jwtToken);
      localStorage.setItem('admin_user', JSON.stringify(userData));

      setToken(jwtToken);
      setUser(userData);
    } catch (err) {
      // Clean up on any error so no stale secret lingers
      localStorage.removeItem('admin_secret');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_secret');
    localStorage.removeItem('admin_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      login,
      logout,
      isAuthenticated: !!token && !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────
export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
