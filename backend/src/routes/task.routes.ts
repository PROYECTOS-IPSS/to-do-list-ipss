import { Router } from 'express';
import * as taskController from '../controllers/task.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createTaskSchema, taskIdSchema, taskQuerySchema, updateTaskSchema } from '../schemas/task.schemas';

const router = Router();
router.post('/', requireAuth, validate('body', createTaskSchema), taskController.createTask);
router.get('/', requireAuth, validate('query', taskQuerySchema), taskController.listTasks);
router.get('/:id', requireAuth, validate('params', taskIdSchema), taskController.getTask);
router.patch('/:id', requireAuth, validate('params', taskIdSchema), validate('body', updateTaskSchema), taskController.updateTask);
router.delete('/:id', requireAuth, validate('params', taskIdSchema), taskController.deleteTask);

export { router as taskRoutes };
