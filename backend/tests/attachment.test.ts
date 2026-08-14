import request from 'supertest';
import { app } from '../src/server';
import { prisma } from '../src/config/prisma';
import { signToken } from '../src/utils/auth';

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
const audio = { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', taskId: task.id, url: '/uploads/audios/test.m4a', filename: 'test.m4a', mimeType: 'audio/mp4', size: 3, duration: 2 };

beforeEach(() => { jest.clearAllMocks(); jest.mocked(prisma.task.findFirst).mockResolvedValue(task as never); });

describe('ETAPA4 attachments', () => {
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
    expect((await request(app).post(`/api/tasks/${task.id}/images`).set(auth).attach('file', Buffer.from('x'), { filename: 'x.txt', contentType: 'text/plain' })).status).toBe(500);
    jest.mocked(prisma.task.findFirst).mockResolvedValue(null);
    expect((await request(app).post(`/api/tasks/${task.id}/images`).set(auth).attach('file', Buffer.from('x'), { filename: 'x.jpg', contentType: 'image/jpeg' })).status).toBe(404);
  });

  it('deletes image metadata and rejects foreign resource', async () => {
    jest.mocked(prisma.taskImage.findFirst).mockResolvedValue(image as never);
    expect((await request(app).delete(`/api/tasks/${task.id}/images/${image.id}`).set(auth)).status).toBe(204);
    jest.mocked(prisma.taskImage.findFirst).mockResolvedValue(null);
    expect((await request(app).delete(`/api/tasks/${task.id}/images/${image.id}`).set(auth)).status).toBe(404);
  });

  it('uploads audio with valid duration and rejects invalid duration', async () => {
    jest.mocked(prisma.taskAudio.create).mockResolvedValue(audio as never);
    const upload = await request(app).post(`/api/tasks/${task.id}/audios`).set(auth).field('duration', '2').attach('file', Buffer.from('m4a'), { filename: 'test.m4a', contentType: 'audio/mp4' });
    expect(upload.status).toBe(201);
    expect((await request(app).post(`/api/tasks/${task.id}/audios`).set(auth).field('duration', '-1').attach('file', Buffer.from('m4a'), { filename: 'test.m4a', contentType: 'audio/mp4' })).status).toBe(400);
  });

  it('lists and deletes audio metadata', async () => {
    jest.mocked(prisma.taskAudio.findMany).mockResolvedValue([audio] as never);
    jest.mocked(prisma.taskAudio.findFirst).mockResolvedValue(audio as never);
    expect((await request(app).get(`/api/tasks/${task.id}/audios`).set(auth)).status).toBe(200);
    expect((await request(app).delete(`/api/tasks/${task.id}/audios/${audio.id}`).set(auth)).status).toBe(204);
  });
});
