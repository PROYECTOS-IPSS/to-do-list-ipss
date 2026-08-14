import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { authApi, type User } from '../services/auth';

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const storedToken = await authApi.getToken();
      if (storedToken) {
        try { setUser(await authApi.me(storedToken)); setToken(storedToken); }
        catch { await authApi.clearToken(); }
      }
      setLoading(false);
    })();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    loading,
    login: async (email, password) => { const result = await authApi.login(email, password); await authApi.saveToken(result.token); setToken(result.token); setUser(result.user); },
    register: async (name, email, password) => { const result = await authApi.register(name, email, password); await authApi.saveToken(result.token); setToken(result.token); setUser(result.user); },
    logout: async () => { await authApi.clearToken(); setToken(null); setUser(null); }
  }), [loading, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
};
