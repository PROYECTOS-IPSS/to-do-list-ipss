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
const location = {
  latitude: 40.4,
  longitude: -3.7,
  locationAccuracy: 12,
  locationTimestamp: '2026-08-14T12:00:00.000Z'
};
const auth = { Authorization: `Bearer ${token}` };

beforeEach(() => jest.clearAllMocks());

describe('Task CRUD', () => {
  it('creates valid task without location', async () => {
    jest.mocked(prisma.task.create).mockResolvedValue(task as never);
    const response = await request(app).post('/api/tasks').set(auth).send({ title: 'Test task' });
    expect(response.status).toBe(201);
  });

  it('creates a task with a complete location', async () => {
    jest.mocked(prisma.task.create).mockResolvedValue({ ...task, ...location } as never);
    const response = await request(app).post('/api/tasks').set(auth).send({ title: 'Located task', ...location });
    expect(response.status).toBe(201);
    expect(jest.mocked(prisma.task.create).mock.calls[0]?.[0].data).toEqual(expect.objectContaining({
      latitude: location.latitude,
      longitude: location.longitude,
      locationAccuracy: location.locationAccuracy,
      locationTimestamp: expect.any(Date)
    }));
  });

  it('rejects partial location data', async () => {
    const response = await request(app).post('/api/tasks').set(auth).send({ title: 'Incomplete location', latitude: location.latitude });
    expect(response.status).toBe(400);
    expect(prisma.task.create).not.toHaveBeenCalled();
  });

  it('rejects invalid task data', async () => {
    const response = await request(app).post('/api/tasks').set(auth).send({ title: '' });
    expect(response.status).toBe(400);
  });

  it('lists tasks', async () => {
    jest.mocked(prisma.task.findMany).mockResolvedValue([task] as never);
    const response = await request(app).get('/api/tasks').set(auth);
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });

  it('gets task with location', async () => {
    jest.mocked(prisma.task.findFirst).mockResolvedValue({ ...task, ...location } as never);
    const response = await request(app).get(`/api/tasks/${task.id}`).set(auth);
    expect(response.status).toBe(200);
    expect(response.body.latitude).toBe(location.latitude);
    expect(response.body.locationTimestamp).toBe(location.locationTimestamp);
  });

  it('updates task location', async () => {
    jest.mocked(prisma.task.updateMany).mockResolvedValue({ count: 1 } as never);
    jest.mocked(prisma.task.findFirst).mockResolvedValue({ ...task, ...location } as never);
    const response = await request(app).patch(`/api/tasks/${task.id}`).set(auth).send(location);
    expect(response.status).toBe(200);
    expect(jest.mocked(prisma.task.updateMany).mock.calls[0]?.[0].data).toEqual(expect.objectContaining({
      latitude: location.latitude,
      longitude: location.longitude,
      locationAccuracy: location.locationAccuracy,
      locationTimestamp: expect.any(Date)
    }));
  });

  it('removes task location', async () => {
    jest.mocked(prisma.task.updateMany).mockResolvedValue({ count: 1 } as never);
    jest.mocked(prisma.task.findFirst).mockResolvedValue(task as never);
    const response = await request(app).patch(`/api/tasks/${task.id}`).set(auth).send({ latitude: null, longitude: null, locationAccuracy: null, locationTimestamp: null });
    expect(response.status).toBe(200);
    expect(jest.mocked(prisma.task.updateMany).mock.calls[0]?.[0].data).toEqual({ latitude: null, longitude: null, locationAccuracy: null, locationTimestamp: null });
  });

  it('updates task fields without changing location payload', async () => {
    jest.mocked(prisma.task.updateMany).mockResolvedValue({ count: 1 } as never);
    jest.mocked(prisma.task.findFirst).mockResolvedValue(task as never);
    const response = await request(app).patch(`/api/tasks/${task.id}`).set(auth).send({ completed: true });
    expect(response.status).toBe(200);
    expect(jest.mocked(prisma.task.updateMany).mock.calls[0]?.[0].data).toEqual({ completed: true });
  });

  it('deletes task and cleans attachment paths', async () => {
    jest.mocked(prisma.task.findFirst).mockResolvedValue({ images: [], audios: [] } as never);
    jest.mocked(prisma.task.deleteMany).mockResolvedValue({ count: 1 } as never);
    const response = await request(app).delete(`/api/tasks/${task.id}`).set(auth);
    expect(response.status).toBe(204);
  });

  it('returns 404 for missing task', async () => {
    jest.mocked(prisma.task.findFirst).mockResolvedValue(null);
    const response = await request(app).get(`/api/tasks/${task.id}`).set(auth);
    expect(response.status).toBe(404);
  });
});
