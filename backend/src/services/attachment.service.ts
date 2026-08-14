import { prisma } from '../config/prisma';
import { filePath, removeFile, saveFile } from './file-storage.service';
import { HttpError } from '../utils/errors';

const ensureTask = async (userId: string, taskId: string) => {
  const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
  if (!task) throw new HttpError(404, 'TASK_NOT_FOUND', 'Task not found.');
};

export const createImage = async (userId: string, taskId: string, file: Express.Multer.File) => {
  await ensureTask(userId, taskId);
  const stored = await saveFile(file);
  try { return await prisma.taskImage.create({ data: { taskId, url: stored.url, filename: stored.filename, mimeType: file.mimetype, size: file.size } }); }
  catch (error) { await removeFile(stored.url); throw error; }
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
  if (!Number.isFinite(duration) || duration < 0 || duration > 3600) throw new HttpError(400, 'INVALID_AUDIO_DURATION', 'Invalid audio duration.');
  const stored = await saveFile(file);
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
  await ensureTask(userId, taskId);
  const image = await prisma.taskImage.findFirst({ where: { id: imageId, taskId } });
  if (!image) throw new HttpError(404, 'IMAGE_NOT_FOUND', 'Image not found.');
  return filePath(image.url);
};

export const audioPath = async (userId: string, taskId: string, audioId: string) => {
  await ensureTask(userId, taskId);
  const audio = await prisma.taskAudio.findFirst({ where: { id: audioId, taskId } });
  if (!audio) throw new HttpError(404, 'AUDIO_NOT_FOUND', 'Audio not found.');
  return filePath(audio.url);
};
