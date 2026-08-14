import type { RequestHandler } from 'express';
import * as taskService from '../services/task.service';

export const createTask: RequestHandler = async (request, response, next) => {
  try { response.status(201).json(await taskService.createTask(request.userId, request.body)); } catch (error) { next(error); }
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
  try { response.json(await taskService.updateTask(request.userId, request.params.id as string, request.body)); } catch (error) { next(error); }
};

export const deleteTask: RequestHandler = async (request, response, next) => {
  try {
    await taskService.deleteTask(request.userId, request.params.id as string);
    response.status(204).send();
  } catch (error) { next(error); }
};
