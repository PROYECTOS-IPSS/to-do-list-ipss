import request from 'supertest';
import { app } from '../src/server';
import { prisma } from '../src/config/prisma';
import { signToken } from '../src/utils/auth';
import { MAX_AUDIO_SIZE_BYTES } from '../src/schemas/attachment.schemas';

jest.mock('../src/config/prisma', () => ({
  prisma: {
    task: { findFirst: jest.fn() },
    taskImage: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), delete: jest.fn() },
    taskAudio: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), delete: jest.fn() }
  }
}));

const user = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'A', email: 'a@example.com' };
const token = signToken(user);
const task = { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', userId: user.id };
const auth = { Authorization: `Bearer ${token}` };
const image = { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', taskId: task.id, url: '/uploads/images/test.jpg', filename: 'test.jpg', mimeType: 'image/jpeg', size: 3 };
const audio = { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', taskId: task.id, url: '/uploads/audios/test.m4a', duration: 2.5, mimeType: 'audio/mp4', size: 3, createdAt: new Date() };

beforeEach(() => { jest.clearAllMocks(); jest.mocked(prisma.task.findFirst).mockResolvedValue(task as never); });

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
    expect((await request(app).get(`/api/tasks/${task.id}/images`).set(auth)).body).toHaveLength(1);
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
