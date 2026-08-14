import type { RequestHandler } from 'express';
import * as attachmentService from '../services/attachment.service';
import { HttpError } from '../utils/errors';

export const createImage: RequestHandler = async (request, response, next) => {
  try {
    if (!request.file) throw new HttpError(400, 'IMAGE_FILE_REQUIRED', 'Image file is required.');
    response.status(201).json(await attachmentService.createImage(request.userId, request.params.id as string, request.file));
  } catch (error) { next(error); }
};

export const listImages: RequestHandler = async (request, response, next) => {
  try { response.json(await attachmentService.listImages(request.userId, request.params.id as string)); } catch (error) { next(error); }
};

export const deleteImage: RequestHandler = async (request, response, next) => {
  try { await attachmentService.deleteImage(request.userId, request.params.id as string, request.params.imageId as string); response.status(204).send(); } catch (error) { next(error); }
};

export const createAudio: RequestHandler = async (request, response, next) => {
  try {
    if (!request.file) throw new HttpError(400, 'AUDIO_FILE_REQUIRED', 'Audio file is required.');
    const { duration } = response.locals.body as { duration: number };
    response.status(201).json(await attachmentService.createAudio(request.userId, request.params.id as string, request.file, duration));
  } catch (error) { next(error); }
};

export const listAudios: RequestHandler = async (request, response, next) => {
  try { response.json(await attachmentService.listAudios(request.userId, request.params.id as string)); } catch (error) { next(error); }
};

export const deleteAudio: RequestHandler = async (request, response, next) => {
  try { await attachmentService.deleteAudio(request.userId, request.params.id as string, request.params.audioId as string); response.status(204).send(); } catch (error) { next(error); }
};
export const serveImage: RequestHandler = async (request, response, next) => {
  try { response.sendFile(await attachmentService.imagePath(request.userId, request.params.id as string, request.params.imageId as string)); } catch (error) { next(error); }
};

export const serveAudio: RequestHandler = async (request, response, next) => {
  try { response.sendFile(await attachmentService.audioPath(request.userId, request.params.id as string, request.params.audioId as string)); } catch (error) { next(error); }
};
