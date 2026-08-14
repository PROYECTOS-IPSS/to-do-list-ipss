import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { HttpError } from '../utils/errors';

export const validate = (target: 'body' | 'params' | 'query', schema: z.ZodType): RequestHandler => {
  return (request, response, next) => {
    const result = schema.safeParse(request[target]);
    if (!result.success) {
      next(new HttpError(400, 'VALIDATION_ERROR', result.error.issues[0]?.message ?? 'Invalid request.'));
      return;
    }
    response.locals[target] = result.data;
    next();
  };
};
