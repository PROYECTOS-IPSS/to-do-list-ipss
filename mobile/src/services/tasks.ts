import { z } from 'zod';
import type { TaskLocation } from './location-validation';

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.205.187.96:3000';

export type Task = {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  latitude: number | null;
  longitude: number | null;
  locationAccuracy: number | null;
  locationTimestamp: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type TaskLocationInput = {
  latitude: TaskLocation['latitude'];
  longitude: TaskLocation['longitude'];
  locationAccuracy: TaskLocation['accuracy'];
  locationTimestamp: TaskLocation['timestamp'];
};

export type TaskLocationClearInput = {
  latitude: null;
  longitude: null;
  locationAccuracy: null;
  locationTimestamp: null;
};

type TaskInput = Pick<Task, 'title'> & Partial<Pick<Task, 'description' | 'completed'>> & Partial<{
  latitude: number | null;
  longitude: number | null;
  locationAccuracy: number | null;
  locationTimestamp: string | null;
}>;

export class TaskHttpError extends Error {
  constructor(readonly statusCode: number, message: string, readonly retryAfterMs?: number) {
    super(message);
    this.name = 'TaskHttpError';
  }
}

export const parseRetryAfterMs = (value: string | null, now = Date.now()): number | undefined => {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : Math.max(0, timestamp - now);
};

const taskErrorSchema = z.object({ error: z.object({ message: z.string() }).partial() }).partial();

const request = async (path: string, token: string, options?: RequestInit) => {
  const url = `${apiUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options?.headers ?? {}) }
  });
  let body: unknown;
  if (response.status !== 204) {
    try { body = await response.json(); } catch { body = undefined; }
  }
  const parsedError = taskErrorSchema.safeParse(body);
  if (!response.ok) throw new TaskHttpError(response.status, parsedError.success ? parsedError.data.error?.message ?? 'Request failed.' : 'Request failed.', parseRetryAfterMs(response.headers.get('Retry-After')));
  return body;
};
export const tasksApi = {
  list: (token: string) => request('/api/tasks', token) as Promise<Task[]>,
  get: (token: string, id: string) => request(`/api/tasks/${id}`, token) as Promise<Task>,
  create: (token: string, input: TaskInput, operationId?: string) => request('/api/tasks', token, { method: 'POST', headers: operationId ? { 'Idempotency-Key': operationId } : undefined, body: JSON.stringify(input) }) as Promise<Task>,
  update: (token: string, id: string, input: Partial<TaskInput>, operationId?: string, expectedVersion?: number) => request(`/api/tasks/${id}`, token, { method: 'PATCH', headers: { ...(operationId ? { 'Idempotency-Key': operationId } : {}), ...(expectedVersion === undefined ? {} : { 'If-Match': `"${expectedVersion}"` }) }, body: JSON.stringify(input) }) as Promise<Task>,
  remove: (token: string, id: string, operationId?: string, expectedVersion?: number) => request(`/api/tasks/${id}`, token, { method: 'DELETE', headers: { ...(operationId ? { 'Idempotency-Key': operationId } : {}), ...(expectedVersion === undefined ? {} : { 'If-Match': `"${expectedVersion}"` }) } }) as Promise<void>
};
