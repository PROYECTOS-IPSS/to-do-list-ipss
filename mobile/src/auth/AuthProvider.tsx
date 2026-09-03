import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AuthHttpError, authApi, type User } from '../services/auth';

export type AccessMode = 'none' | 'remote' | 'local';

export type AuthContextValue = {
  user: User | null;
  token: string | null;
  accessMode: AccessMode;
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
  const [accessMode, setAccessMode] = useState<AccessMode>('none');
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
    setAccessMode('none');
    try {
      let storedToken: string | null;
      try {
        storedToken = await authApi.getToken();
      } catch {
        if (isCurrent(id)) setRestoreError('No se pudo leer la sesión guardada. Reintenta.');
        return;
      }

      if (storedToken) {
        try {
          const currentUser = await authApi.me(storedToken);
          if (!isCurrent(id)) return;
          setUser(currentUser);
          setToken(storedToken);
          setAccessMode('remote');
          try { await authApi.saveLocalIdentity(currentUser); } catch { /* Remote session remains usable. */ }
          return;
        } catch (error) {
          if (!isCurrent(id)) return;
          if (error instanceof AuthHttpError && error.statusCode === 401) {
            try { await authApi.clearToken(); }
            catch { if (isCurrent(id)) setRestoreError('No se pudo invalidar la sesión. Reintenta.'); return; }
            return;
          }
        }
      }

      try {
        const localUser = await authApi.getLocalIdentity();
        if (isCurrent(id) && localUser) {
          setUser(localUser);
          setAccessMode('local');
        } else if (isCurrent(id) && storedToken) {
          setRestoreError('No se pudo validar la sesión por un problema temporal. Reintenta.');
        }
      } catch {
        if (isCurrent(id)) setRestoreError('No se pudo leer el acceso local. Reintenta.');
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
    setAccessMode('none');
    const result = await authApi.login(email, password);
    await authApi.saveToken(result.token);
    try { await authApi.saveLocalIdentity(result.user); } catch { /* Online auth does not depend on local cache. */ }
    if (isCurrent(id)) { setToken(result.token); setUser(result.user); setAccessMode('remote'); }
  }, [isCurrent]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const id = ++operation.current;
    setLoading(false);
    setRestoreError(null);
    setAccessMode('none');
    const result = await authApi.register(name, email, password);
    await authApi.saveToken(result.token);
    try { await authApi.saveLocalIdentity(result.user); } catch { /* Online auth does not depend on local cache. */ }
    if (isCurrent(id)) { setToken(result.token); setUser(result.user); setAccessMode('remote'); }
  }, [isCurrent]);

  const logout = useCallback(async () => {
    const id = ++operation.current;
    setLoading(false);
    setRestoreError(null);
    const results = await Promise.allSettled([authApi.clearToken(), authApi.clearLocalIdentity()]);
    if (results.some((result) => result.status === 'rejected')) throw new Error('SecureStore logout failed.');
    if (isCurrent(id)) { setToken(null); setUser(null); setAccessMode('none'); }
  }, [isCurrent]);

  const value = useMemo<AuthContextValue>(() => ({
    user, token, accessMode, loading, restoreError, retryRestore: restoreSession, login, register, logout
  }), [accessMode, loading, login, logout, register, restoreError, restoreSession, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
};
