import request from 'supertest';
import { app } from '../src/server';
import { prisma } from '../src/config/prisma';
import { signToken } from '../src/utils/auth';

jest.mock('../src/config/prisma', () => ({
  prisma: {
    task: {
      create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn()
    }
  }
}));

const user = { id: '00000000-0000-4000-8000-000000000001', name: 'Test User', email: 'test@example.com' };
const token = signToken(user);
const task = {
  id: '11111111-1111-4111-8111-111111111111', userId: user.id, title: 'Test task', description: null,
  completed: false, latitude: null, longitude: null, locationAccuracy: null, locationTimestamp: null,
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
};
const auth = { Authorization: `Bearer ${token}` };

beforeEach(() => jest.clearAllMocks());

describe('Task CRUD', () => {
  it('creates valid task', async () => { jest.mocked(prisma.task.create).mockResolvedValue(task as never); const response = await request(app).post('/api/tasks').set(auth).send({ title: 'Test task' }); expect(response.status).toBe(201); });
  it('rejects invalid task data', async () => { const response = await request(app).post('/api/tasks').set(auth).send({ title: '' }); expect(response.status).toBe(400); });
  it('lists tasks', async () => { jest.mocked(prisma.task.findMany).mockResolvedValue([task] as never); const response = await request(app).get('/api/tasks').set(auth); expect(response.status).toBe(200); expect(response.body).toHaveLength(1); });
  it('gets task', async () => { jest.mocked(prisma.task.findFirst).mockResolvedValue(task as never); const response = await request(app).get(`/api/tasks/${task.id}`).set(auth); expect(response.status).toBe(200); });
  it('updates task', async () => { jest.mocked(prisma.task.updateMany).mockResolvedValue({ count: 1 } as never); jest.mocked(prisma.task.findFirst).mockResolvedValue({ ...task, completed: true } as never); const response = await request(app).patch(`/api/tasks/${task.id}`).set(auth).send({ completed: true }); expect(response.status).toBe(200); });
  it('deletes task', async () => { jest.mocked(prisma.task.deleteMany).mockResolvedValue({ count: 1 } as never); const response = await request(app).delete(`/api/tasks/${task.id}`).set(auth); expect(response.status).toBe(204); });
  it('returns 404 for missing task', async () => { jest.mocked(prisma.task.findFirst).mockResolvedValue(null); const response = await request(app).get(`/api/tasks/${task.id}`).set(auth); expect(response.status).toBe(404); });
});
