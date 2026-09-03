import * as SecureStore from 'expo-secure-store';
import { z } from 'zod';

const tokenKey = 'task-manager-auth-token';
const localIdentityKey = 'task-manager-local-identity';
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.205.187.96:3000';

export type User = { id: string; name: string; email: string };

const userSchema = z.object({ id: z.string(), name: z.string(), email: z.string().email() }).strict();
const authResponseSchema = z.object({ token: z.string().min(1), user: userSchema }).strict();
const errorResponseSchema = z.object({ error: z.object({ code: z.string(), message: z.string() }).strict() });
const localIdentitySchema = userSchema;

export class AuthHttpError extends Error {
  constructor(readonly statusCode: number, readonly code: string | undefined, message: string) {
    super(message);
    this.name = 'AuthHttpError';
  }
}

export class AuthTimeoutError extends Error {
  constructor() {
    super('La solicitud de autenticación tardó demasiado.');
    this.name = 'AuthTimeoutError';
  }
}

export class AuthResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthResponseError';
  }
}

const request = async (path: string, options?: RequestInit, token?: string): Promise<unknown> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  const startedAt = Date.now();
  if (process.env.NODE_ENV !== 'production') console.info(`[auth] start ${options?.method ?? 'GET'} ${path} ${apiUrl}`);
  try {
    const response = await fetch(`${apiUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options?.headers ?? {}) }
    });
    if (process.env.NODE_ENV !== 'production') console.info(`[auth] response ${options?.method ?? 'GET'} ${path} ${response.status} ${Date.now() - startedAt}ms`);
    let body: unknown;
    if (response.status !== 204) {
      try { body = await response.json(); }
      catch {
        if (!response.ok) throw new AuthHttpError(response.status, undefined, 'Request failed.');
        throw new AuthResponseError('Server returned malformed JSON.');
      }
    }
    if (!response.ok) {
      const parsed = errorResponseSchema.safeParse(body);
      throw new AuthHttpError(response.status, parsed.success ? parsed.data.error.code : undefined, parsed.success ? parsed.data.error.message : 'Request failed.');
    }
    return body;
  } catch (error) {
    if (controller.signal.aborted) throw new AuthTimeoutError();
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

export const authApi = {
  register: async (name: string, email: string, password: string) => authResponseSchema.parse(await request('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) })),
  login: async (email: string, password: string) => authResponseSchema.parse(await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })),
  me: async (token: string) => userSchema.parse(await request('/api/auth/me', undefined, token)),
  saveToken: (token: string) => SecureStore.setItemAsync(tokenKey, token),
  getToken: () => SecureStore.getItemAsync(tokenKey),
  clearToken: () => SecureStore.deleteItemAsync(tokenKey),
  saveLocalIdentity: (user: User) => SecureStore.setItemAsync(localIdentityKey, JSON.stringify(user)),
  getLocalIdentity: async (): Promise<User | null> => {
    const raw = await SecureStore.getItemAsync(localIdentityKey);
    if (!raw) return null;
    try {
      const parsed = localIdentitySchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  },
  clearLocalIdentity: () => SecureStore.deleteItemAsync(localIdentityKey)
};
