import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../src/server';
import { prisma } from '../src/config/prisma';
import { signToken } from '../src/utils/auth';

jest.mock('../src/config/prisma', () => ({
  prisma: {
    user: { create: jest.fn(), findUnique: jest.fn() },
    task: { findFirst: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn() }
  }
}));

const userA = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'User A', email: 'a@example.com' };
const userB = { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', name: 'User B', email: 'b@example.com' };
const hash = '$2b$12$LQv3c1yqBWf3uYx0K6XwHeJ7Yf2d5L6R4f6X2gZ1xM7yN8pQ9rT0u';
const taskB = { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', userId: userB.id };

beforeEach(() => jest.clearAllMocks());

describe('Authentication', () => {
  it('registers without exposing passwordHash', async () => {
    jest.mocked(prisma.user.create).mockResolvedValue({ ...userA, passwordHash: hash } as never);
    const response = await request(app).post('/api/auth/register').send({ name: userA.name, email: userA.email, password: 'password123' });
    expect(response.status).toBe(201);
    expect(response.body.user.passwordHash).toBeUndefined();
    expect(response.body.token).toEqual(expect.any(String));
    expect(jest.mocked(prisma.user.create).mock.calls[0]?.[0].data.passwordHash).not.toBe('password123');
  });

  it('rejects invalid registration input', async () => {
    const response = await request(app).post('/api/auth/register').send({ name: '', email: 'invalid', password: 'short' });
    expect(response.status).toBe(400);
  });

  it('returns 409 for duplicate email', async () => {
    jest.mocked(prisma.user.create).mockRejectedValue({ code: 'P2002' });
    const response = await request(app).post('/api/auth/register').send({ name: 'User', email: 'a@example.com', password: 'password123' });
    expect(response.status).toBe(409);
  });

  it('logs in with valid credentials', async () => {
    jest.mocked(prisma.user.findUnique).mockResolvedValue({ ...userA, passwordHash: await bcrypt.hash('password123', 4) } as never);
    const response = await request(app).post('/api/auth/login').send({ email: userA.email, password: 'password123' });
    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user.passwordHash).toBeUndefined();
  });

  it('rejects invalid credentials', async () => {
    jest.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const response = await request(app).post('/api/auth/login').send({ email: userA.email, password: 'password123' });
    expect(response.status).toBe(401);
  });

  it('returns current user for valid JWT', async () => {
    jest.mocked(prisma.user.findUnique).mockResolvedValue({ ...userA, passwordHash: hash } as never);
    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${signToken(userA)}`);
    expect(response.status).toBe(200);
    expect(response.body.passwordHash).toBeUndefined();
  });

  it('rejects missing, invalid, and manipulated JWTs', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set('Authorization', 'Bearer invalid')).status).toBe(401);
    const token = signToken(userA);
    const manipulated = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;
    expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${manipulated}`)).status).toBe(401);
  });
  it('rejects expired JWTs', async () => {
    const expired = jwt.sign({ sub: userA.id }, process.env.JWT_SECRET as string, { expiresIn: -1 });
    expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`)).status).toBe(401);
  });
});

describe('Task authorization', () => {
  const tokenA = () => signToken(userA);

  it('prevents User A from reading, updating, or deleting User B task', async () => {
    jest.mocked(prisma.task.findFirst).mockResolvedValue(null);
    jest.mocked(prisma.task.updateMany).mockResolvedValue({ count: 0 } as never);
    jest.mocked(prisma.task.deleteMany).mockResolvedValue({ count: 0 } as never);
    const auth = { Authorization: `Bearer ${tokenA()}` };
    expect((await request(app).get(`/api/tasks/${taskB.id}`).set(auth)).status).toBe(404);
    expect((await request(app).patch(`/api/tasks/${taskB.id}`).set(auth).send({ completed: true })).status).toBe(404);
    expect((await request(app).delete(`/api/tasks/${taskB.id}`).set(auth)).status).toBe(404);
  });

  it('rejects task access without JWT', async () => {
    expect((await request(app).get('/api/tasks')).status).toBe(401);
  });
});
