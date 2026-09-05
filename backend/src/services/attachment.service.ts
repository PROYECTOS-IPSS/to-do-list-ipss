import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { fileIntegrity, filePath, imageFilePath, removeFile, restoreFile, saveFile } from './file-storage.service';
import { HttpError } from '../utils/errors';

export const imageResponse = (image: unknown) => {
  if (!image || typeof image !== 'object' || !('id' in image) || !('taskId' in image) || typeof image.id !== 'string' || typeof image.taskId !== 'string') return image;
  return {
    ...image,
    contentUrl: `/api/tasks/${image.taskId}/images/${image.id}/file`
  };
};
const ensureTask = async (userId: string, taskId: string) => {
  const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
  if (!task) throw new HttpError(404, 'TASK_NOT_FOUND', 'Task not found.');
};

const isUniqueViolation = (error: unknown) => error instanceof Error && 'code' in error && error.code === 'P2002';
const imageRequestHash = (taskId: string, file: Express.Multer.File) =>
  createHash('sha256').update(file.buffer).update('\0').update(taskId).digest('hex');
const idempotencyConflict = () =>
  new HttpError(409, 'IDEMPOTENCY_KEY_REUSED', 'Idempotency key was already used with a different request.');

export const createImage = async (
  userId: string,
  taskId: string,
  file: Express.Multer.File,
  idempotencyKey?: string
) => {
  await ensureTask(userId, taskId);
  const contentHash = imageRequestHash(taskId, file);
  if (!idempotencyKey) {
    const stored = await saveFile(file, 'images');
    if (!(await fileIntegrity(stored.url, file.size, contentHash, taskId))) {
      await removeFile(stored.url);
      throw new HttpError(500, 'IMAGE_INTEGRITY_FAILED', 'Image file could not be verified.');
    }
    try {
      return await prisma.taskImage.create({
        data: { taskId, url: stored.url, filename: stored.filename, mimeType: file.mimetype, size: file.size, contentHash }
      });
    } catch (error) {
      await removeFile(stored.url);
      throw error;
    }
  }

  const where = { userId_key: { userId, key: idempotencyKey } };
  const existing = await prisma.taskMutation.findUnique({ where });
  if (existing) {
    if (existing.requestHash !== contentHash) throw idempotencyConflict();
    const response = existing.responseBody as {
      id?: unknown; taskId?: unknown; url?: unknown; filename?: unknown;
      mimeType?: unknown; size?: unknown; contentHash?: unknown; createdAt?: unknown;
    };
    if (
      typeof response.id !== 'string' || response.taskId !== taskId ||
      typeof response.url !== 'string' || typeof response.filename !== 'string' ||
      typeof response.mimeType !== 'string' || typeof response.size !== 'number' ||
      (typeof response.contentHash === 'string' && response.contentHash !== contentHash)
    ) throw new HttpError(409, 'IMAGE_INTEGRITY_REVIEW', 'Image result requires integrity review.');
    if (!(await fileIntegrity(response.url, response.size, contentHash, taskId))) {
      await restoreFile(response.url, file);
      if (!(await fileIntegrity(response.url, response.size, contentHash, taskId))) throw new HttpError(500, 'IMAGE_INTEGRITY_FAILED', 'Image file could not be restored.');
    }
    const current = await prisma.taskImage.findFirst({ where: { id: response.id, taskId } });
    if (!current) {
      await prisma.taskImage.create({
        data: {
          id: response.id, taskId, url: response.url, filename: response.filename,
          mimeType: response.mimeType, size: response.size, contentHash
        }
      });
    }
    return existing.responseBody;
  }
  const stored = await saveFile(file, 'images');
  if (!(await fileIntegrity(stored.url, file.size, contentHash, taskId))) {
    await removeFile(stored.url);
    throw new HttpError(500, 'IMAGE_INTEGRITY_FAILED', 'Image file could not be verified.');
  }
  try {

    const result = await prisma.$transaction(async (db) => {
      const existing = await db.taskMutation.findUnique({ where });
      if (existing) {
        if (existing.requestHash !== contentHash) throw idempotencyConflict();
        return { image: existing.responseBody, replayed: true };
      }
      const image = await db.taskImage.create({
        data: { taskId, url: stored.url, filename: stored.filename, mimeType: file.mimetype, size: file.size, contentHash }
      });
      await db.taskMutation.create({
        data: {
          userId,
          key: idempotencyKey,
          operation: 'image-create',
          requestHash: contentHash,
          responseBody: JSON.parse(JSON.stringify(image)) ?? Prisma.JsonNull
        }
      });
      return { image, replayed: false };
    });
    if (result.replayed) await removeFile(stored.url);
    return result.image;
  } catch (error) {
    await removeFile(stored.url);
    if (!isUniqueViolation(error)) throw error;
    const existing = await prisma.taskMutation.findUnique({ where });
    if (!existing) throw error;
    if (existing.requestHash !== contentHash) throw idempotencyConflict();
    return existing.responseBody;
  }
};

export const listImages = async (userId: string, taskId: string) => {
  await ensureTask(userId, taskId);
  return prisma.taskImage.findMany({ where: { taskId }, orderBy: { createdAt: 'desc' } });
};

export const deleteImage = async (userId: string, taskId: string, imageId: string) => {
  await ensureTask(userId, taskId);
  const image = await prisma.taskImage.findFirst({ where: { id: imageId, taskId } });
  if (!image) throw new HttpError(404, 'IMAGE_NOT_FOUND', 'Image not found.');
  await prisma.taskImage.delete({ where: { id: imageId } });
  await removeFile(image.url);
};
export const createAudio = async (userId: string, taskId: string, file: Express.Multer.File, duration: number) => {
  await ensureTask(userId, taskId);
  if (!Number.isFinite(duration) || duration <= 0 || duration > 3600) throw new HttpError(400, 'INVALID_AUDIO_DURATION', 'Invalid audio duration.');
  const stored = await saveFile(file, 'audios');
  try { return await prisma.taskAudio.create({ data: { taskId, url: stored.url, duration, mimeType: file.mimetype, size: file.size } }); }
  catch (error) { await removeFile(stored.url); throw error; }
};

export const listAudios = async (userId: string, taskId: string) => {
  await ensureTask(userId, taskId);
  return prisma.taskAudio.findMany({ where: { taskId }, orderBy: { createdAt: 'desc' } });
};
export const deleteAudio = async (userId: string, taskId: string, audioId: string) => {
  await ensureTask(userId, taskId);
  const audio = await prisma.taskAudio.findFirst({ where: { id: audioId, taskId } });
  if (!audio) throw new HttpError(404, 'AUDIO_NOT_FOUND', 'Audio not found.');
  await prisma.taskAudio.delete({ where: { id: audioId } });
  await removeFile(audio.url);
};

export const imagePath = async (userId: string, taskId: string, imageId: string) => {
  const image = await prisma.taskImage.findFirst({
    where: { id: imageId, taskId, task: { userId } }
  });
  if (!image) throw new HttpError(404, 'IMAGE_NOT_FOUND', 'Image not found.');
  try {
    const stored = await imageFilePath(image.url);
    return { ...stored, mimeType: image.mimeType, contentHash: image.contentHash };
  } catch {
    throw new HttpError(404, 'IMAGE_FILE_NOT_FOUND', 'Image file not found.');
  }
};

export const audioPath = async (userId: string, taskId: string, audioId: string) => {
  await ensureTask(userId, taskId);
  const audio = await prisma.taskAudio.findFirst({ where: { id: audioId, taskId } });
  if (!audio) throw new HttpError(404, 'AUDIO_NOT_FOUND', 'Audio not found.');
  return filePath(audio.url);
};
