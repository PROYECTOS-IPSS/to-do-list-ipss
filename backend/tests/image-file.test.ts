import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { signToken } from '../src/utils/auth';
import { app } from '../src/server';
import { prisma } from '../src/config/prisma';

jest.mock('../src/config/prisma', () => ({
  prisma: {
    taskImage: { findFirst: jest.fn() },
    $queryRaw: jest.fn()
  }
}));

const owner = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Owner', email: 'owner@example.com' };
const stranger = { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', name: 'Other', email: 'other@example.com' };
const taskId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const imageAId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const imageBId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const fixtureA = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
const fixtureB = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
let uploadRoot: string;
const metadata = (id: string, filename: string, mimeType: string, size: number) => ({
  id,
  taskId,
  url: `/uploads/images/${filename}`,
  filename,
  mimeType,
  size,
  contentHash: null,
  createdAt: new Date()
});

beforeAll(async () => {
  uploadRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'task-images-'));
  process.env.UPLOAD_DIR = uploadRoot;
  await fs.mkdir(path.join(uploadRoot, 'images'));
  await fs.writeFile(path.join(uploadRoot, 'images', 'a.jpg'), fixtureA);
  await fs.writeFile(path.join(uploadRoot, 'images', 'b.png'), fixtureB);
});
afterAll(async () => {
  await fs.rm(uploadRoot, { recursive: true, force: true });
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(prisma.taskImage.findFirst).mockImplementation((async ({ where }: { where: { id: string; taskId: string; task: { userId: string } } }) => {
    if (where.taskId !== taskId || where.task.userId !== owner.id) return null;
    if (where.id === imageAId) return metadata(imageAId, 'a.jpg', 'image/jpeg', fixtureA.length);
    if (where.id === imageBId) return metadata(imageBId, 'b.png', 'image/png', fixtureB.length);
    return null;
  }) as never);
});
describe('protected image file endpoint', () => {
  it('streams exact private image bytes and is repeatable without mutation', async () => {
    const url = `/api/tasks/${taskId}/images/${imageAId}/file`;
    const first = await request(app).get(url).set('Authorization', `Bearer ${signToken(owner)}`);
    const second = await request(app).get(url).set('Authorization', `Bearer ${signToken(owner)}`);

    expect(first.status).toBe(200);
    expect(first.body).toEqual(fixtureA);
    expect(first.headers['content-type']).toMatch(/^image\/jpeg/);
    expect(first.headers['content-length']).toBe(String(fixtureA.length));
    expect(first.headers['x-content-type-options']).toBe('nosniff');
    expect(first.headers['cache-control']).toContain('private');
    expect(first.headers['cache-control']).not.toContain('public');
    expect(second.body).toEqual(fixtureA);
    expect(await fs.readFile(path.join(uploadRoot, 'images', 'a.jpg'))).toEqual(fixtureA);
    expect(prisma.taskImage.findFirst).toHaveBeenCalledTimes(2);
  });

  it('requires a valid token and conceals resources from another user', async () => {
    const url = `/api/tasks/${taskId}/images/${imageAId}/file`;
    expect((await request(app).get(url)).status).toBe(401);
    expect((await request(app).get(url).set('Authorization', 'Bearer invalid')).status).toBe(401);
    expect((await request(app).get(url).set('Authorization', `Bearer ${signToken(stranger)}`)).status).toBe(404);
  });

  it('rejects crossed and missing task or image identities', async () => {
    const auth = `Bearer ${signToken(owner)}`;
    const otherTask = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
    const missingImage = '11111111-1111-4111-8111-111111111111';
    expect((await request(app).get(`/api/tasks/${otherTask}/images/${imageAId}/file`).set('Authorization', auth)).status).toBe(404);
    expect((await request(app).get(`/api/tasks/${taskId}/images/${missingImage}/file`).set('Authorization', auth)).status).toBe(404);
  });

  it('streams two images independently', async () => {
    const auth = `Bearer ${signToken(owner)}`;
    const first = await request(app).get(`/api/tasks/${taskId}/images/${imageAId}/file`).set('Authorization', auth);
    const second = await request(app).get(`/api/tasks/${taskId}/images/${imageBId}/file`).set('Authorization', auth);
    expect(first.body).toEqual(fixtureA);
    expect(second.body).toEqual(fixtureB);
    expect(second.headers['content-type']).toMatch(/^image\/png/);
    expect(second.headers['content-length']).toBe(String(fixtureB.length));
  });

  it.each([
    ['/uploads/images/missing.jpg', 'missing file'],
    ['/uploads/images/../outside.jpg', 'traversal'],
    ['/etc/passwd', 'absolute path'],
    ['/uploads/audios/a.jpg', 'other directory'],
    ['/uploads/images/a\\..\\outside.jpg', 'alternate separator']
  ])('rejects unsafe or unavailable metadata: %s (%s)', async (url) => {
    jest.mocked(prisma.taskImage.findFirst).mockResolvedValue({ ...metadata(imageAId, 'a.jpg', 'image/jpeg', fixtureA.length), url } as never);
    const response = await request(app).get(`/api/tasks/${taskId}/images/${imageAId}/file`).set('Authorization', `Bearer ${signToken(owner)}`);
    expect(response.status).toBe(404);
  });

  it('rejects a symlink escaping the image directory', async () => {
    const outside = path.join(uploadRoot, 'outside.jpg');
    await fs.writeFile(outside, fixtureA);
    await fs.symlink(outside, path.join(uploadRoot, 'images', 'escape.jpg'));
    jest.mocked(prisma.taskImage.findFirst).mockResolvedValue({ ...metadata(imageAId, 'escape.jpg', 'image/jpeg', fixtureA.length) } as never);
    const response = await request(app).get(`/api/tasks/${taskId}/images/${imageAId}/file`).set('Authorization', `Bearer ${signToken(owner)}`);
    expect(response.status).toBe(404);
  });
});
