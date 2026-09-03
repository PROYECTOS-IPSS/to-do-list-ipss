import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AuthHttpError, authApi, type User } from '../services/auth';

export type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  restoreError: string | null;
  retryRestore: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const mounted = useRef(true);
  const operation = useRef(0);

  const isCurrent = useCallback((id: number) => mounted.current && operation.current === id, []);
  const restoreSession = useCallback(async () => {
    const id = ++operation.current;
    setLoading(true);
    setRestoreError(null);
    setToken(null);
    setUser(null);
    try {
      let storedToken: string | null;
      try {
        storedToken = await authApi.getToken();
      } catch {
        if (isCurrent(id)) setRestoreError('No se pudo leer la sesión guardada. Reintenta.');
        return;
      }
      if (!storedToken) return;
      try {
        const currentUser = await authApi.me(storedToken);
        if (isCurrent(id)) { setUser(currentUser); setToken(storedToken); }
      } catch (error) {
        if (!isCurrent(id)) return;
        if (error instanceof AuthHttpError && error.statusCode === 401) {
          try { await authApi.clearToken(); }
          catch { if (isCurrent(id)) setRestoreError('No se pudo invalidar la sesión. Reintenta.'); return; }
          if (isCurrent(id)) { setUser(null); setToken(null); }
          return;
        }
        setRestoreError('No se pudo validar la sesión por un problema temporal. Reintenta.');
      }
    } finally {
      if (isCurrent(id)) setLoading(false);
    }
  }, [isCurrent]);

  useEffect(() => {
    mounted.current = true;
    void restoreSession();
    return () => { mounted.current = false; operation.current += 1; };
  }, [restoreSession]);

  const login = useCallback(async (email: string, password: string) => {
    const id = ++operation.current;
    setLoading(false);
    setRestoreError(null);
    const result = await authApi.login(email, password);
    await authApi.saveToken(result.token);
    if (isCurrent(id)) { setToken(result.token); setUser(result.user); }
  }, [isCurrent]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const id = ++operation.current;
    setLoading(false);
    setRestoreError(null);
    const result = await authApi.register(name, email, password);
    await authApi.saveToken(result.token);
    if (isCurrent(id)) { setToken(result.token); setUser(result.user); }
  }, [isCurrent]);

  const logout = useCallback(async () => {
    const id = ++operation.current;
    setLoading(false);
    setRestoreError(null);
    await authApi.clearToken();
    if (isCurrent(id)) { setToken(null); setUser(null); }
  }, [isCurrent]);

  const value = useMemo<AuthContextValue>(() => ({
    user, token, loading, restoreError, retryRestore: restoreSession, login, register, logout
  }), [loading, login, logout, register, restoreError, restoreSession, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
};
