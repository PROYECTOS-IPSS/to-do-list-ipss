import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const root = path.resolve(process.env.UPLOAD_DIR ?? 'uploads');

export const saveFile = async (file: Express.Multer.File) => {
  const directory = path.join(root, file.fieldname);
  await fs.mkdir(directory, { recursive: true });
  const filename = `${randomUUID()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const target = path.join(directory, filename);
  await fs.writeFile(target, file.buffer);
  return { filename, url: `/uploads/${file.fieldname}/${filename}` };
};

export const removeFile = async (url: string) => {
  const relative = url.replace(/^\/uploads\//, '');
  await fs.rm(path.join(root, relative), { force: true });
};
export const filePath = (url: string) => {
  const relative = url.replace(/^\/uploads\//, '');
  if (relative.includes('..') || path.isAbsolute(relative)) throw new Error('Invalid file path.');
  return path.join(root, relative);
};
