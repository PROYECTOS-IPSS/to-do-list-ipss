import { createTaskSchema } from '../src/schemas/task.schemas';

describe('ETAPA4 location validation', () => {
  const base = { title: 'Location task' };
  it('accepts valid coordinates', () => expect(createTaskSchema.safeParse({ ...base, latitude: 40.4, longitude: -3.7, locationAccuracy: 10, locationTimestamp: new Date().toISOString() }).success).toBe(true));
  it('rejects invalid latitude', () => expect(createTaskSchema.safeParse({ ...base, latitude: 91 }).success).toBe(false));
  it('rejects invalid longitude', () => expect(createTaskSchema.safeParse({ ...base, longitude: -181 }).success).toBe(false));
  it('rejects invalid accuracy', () => expect(createTaskSchema.safeParse({ ...base, locationAccuracy: -1 }).success).toBe(false));
  it('rejects invalid timestamp', () => expect(createTaskSchema.safeParse({ ...base, locationTimestamp: 'invalid' }).success).toBe(false));
});
