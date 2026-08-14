import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { loginSchema, registerSchema } from '../schemas/auth.schemas';

const router = Router();

router.post('/register', validate('body', registerSchema), authController.register);
router.post('/login', validate('body', loginSchema), authController.login);
router.get('/me', requireAuth, authController.me);
router.post('/logout', requireAuth, authController.logout);

export { router as authRoutes };
