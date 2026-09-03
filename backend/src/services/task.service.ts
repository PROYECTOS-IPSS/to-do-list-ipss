import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import type { CreateTaskInput, UpdateTaskInput } from '../schemas/task.schemas';
import { removeFile } from './file-storage.service';
import { HttpError } from '../utils/errors';

type MutationPayload<T> = { response: T; cleanup?: string[] };
type MutationResult<T> = { response: T; replayed: boolean; cleanup?: string[] };

const canonicalize = (value: unknown): unknown => {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
    return Object.fromEntries(entries.map(([key, item]) => [key, canonicalize(item)]));
  }
  return value;
};

const requestHash = (operation: string, taskId: string | undefined, input: unknown) =>
  createHash('sha256').update(JSON.stringify(canonicalize({ operation, taskId, input }))).digest('hex');
const isUniqueViolation = (error: unknown) => {
  if (!(error instanceof Error) || !('code' in error)) return false;
  return error.code === 'P2002';
};

const runMutation = async <T>(
  userId: string,
  key: string | undefined,
  operation: string,
  taskId: string | undefined,
  input: unknown,
  action: (db: Prisma.TransactionClient) => Promise<MutationPayload<T>>
): Promise<MutationResult<T>> => {
  if (!key) {
    const payload = await action(prisma);
    return { ...payload, replayed: false };
  }

  const hash = requestHash(operation, taskId, input);
  try {
    return await prisma.$transaction(async (db) => {
      const existing = await db.taskMutation.findUnique({ where: { userId_key: { userId, key } } });
      if (existing) {
        if (existing.requestHash !== hash) throw new HttpError(409, 'IDEMPOTENCY_KEY_REUSED', 'Idempotency key was already used with a different request.');
        return { response: existing.responseBody as T, replayed: true };
      }

      const payload = await action(db);
      await db.taskMutation.create({
        data: {
          userId,
          key,
          operation,
          requestHash: hash,
          responseBody: payload.response === undefined ? Prisma.JsonNull : JSON.parse(JSON.stringify(payload.response))
        }
      });
      return { ...payload, replayed: false };
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const existing = await prisma.taskMutation.findUnique({ where: { userId_key: { userId, key } } });
    if (!existing) throw error;
    if (existing.requestHash !== hash) throw new HttpError(409, 'IDEMPOTENCY_KEY_REUSED', 'Idempotency key was already used with a different request.');
    return { response: existing.responseBody as T, replayed: true };
  }
};

export const createTask = async (userId: string, input: CreateTaskInput, idempotencyKey?: string) => {
  const result = await runMutation(userId, idempotencyKey, 'create', undefined, input, async (db) => ({
    response: await db.task.create({ data: { ...input, userId } })
  }));
  return result.response;
};

export const listTasks = (userId: string, completed?: boolean) => prisma.task.findMany({
  where: { userId, ...(completed === undefined ? {} : { completed }) },
  orderBy: { createdAt: 'desc' }
});

export const getTask = async (userId: string, id: string) => {
  const task = await prisma.task.findFirst({ where: { id, userId } });
  if (!task) throw new HttpError(404, 'TASK_NOT_FOUND', 'Task not found.');
  return task;
};

export const updateTask = async (
  userId: string,
  id: string,
  input: UpdateTaskInput,
  expectedVersion?: number,
  idempotencyKey?: string
) => {
  const result = await runMutation(userId, idempotencyKey, 'update', id, { input, expectedVersion }, async (db) => {
    const where = { id, userId, ...(expectedVersion === undefined ? {} : { version: expectedVersion }) };
    const updated = await db.task.updateMany({ where, data: { ...input, version: { increment: 1 } } });
    if (updated.count === 0) {
      const current = await db.task.findFirst({ where: { id, userId }, select: { version: true } });
      if (!current) throw new HttpError(404, 'TASK_NOT_FOUND', 'Task not found.');
      throw new HttpError(409, 'TASK_VERSION_CONFLICT', 'Task was changed by another request.');
    }
    const task = await db.task.findFirst({ where: { id, userId } });
    if (!task) throw new HttpError(404, 'TASK_NOT_FOUND', 'Task not found.');
    return { response: task };
  });
  return result.response;
};

export const deleteTask = async (userId: string, id: string, expectedVersion?: number, idempotencyKey?: string) => {
  const result = await runMutation(userId, idempotencyKey, 'delete', id, { expectedVersion }, async (db) => {
    const task = await db.task.findFirst({
      where: { id, userId },
      select: { version: true, images: { select: { url: true } }, audios: { select: { url: true } } }
    });
    if (!task) throw new HttpError(404, 'TASK_NOT_FOUND', 'Task not found.');

    const where = { id, userId, ...(expectedVersion === undefined ? {} : { version: expectedVersion }) };
    const deleted = await db.task.deleteMany({ where });
    if (deleted.count === 0) {
      const current = await db.task.findFirst({ where: { id, userId }, select: { version: true } });
      if (!current) throw new HttpError(404, 'TASK_NOT_FOUND', 'Task not found.');
      throw new HttpError(409, 'TASK_VERSION_CONFLICT', 'Task was changed by another request.');
    }
    return {
      response: null,
      cleanup: [...task.images, ...task.audios].map(({ url }) => url)
    };
  });

  if (result.cleanup) await Promise.allSettled(result.cleanup.map((url) => removeFile(url)));
};
