import { z } from 'zod';
import { fetch as expoFetch } from 'expo/fetch';
import { File } from 'expo-file-system';

const fetch = expoFetch;
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.205.187.96:3000';

export type ImageAttachment = { id: string; taskId?: string; filename: string; url: string; contentUrl?: string; mimeType: string; size: number; createdAt: string };
export type AudioAttachment = { id: string; url: string; duration: number; mimeType: string; size: number; createdAt: string };
export const imageAttachmentSchema = z.object({
  id: z.string(),
  taskId: z.string().optional(),
  filename: z.string(),
  url: z.string(),
  contentUrl: z.string().optional(),
  mimeType: z.string(),
  size: z.number().nonnegative(),
  createdAt: z.string()
});
export const resolveAttachmentUrl = (value: string) => {
  if (/^https?:\/\//i.test(value)) return value;
  if (!value.startsWith('/api/')) throw new Error('La referencia de imagen no es segura.');
  return `${apiUrl.replace(/\/+$/, '')}/${value.replace(/^\/+/, '')}`;
};
export const imageContentUrl = (image: Pick<ImageAttachment, 'id' | 'contentUrl'>, taskId: string) =>
  resolveAttachmentUrl(image.contentUrl ?? `/api/tasks/${taskId}/images/${image.id}/file`);

export class AttachmentHttpError extends Error {
  constructor(readonly statusCode: number, readonly code: string | undefined, message: string) {
    super(message);
    this.name = 'AttachmentHttpError';
  }
}

export class AttachmentTimeoutError extends Error {
  constructor() {
    super('La solicitud del adjunto tardó demasiado.');
    this.name = 'AttachmentTimeoutError';
  }
}

export class AttachmentResponseError extends Error {
  constructor() {
    super('El servidor devolvió una respuesta de adjunto inválida.');
    this.name = 'AttachmentResponseError';
  }
}

const request = async <T>(path: string, token: string, options?: RequestInit): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${apiUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, ...(options?.headers ?? {}) }
    });
    if (response.status === 204) return undefined as T;
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      if (response.ok) throw new AttachmentResponseError();
    }
    if (!response.ok) {
      const error = typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'object' && body.error !== null ? body.error : undefined;
      const code = error && 'code' in error && typeof error.code === 'string' ? error.code : undefined;
      const message = error && 'message' in error && typeof error.message === 'string' ? error.message : 'La solicitud del adjunto fue rechazada.';
      throw new AttachmentHttpError(response.status, code, message);
    }
    return body as T;
  } catch (error) {
    if (controller.signal.aborted) throw new AttachmentTimeoutError();
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

const fileBody = (uri: string, name: string, type: string, extra?: Record<string, string>) => {
  const file = new File(uri);
  if (!file.exists) throw new Error('El archivo local de la fotografía no está disponible.');
  const form = new FormData();
  form.append('file', file, name);
  Object.entries(extra ?? {}).forEach(([key, value]) => form.append(key, value));
  return form;
};

export const audioFileUrl = (taskId: string, audioId: string) => resolveAttachmentUrl(`/api/tasks/${taskId}/audios/${audioId}/file`);
export const imageFileUrl = (taskId: string, imageId: string) => resolveAttachmentUrl(`/api/tasks/${taskId}/images/${imageId}/file`);
export const attachmentsApi = {
  uploadImage: async (token: string, taskId: string, uri: string, operationId?: string, filename = 'task-image.jpg', mimeType = 'image/jpeg') =>
    imageAttachmentSchema.parse(await request<unknown>(`/api/tasks/${taskId}/images`, token, { method: 'POST', headers: operationId ? { 'Idempotency-Key': operationId } : undefined, body: fileBody(uri, filename, mimeType) })),
  images: async (token: string, taskId: string) => z.array(imageAttachmentSchema).parse(await request<unknown>(`/api/tasks/${taskId}/images`, token)),
  deleteImage: (token: string, taskId: string, imageId: string) => request<void>(`/api/tasks/${taskId}/images/${imageId}`, token, { method: 'DELETE' }),
  uploadAudio: (token: string, taskId: string, uri: string, duration: number) => request<AudioAttachment>(`/api/tasks/${taskId}/audios`, token, { method: 'POST', body: fileBody(uri, 'task-audio.m4a', 'audio/mp4', { duration: String(duration) }) }),
  audios: (token: string, taskId: string) => request<AudioAttachment[]>(`/api/tasks/${taskId}/audios`, token),
  imageContentUrl: (image: ImageAttachment, taskId: string) => imageContentUrl(image, taskId),
  audioFileUrl: (taskId: string, audioId: string) => audioFileUrl(taskId, audioId),
  imageFileUrl: (taskId: string, imageId: string) => imageFileUrl(taskId, imageId),
  deleteAudio: (token: string, taskId: string, audioId: string) => request<void>(`/api/tasks/${taskId}/audios/${audioId}`, token, { method: 'DELETE' })
};
