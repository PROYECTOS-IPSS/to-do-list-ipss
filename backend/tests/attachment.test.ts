import { createHash } from 'node:crypto';
import request from 'supertest';
import { app } from '../src/server';
import * as attachmentService from '../src/services/attachment.service';
import { prisma } from '../src/config/prisma';
import { signToken } from '../src/utils/auth';
import { MAX_AUDIO_SIZE_BYTES } from '../src/schemas/attachment.schemas';
import { removeFile, saveFile } from '../src/services/file-storage.service';

jest.mock('../src/services/file-storage.service', () => ({
  saveFile: jest.fn(),
  removeFile: jest.fn(),
  restoreFile: jest.fn(),
  fileIntegrity: jest.fn().mockResolvedValue(true),
  filePath: jest.fn(),
  imageFilePath: jest.fn()
}));

jest.mock('../src/config/prisma', () => ({
  prisma: {
    task: { findFirst: jest.fn() },
    taskImage: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), delete: jest.fn() },
    taskAudio: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), delete: jest.fn() },
    taskMutation: { findUnique: jest.fn(), create: jest.fn() },
    $transaction: jest.fn()
  }
}));

const user = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'A', email: 'a@example.com' };
const token = signToken(user);
const task = { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', userId: user.id };
const auth = { Authorization: `Bearer ${token}` };
const image = { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', taskId: task.id, url: '/uploads/images/test.jpg', filename: 'test.jpg', mimeType: 'image/jpeg', size: 3 };
const audio = { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', taskId: task.id, url: '/uploads/audios/test.m4a', duration: 2.5, mimeType: 'audio/mp4', size: 3, createdAt: new Date() };

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(prisma.task.findFirst).mockResolvedValue(task as never);
  jest.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(prisma as never));
  jest.mocked(saveFile).mockResolvedValue({ filename: 'stored.jpg', url: '/uploads/images/stored.jpg' });
});

describe('attachments', () => {
  it('rejects unauthenticated image and audio access', async () => {
    expect((await request(app).get(`/api/tasks/${task.id}/images`)).status).toBe(401);
    expect((await request(app).get(`/api/tasks/${task.id}/audios`)).status).toBe(401);
  });

  it('uploads and lists valid image metadata', async () => {
    jest.mocked(prisma.taskImage.create).mockResolvedValue(image as never);
    jest.mocked(prisma.taskImage.findMany).mockResolvedValue([image] as never);
    const upload = await request(app).post(`/api/tasks/${task.id}/images`).set(auth).attach('file', Buffer.from('jpg'), { filename: 'test.jpg', contentType: 'image/jpeg' });
    expect(upload.status).toBe(201);
    expect(upload.body.contentUrl).toBe(`/api/tasks/${task.id}/images/${image.id}/file`);
    const listed = await request(app).get(`/api/tasks/${task.id}/images`).set(auth);
    expect(listed.body).toHaveLength(1);
    expect(listed.body[0].contentUrl).toBe(`/api/tasks/${task.id}/images/${image.id}/file`);
  });

  it('replays image upload by user key and rejects changed content', async () => {
    jest.mocked(prisma.taskImage.create).mockResolvedValue(image as never);
    jest.mocked(prisma.taskMutation.findUnique)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const first = await request(app)
      .post(`/api/tasks/${task.id}/images`)
      .set(auth)
      .set('Idempotency-Key', 'image-1')
      .attach('file', Buffer.from('jpg'), { filename: 'test.jpg', contentType: 'image/jpeg' });
    const record = {
      requestHash: jest.mocked(prisma.taskMutation.create).mock.calls[0]?.[0].data.requestHash,
      responseBody: image
    };
    jest.mocked(prisma.taskMutation.findUnique).mockResolvedValue(record as never);

    const replay = await request(app)
      .post(`/api/tasks/${task.id}/images`)
      .set(auth)
      .set('Idempotency-Key', 'image-1')
      .attach('file', Buffer.from('jpg'), { filename: 'renamed.png', contentType: 'image/png' });
    const mismatch = await request(app)
      .post(`/api/tasks/${task.id}/images`)
      .set(auth)
      .set('Idempotency-Key', 'image-1')
      .attach('file', Buffer.from('different'), { filename: 'test.jpg', contentType: 'image/jpeg' });

    expect(first.status).toBe(201);
    expect(replay.status).toBe(201);
    expect(replay.body.id).toBe(first.body.id);
    expect(replay.body.contentUrl).toBe(`/api/tasks/${task.id}/images/${image.id}/file`);
    expect(mismatch.status).toBe(409);
    expect(mismatch.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
    expect(jest.mocked(prisma.taskImage.create).mock.calls[0]?.[0].data.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(saveFile).toHaveBeenCalledTimes(1);
  });
  it('repairs missing metadata during an idempotent replay without changing identity', async () => {
    const response = { ...image, taskId: task.id, contentHash: 'hash' };
    jest.mocked(prisma.taskMutation.findUnique).mockResolvedValue({
      requestHash: 'placeholder',
      responseBody: response
    } as never);
    jest.mocked(prisma.taskImage.findFirst).mockResolvedValue(null);
    jest.mocked(prisma.taskImage.create).mockResolvedValue(response as never);
    const file = { buffer: Buffer.from('jpg'), originalname: 'test.jpg', mimetype: 'image/jpeg', size: 3 } as Express.Multer.File;
    const hash = createHash('sha256').update(file.buffer).update('\0').update(task.id).digest('hex');
    jest.mocked(prisma.taskMutation.findUnique).mockResolvedValue({ requestHash: hash, responseBody: { ...response, contentHash: hash } } as never);
    await attachmentService.createImage(user.id, task.id, file, 'repair-key');
    expect(prisma.taskImage.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ id: image.id, taskId: task.id, contentHash: hash })
    }));
  });

  it('returns one logical image when same key registers concurrently', async () => {
    const file = {
      buffer: Buffer.from('jpg'),
      originalname: 'test.jpg',
      mimetype: 'image/jpeg',
      size: 3
    } as Express.Multer.File;
    let record: { requestHash: string; responseBody: typeof image } | undefined;
    jest.mocked(prisma.taskImage.create).mockResolvedValue(image as never);
    jest.mocked(prisma.taskMutation.findUnique).mockImplementation((async () => record) as never);
    jest.mocked(prisma.taskMutation.create).mockImplementation((async ({ data }: { data: { requestHash: string } }) => {
      if (record) throw Object.assign(new Error('duplicate key'), { code: 'P2002' });
      record = { requestHash: data.requestHash, responseBody: image };
      return record;
    }) as never);

    const [first, second] = await Promise.all([
      attachmentService.createImage(user.id, task.id, file, 'concurrent-image'),
      attachmentService.createImage(user.id, task.id, file, 'concurrent-image')
    ]);

    expect((first as typeof image).id).toBe(image.id);
    expect((second as typeof image).id).toBe(image.id);
    expect(prisma.taskMutation.create).toHaveBeenCalledTimes(2);
    expect(removeFile).toHaveBeenCalledWith('/uploads/images/stored.jpg');
  });

  it('cleans stored image when metadata registration fails', async () => {
    jest.mocked(prisma.taskImage.create).mockRejectedValueOnce(new Error('db unavailable'));
    const response = await request(app)
      .post(`/api/tasks/${task.id}/images`)
      .set(auth)
      .attach('file', Buffer.from('jpg'), { filename: 'test.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(500);
    expect(removeFile).toHaveBeenCalledWith('/uploads/images/stored.jpg');
  });

  it('validates idempotency key and task ownership before storage', async () => {
    const invalid = await request(app)
      .post(`/api/tasks/${task.id}/images`)
      .set(auth)
      .set('Idempotency-Key', ' ')
      .attach('file', Buffer.from('jpg'), { filename: 'test.jpg', contentType: 'image/jpeg' });
    jest.mocked(prisma.task.findFirst).mockResolvedValue(null);
    const foreign = await request(app)
      .post(`/api/tasks/${task.id}/images`)
      .set(auth)
      .set('Idempotency-Key', 'image-foreign')
      .attach('file', Buffer.from('jpg'), { filename: 'test.jpg', contentType: 'image/jpeg' });

    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('INVALID_IDEMPOTENCY_KEY');
    expect(foreign.status).toBe(404);
    expect(saveFile).not.toHaveBeenCalled();
    expect(prisma.taskMutation.findUnique).not.toHaveBeenCalled();
  });

  it('rejects invalid image mime and missing task', async () => {
    expect((await request(app).post(`/api/tasks/${task.id}/images`).set(auth).attach('file', Buffer.from('x'), { filename: 'x.txt', contentType: 'text/plain' })).status).toBe(400);
    jest.mocked(prisma.task.findFirst).mockResolvedValue(null);
    expect((await request(app).post(`/api/tasks/${task.id}/images`).set(auth).attach('file', Buffer.from('x'), { filename: 'x.jpg', contentType: 'image/jpeg' })).status).toBe(404);
  });

  it('deletes image metadata and rejects foreign resource', async () => {
    jest.mocked(prisma.taskImage.findFirst).mockResolvedValue(image as never);
    expect((await request(app).delete(`/api/tasks/${task.id}/images/${image.id}`).set(auth)).status).toBe(204);
    jest.mocked(prisma.taskImage.findFirst).mockResolvedValue(null);
    expect((await request(app).delete(`/api/tasks/${task.id}/images/${image.id}`).set(auth)).status).toBe(404);
  });

  it('uploads audio with fractional seconds', async () => {
    jest.mocked(prisma.taskAudio.create).mockResolvedValue(audio as never);
    const upload = await request(app).post(`/api/tasks/${task.id}/audios`).set(auth).field('duration', '2.5').attach('file', Buffer.from('m4a'), { filename: 'test.m4a', contentType: 'audio/mp4' });
    expect(upload.status).toBe(201);
    expect(jest.mocked(prisma.taskAudio.create).mock.calls[0]?.[0].data.duration).toBe(2.5);
  });
  it.each([
    ['zero', '0'],
    ['negative', '-1'],
    ['NaN', 'NaN'],
    ['Infinity', 'Infinity'],
    ['too long', '3601']
  ])('rejects %s duration', async (_label, duration) => {
    const response = await request(app).post(`/api/tasks/${task.id}/audios`).set(auth).field('duration', duration).attach('file', Buffer.from('m4a'), { filename: 'test.m4a', contentType: 'audio/mp4' });
    expect(response.status).toBe(400);
    expect(prisma.taskAudio.create).not.toHaveBeenCalled();
  });

  it('rejects unsupported audio MIME and oversized files', async () => {
    expect((await request(app).post(`/api/tasks/${task.id}/audios`).set(auth).field('duration', '2').attach('file', Buffer.from('x'), { filename: 'test.ogg', contentType: 'audio/ogg' })).status).toBe(400);
    const oversized = Buffer.alloc(MAX_AUDIO_SIZE_BYTES + 1);
    expect((await request(app).post(`/api/tasks/${task.id}/audios`).set(auth).field('duration', '2').attach('file', oversized, { filename: 'large.m4a', contentType: 'audio/mp4' })).status).toBe(400);
  });

  it('requires an audio file', async () => {
    expect((await request(app).post(`/api/tasks/${task.id}/audios`).set(auth).field('duration', '2')).status).toBe(400);
  });

  it('rejects audio access and upload for a foreign task', async () => {
    jest.mocked(prisma.task.findFirst).mockResolvedValue(null);
    expect((await request(app).post(`/api/tasks/${task.id}/audios`).set(auth).field('duration', '2').attach('file', Buffer.from('m4a'), { filename: 'test.m4a', contentType: 'audio/mp4' })).status).toBe(404);
    expect((await request(app).get(`/api/tasks/${task.id}/audios`).set(auth)).status).toBe(404);
  });

  it('lists and deletes audio metadata', async () => {
    jest.mocked(prisma.taskAudio.findMany).mockResolvedValue([audio] as never);
    jest.mocked(prisma.taskAudio.findFirst).mockResolvedValue(audio as never);
    expect((await request(app).get(`/api/tasks/${task.id}/audios`).set(auth)).status).toBe(200);
    expect((await request(app).delete(`/api/tasks/${task.id}/audios/${audio.id}`).set(auth)).status).toBe(204);
  });

  it('rejects deleting an audio that does not belong to the task', async () => {
    jest.mocked(prisma.taskAudio.findFirst).mockResolvedValue(null);
    expect((await request(app).delete(`/api/tasks/${task.id}/audios/${audio.id}`).set(auth)).status).toBe(404);
  });
});
