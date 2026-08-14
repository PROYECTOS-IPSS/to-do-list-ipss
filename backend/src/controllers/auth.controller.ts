import type { RequestHandler } from 'express';
import * as authService from '../services/auth.service';

export const register: RequestHandler = async (request, response, next) => {
  try { response.status(201).json(await authService.register(request.body)); } catch (error) { next(error); }
};

export const login: RequestHandler = async (request, response, next) => {
  try { response.json(await authService.login(request.body)); } catch (error) { next(error); }
};

export const me: RequestHandler = async (request, response, next) => {
  try { response.json(await authService.me(request.userId)); } catch (error) { next(error); }
};

export const logout: RequestHandler = (_request, response) => {
  response.status(204).send();
};
