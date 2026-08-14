import { z } from 'zod';

export const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_AUDIO_DURATION_SECONDS = 3600;
export const AUDIO_MIME_TYPES = ['audio/mp4', 'audio/mpeg', 'audio/aac', 'audio/wav', 'audio/x-m4a'] as const;

export const attachmentParamsSchema = z.object({ id: z.string().uuid() });
export const imageParamsSchema = z.object({ id: z.string().uuid(), imageId: z.string().uuid() });
export const audioParamsSchema = z.object({ id: z.string().uuid(), audioId: z.string().uuid() });
export const audioUploadSchema = z.object({
  duration: z.coerce.number().finite().positive().max(MAX_AUDIO_DURATION_SECONDS)
}).strict();
