import * as SecureStore from 'expo-secure-store';

const tokenKey = 'task-manager-auth-token';
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.205.187.96:3000';

export type User = { id: string; name: string; email: string };
type AuthResponse = { token: string; user: User };

const request = async <T>(path: string, options?: RequestInit, token?: string): Promise<T> => {
  const response = await fetch(`${apiUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...options
  });
  const body = response.status === 204 ? undefined : await response.json();
  if (!response.ok) throw new Error(body?.error?.message ?? 'Request failed.');
  return body as T;
};

export const authApi = {
  register: (name: string, email: string, password: string) => request<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  login: (email: string, password: string) => request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: (token: string) => request<User>('/api/auth/me', undefined, token),
  saveToken: (token: string) => SecureStore.setItemAsync(tokenKey, token),
  getToken: () => SecureStore.getItemAsync(tokenKey),
  clearToken: () => SecureStore.deleteItemAsync(tokenKey)
};
