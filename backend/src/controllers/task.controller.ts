import type { RequestHandler } from 'express';
import * as taskService from '../services/task.service';
import type { CreateTaskInput, UpdateTaskInput } from '../schemas/task.schemas';
import { HttpError } from '../utils/errors';

const idempotencyKey = (value: string | undefined) => {
  if (value === undefined) return undefined;
  const key = value.trim();
  if (!key || key.length > 255) throw new HttpError(400, 'INVALID_IDEMPOTENCY_KEY', 'Idempotency-Key must be between 1 and 255 characters.');
  return key;
};

const expectedVersion = (value: string | undefined) => {
  if (value === undefined) return undefined;
  const match = /^"?([0-9]+)"?$/.exec(value.trim());
  if (!match) throw new HttpError(400, 'INVALID_TASK_VERSION', 'If-Match must contain a non-negative task version.');
  const parsed = Number(match[1]);
  if (!Number.isSafeInteger(parsed)) throw new HttpError(400, 'INVALID_TASK_VERSION', 'If-Match must contain a non-negative task version.');
  return parsed;
};

export const createTask: RequestHandler = async (request, response, next) => {
  try {
    const input = response.locals.body as CreateTaskInput;
    response.status(201).json(await taskService.createTask(request.userId, input, idempotencyKey(request.get('Idempotency-Key'))));
  } catch (error) { next(error); }
};

export const listTasks: RequestHandler = async (request, response, next) => {
  try {
    const { completed } = response.locals.query as { completed?: boolean };
    response.json(await taskService.listTasks(request.userId, completed));
  } catch (error) { next(error); }
};

export const getTask: RequestHandler = async (request, response, next) => {
  try { response.json(await taskService.getTask(request.userId, request.params.id as string)); } catch (error) { next(error); }
};

export const updateTask: RequestHandler = async (request, response, next) => {
  try {
    const input = response.locals.body as UpdateTaskInput;
    response.json(await taskService.updateTask(
      request.userId,
      request.params.id as string,
      input,
      expectedVersion(request.get('If-Match')),
      idempotencyKey(request.get('Idempotency-Key'))
    ));
  } catch (error) { next(error); }
};

export const deleteTask: RequestHandler = async (request, response, next) => {
  try {
    await taskService.deleteTask(
      request.userId,
      request.params.id as string,
      expectedVersion(request.get('If-Match')),
      idempotencyKey(request.get('Idempotency-Key'))
    );
    response.status(204).send();
  } catch (error) { next(error); }
};
