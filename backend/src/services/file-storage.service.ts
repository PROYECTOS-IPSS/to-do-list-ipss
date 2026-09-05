import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

const uploadRoot = () => path.resolve(process.env.UPLOAD_DIR ?? 'uploads');

export const saveFile = async (file: Express.Multer.File, directoryName = file.fieldname) => {
  const directory = path.join(uploadRoot(), directoryName);
  await fs.mkdir(directory, { recursive: true });
  const filename = `${randomUUID()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const target = path.join(directory, filename);
  await fs.writeFile(target, file.buffer);
  return { filename, url: `/uploads/${directoryName}/${filename}` };
};
export const restoreFile = async (url: string, file: Express.Multer.File) => {
  const target = filePath(url);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, file.buffer, { flag: 'wx' });
};

export const fileIntegrity = async (url: string, expectedSize: number, expectedHash: string, taskId: string) => {
  const target = filePath(url);
  try {
    const contents = await fs.readFile(target);
    const hash = createHash('sha256').update(contents).update('\0').update(taskId).digest('hex');
    return contents.length === expectedSize && hash === expectedHash;
  } catch {
    return false;
  }
};
export const imageFilePath = async (url: string) => {
  const match = /^\/uploads\/images\/([^/\\\0]+)$/.exec(url);
  if (!match) throw new Error('Invalid image path.');
  const directory = path.join(uploadRoot(), 'images');
  const target = path.resolve(directory, match[1]);
  if (!target.startsWith(`${directory}${path.sep}`)) throw new Error('Invalid image path.');
  const [realDirectory, realTarget] = await Promise.all([fs.realpath(directory), fs.realpath(target)]);
  if (!realTarget.startsWith(`${realDirectory}${path.sep}`)) throw new Error('Invalid image path.');
  const stat = await fs.stat(realTarget);
  if (!stat.isFile()) throw new Error('Invalid image file.');
  return { path: realTarget, size: stat.size };
};

export const removeFile = async (url: string) => {
  const relative = url.replace(/^\/uploads\//, '');
  await fs.rm(path.join(uploadRoot(), relative), { force: true });
};
export const filePath = (url: string) => {
  const relative = url.replace(/^\/uploads\//, '');
  if (relative.includes('..') || path.isAbsolute(relative)) throw new Error('Invalid file path.');
  return path.join(uploadRoot(), relative);
};
