import request from 'supertest';
import { app } from '../src/server';
import { prisma } from '../src/config/prisma';
import { signToken } from '../src/utils/auth';

jest.mock('../src/config/prisma', () => ({
  prisma: {
    task: {
      create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn()
    },
    taskMutation: { findUnique: jest.fn(), create: jest.fn() },
    $transaction: jest.fn()
  }
}));

const user = { id: '00000000-0000-4000-8000-000000000001', name: 'Test User', email: 'test@example.com' };
const token = signToken(user);
const task = {
  id: '11111111-1111-4111-8111-111111111111', userId: user.id, title: 'Test task', description: null,
  completed: false, latitude: null, longitude: null, locationAccuracy: null, locationTimestamp: null,
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 0
};
const location = {
  latitude: 40.4,
  longitude: -3.7,
  locationAccuracy: 12,
  locationTimestamp: '2026-08-14T12:00:00.000Z'
};
const auth = { Authorization: `Bearer ${token}` };

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(prisma as never));
});

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
    expect(jest.mocked(prisma.task.updateMany).mock.calls[0]?.[0].data).toEqual({ latitude: null, longitude: null, locationAccuracy: null, locationTimestamp: null, version: { increment: 1 } });
  });

  it('updates task fields without changing location payload', async () => {
    jest.mocked(prisma.task.updateMany).mockResolvedValue({ count: 1 } as never);
    jest.mocked(prisma.task.findFirst).mockResolvedValue(task as never);
    const response = await request(app).patch(`/api/tasks/${task.id}`).set(auth).send({ completed: true });
    expect(response.status).toBe(200);
    expect(jest.mocked(prisma.task.updateMany).mock.calls[0]?.[0].data).toEqual({ completed: true, version: { increment: 1 } });
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
  it('replays duplicate create key without creating a second task', async () => {
    jest.mocked(prisma.task.create).mockResolvedValue(task as never);
    const first = await request(app).post('/api/tasks').set(auth).set('Idempotency-Key', 'create-1').send({ title: 'Test task' });
    const record = {
      requestHash: jest.mocked(prisma.taskMutation.create).mock.calls[0]?.[0].data.requestHash,
      responseBody: task
    };
    jest.mocked(prisma.taskMutation.findUnique).mockResolvedValue(record as never);
    const second = await request(app).post('/api/tasks').set(auth).set('Idempotency-Key', 'create-1').send({ title: 'Test task' });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.id).toBe(first.body.id);
    expect(prisma.task.create).toHaveBeenCalledTimes(1);
  });

  it('rejects idempotency key payload mismatch', async () => {
    jest.mocked(prisma.task.create).mockResolvedValue(task as never);
    await request(app).post('/api/tasks').set(auth).set('Idempotency-Key', 'create-2').send({ title: 'Test task' });
    const record = {
      requestHash: jest.mocked(prisma.taskMutation.create).mock.calls[0]?.[0].data.requestHash,
      responseBody: task
    };
    jest.mocked(prisma.taskMutation.findUnique).mockResolvedValue(record as never);
    const response = await request(app).post('/api/tasks').set(auth).set('Idempotency-Key', 'create-2').send({ title: 'Different task' });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('keeps task ownership and reports stale versions', async () => {
    jest.mocked(prisma.task.updateMany).mockResolvedValue({ count: 0 } as never);
    jest.mocked(prisma.task.findFirst).mockResolvedValue(null);
    const foreign = await request(app).patch(`/api/tasks/${task.id}`).set(auth).set('If-Match', '0').send({ completed: true });
    expect(foreign.status).toBe(404);

    jest.mocked(prisma.task.findFirst).mockResolvedValue({ ...task, version: 1 } as never);
    const stale = await request(app).patch(`/api/tasks/${task.id}`).set(auth).set('If-Match', '0').send({ completed: true });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('TASK_VERSION_CONFLICT');
  });

  it('replays repeated delete with same idempotency key', async () => {
    jest.mocked(prisma.task.findFirst).mockResolvedValue({ version: 0, images: [], audios: [] } as never);
    jest.mocked(prisma.task.deleteMany).mockResolvedValue({ count: 1 } as never);
    jest.mocked(prisma.taskMutation.findUnique).mockResolvedValueOnce(null);
    const first = await request(app).delete(`/api/tasks/${task.id}`).set(auth).set('Idempotency-Key', 'delete-1');
    const record = {
      requestHash: jest.mocked(prisma.taskMutation.create).mock.calls[0]?.[0].data.requestHash,
      responseBody: null
    };
    jest.mocked(prisma.taskMutation.findUnique).mockResolvedValue(record as never);
    const second = await request(app).delete(`/api/tasks/${task.id}`).set(auth).set('Idempotency-Key', 'delete-1');
    expect(first.status).toBe(204);
    expect(second.status).toBe(204);
    expect(prisma.task.deleteMany).toHaveBeenCalledTimes(1);
  });
});
