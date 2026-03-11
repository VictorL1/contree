import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '../services/api.ts';
import { disconnectSocket } from '../services/socket.ts';

interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Vérifier le token au démarrage
  useEffect(() => {
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }

    api.getMe()
      .then(setUser)
      .catch(() => {
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (login: string, password: string) => {
    const data = await api.login(login, password);
    sessionStorage.setItem('accessToken', data.accessToken);
    sessionStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
  }, []);

  const register = useCallback(async (email: string, username: string, password: string) => {
    const data = await api.register(email, username, password);
    sessionStorage.setItem('accessToken', data.accessToken);
    sessionStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    disconnectSocket();
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
