import { z } from 'zod';

export const MAX_LOCATION_ACCURACY_METERS = 100;

const latitude = z.number().finite().min(-90).max(90);
const longitude = z.number().finite().min(-180).max(180);
const accuracy = z.number().finite().nonnegative().max(MAX_LOCATION_ACCURACY_METERS);

const taskFieldsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  completed: z.boolean().optional(),
  latitude: latitude.nullable().optional(),
  longitude: longitude.nullable().optional(),
  locationAccuracy: accuracy.nullable().optional(),
  locationTimestamp: z.coerce.date().nullable().optional()
}).strict();

const createTaskFieldsSchema = taskFieldsSchema.extend({
  completed: z.boolean().optional().default(false),
  externalProvider: z.string().trim().min(1).max(100).optional(),
  externalId: z.string().trim().min(1).max(255).optional()
});

const locationFields = ['latitude', 'longitude', 'locationAccuracy', 'locationTimestamp'] as const;
const provenanceFields = ['externalProvider', 'externalId'] as const;

const validateProvenanceFields = (
  value: Partial<Record<(typeof provenanceFields)[number], unknown>>,
  context: z.RefinementCtx
) => {
  const providerSupplied = value.externalProvider !== undefined;
  const idSupplied = value.externalId !== undefined;
  if (providerSupplied !== idSupplied) {
    context.addIssue({
      code: 'custom',
      path: [providerSupplied ? 'externalId' : 'externalProvider'],
      message: 'External provenance requires externalProvider and externalId together.'
    });
  }
};


const validateLocationFields = (value: Partial<Record<(typeof locationFields)[number], unknown>>, context: z.RefinementCtx) => {
  const supplied = locationFields.some((field) => value[field] !== undefined);
  if (!supplied) return;

  const cleared = locationFields.every((field) => value[field] === null);
  const complete = locationFields.every((field) => value[field] !== undefined && value[field] !== null);
  if (!cleared && !complete) {
    context.addIssue({ code: 'custom', path: ['latitude'], message: 'Location requires latitude, longitude, accuracy, and timestamp together.' });
  }
};
export const createTaskSchema = createTaskFieldsSchema.superRefine((value, context) => {
  validateLocationFields(value, context);
  validateProvenanceFields(value, context);
});

export const updateTaskSchema = taskFieldsSchema.partial().superRefine((value, context) => {
  if (Object.keys(value).length === 0) {
    context.addIssue({ code: 'custom', message: 'At least one field is required.' });
    return;
  }
  validateLocationFields(value, context);
});

export const taskIdSchema = z.object({
  id: z.string().uuid()
});

export const taskQuerySchema = z.object({
  completed: z.enum(['true', 'false']).transform((value) => value === 'true').optional()
}).passthrough();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
