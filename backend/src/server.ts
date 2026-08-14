import 'dotenv/config';
import express, { type ErrorRequestHandler } from 'express';
import multer from 'multer';
import { authRoutes } from './routes/auth.routes';
import { attachmentRoutes } from './routes/attachment.routes';
import { taskRoutes } from './routes/task.routes';
import { HttpError } from './utils/errors';
const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.json());

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});
app.use('/api/tasks/:id', attachmentRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

app.use((_request, response) => {
  response.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found.'
    }
  });
});

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const isMulterError = error instanceof multer.MulterError;
  const statusCode = isMulterError ? 400 : error instanceof HttpError ? error.statusCode : 500;
  const code = isMulterError ? 'INVALID_UPLOAD' : error instanceof HttpError ? error.code : 'INTERNAL_SERVER_ERROR';
  const message = isMulterError ? 'Uploaded file is invalid or exceeds the allowed size.' : error instanceof HttpError ? error.message : 'Internal server error.';

  response.status(statusCode).json({ success: false, error: { code, message } });
};

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });
}

export { app };
