import { createTaskSchema, MAX_LOCATION_ACCURACY_METERS, updateTaskSchema } from '../src/schemas/task.schemas';

const base = { title: 'Location task' };
const validLocation = {
  latitude: 40.4,
  longitude: -3.7,
  locationAccuracy: 10,
  locationTimestamp: new Date().toISOString()
};

describe('ETAPA5 location validation', () => {
  it('accepts tasks with and without location', () => {
    expect(createTaskSchema.safeParse(base).success).toBe(true);
    expect(createTaskSchema.safeParse({ ...base, ...validLocation }).success).toBe(true);
  });

  it.each([
    ['latitude below -90', { latitude: -90.001 }],
    ['latitude above 90', { latitude: 90.001 }],
    ['longitude below -180', { longitude: -180.001 }],
    ['longitude above 180', { longitude: 180.001 }],
    ['negative accuracy', { locationAccuracy: -1 }],
    ['accuracy above configured threshold', { locationAccuracy: MAX_LOCATION_ACCURACY_METERS + 0.01 }],
    ['invalid timestamp', { locationTimestamp: 'invalid' }]
  ])('rejects %s', (_caseName, invalidField) => {
    expect(createTaskSchema.safeParse({ ...base, ...validLocation, ...invalidField }).success).toBe(false);
  });

  it('accepts accuracy equal to zero', () => {
    expect(createTaskSchema.safeParse({ ...base, ...validLocation, locationAccuracy: 0 }).success).toBe(true);
  });

  it.each([
    ['NaN accuracy', Number.NaN],
    ['infinite accuracy', Number.POSITIVE_INFINITY]
  ])('rejects %s', (_caseName, locationAccuracy) => {
    expect(createTaskSchema.safeParse({ ...base, ...validLocation, locationAccuracy }).success).toBe(false);
  });

  it('requires all location fields together', () => {
    expect(createTaskSchema.safeParse({ ...base, latitude: validLocation.latitude }).success).toBe(false);
    expect(updateTaskSchema.safeParse({ latitude: validLocation.latitude }).success).toBe(false);
  });

  it('allows removing a location with all nullable fields', () => {
    expect(updateTaskSchema.safeParse({ latitude: null, longitude: null, locationAccuracy: null, locationTimestamp: null }).success).toBe(true);
  });
});
