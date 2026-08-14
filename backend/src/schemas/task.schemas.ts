import { z } from 'zod';

const latitude = z.number().finite().min(-90).max(90);
const longitude = z.number().finite().min(-180).max(180);
const accuracy = z.number().finite().nonnegative().max(100000);

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  completed: z.boolean().optional().default(false),
  latitude: latitude.nullable().optional(),
  longitude: longitude.nullable().optional(),
  locationAccuracy: accuracy.nullable().optional(),
  locationTimestamp: z.coerce.date().nullable().optional()
}).strict();

export const updateTaskSchema = createTaskSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required.'
);

export const taskIdSchema = z.object({
  id: z.string().uuid()
});

export const taskQuerySchema = z.object({
  completed: z.enum(['true', 'false']).transform((value) => value === 'true').optional()
}).passthrough();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
