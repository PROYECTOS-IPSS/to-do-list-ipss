import { z } from 'zod';

export const attachmentParamsSchema = z.object({ id: z.string().uuid() });
export const imageParamsSchema = z.object({ id: z.string().uuid(), imageId: z.string().uuid() });
export const audioParamsSchema = z.object({ id: z.string().uuid(), audioId: z.string().uuid() });
