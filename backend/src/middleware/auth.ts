import type { RequestHandler } from 'express';
import { HttpError } from '../utils/errors';
import { verifyToken } from '../utils/auth';

export const requireAuth: RequestHandler = (request, _response, next) => {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new HttpError(401, 'UNAUTHORIZED', 'Authentication required.'));
    return;
  }

  try {
    request.userId = verifyToken(header.slice(7));
    next();
  } catch {
    next(new HttpError(401, 'UNAUTHORIZED', 'Invalid or expired token.'));
  }
};
