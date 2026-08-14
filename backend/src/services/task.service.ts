import { prisma } from '../config/prisma';
import type { CreateTaskInput, UpdateTaskInput } from '../schemas/task.schemas';
import { HttpError } from '../utils/errors';

export const createTask = (userId: string, input: CreateTaskInput) => prisma.task.create({
  data: { ...input, userId }
});

export const listTasks = (userId: string, completed?: boolean) => prisma.task.findMany({
  where: { userId, ...(completed === undefined ? {} : { completed }) },
  orderBy: { createdAt: 'desc' }
});

export const getTask = async (userId: string, id: string) => {
  const task = await prisma.task.findFirst({ where: { id, userId } });
  if (!task) throw new HttpError(404, 'TASK_NOT_FOUND', 'Task not found.');
  return task;
};

export const updateTask = async (userId: string, id: string, input: UpdateTaskInput) => {
  const result = await prisma.task.updateMany({ where: { id, userId }, data: input });
  if (result.count === 0) throw new HttpError(404, 'TASK_NOT_FOUND', 'Task not found.');
  return getTask(userId, id);
};

export const deleteTask = async (userId: string, id: string) => {
  const result = await prisma.task.deleteMany({ where: { id, userId } });
  if (result.count === 0) throw new HttpError(404, 'TASK_NOT_FOUND', 'Task not found.');
};
