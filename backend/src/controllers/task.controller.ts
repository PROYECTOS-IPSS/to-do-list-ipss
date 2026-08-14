import type { RequestHandler } from 'express';
import * as taskService from '../services/task.service';
import type { CreateTaskInput, UpdateTaskInput } from '../schemas/task.schemas';

export const createTask: RequestHandler = async (request, response, next) => {
  try {
    const input = response.locals.body as CreateTaskInput;
    response.status(201).json(await taskService.createTask(request.userId, input));
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
    response.json(await taskService.updateTask(request.userId, request.params.id as string, input));
  } catch (error) { next(error); }
};

export const deleteTask: RequestHandler = async (request, response, next) => {
  try {
    await taskService.deleteTask(request.userId, request.params.id as string);
    response.status(204).send();
  } catch (error) { next(error); }
};
