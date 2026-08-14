import { Router } from 'express';
import multer from 'multer';
import * as controller from '../controllers/attachment.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { attachmentParamsSchema, audioParamsSchema, imageParamsSchema } from '../schemas/attachment.schemas';

const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const audioTypes = new Set(['audio/mp4', 'audio/mpeg', 'audio/aac', 'audio/wav', 'audio/x-m4a']);
const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (_request, file, callback) => { if (!imageTypes.has(file.mimetype)) { callback(new Error('Unsupported image type.')); return; } callback(null, true); } });
const audioUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (_request, file, callback) => { if (!audioTypes.has(file.mimetype)) { callback(new Error('Unsupported audio type.')); return; } callback(null, true); } });
const router = Router({ mergeParams: true });

router.post('/images', requireAuth, validate('params', attachmentParamsSchema), imageUpload.single('file'), controller.createImage);
router.get('/images', requireAuth, validate('params', attachmentParamsSchema), controller.listImages);
router.delete('/images/:imageId', requireAuth, validate('params', imageParamsSchema), controller.deleteImage);
router.get('/images/:imageId/file', requireAuth, validate('params', imageParamsSchema), controller.serveImage);
router.get('/audios/:audioId/file', requireAuth, validate('params', audioParamsSchema), controller.serveAudio);
router.post('/audios', requireAuth, validate('params', attachmentParamsSchema), audioUpload.single('file'), controller.createAudio);
router.get('/audios', requireAuth, validate('params', attachmentParamsSchema), controller.listAudios);
router.delete('/audios/:audioId', requireAuth, validate('params', audioParamsSchema), controller.deleteAudio);
export { router as attachmentRoutes };
