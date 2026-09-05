import { tasksApi, parseRetryAfterMs } from '../tasks';

describe('Retry-After parsing', () => {
  it('parses delta seconds and HTTP dates without negative delays', () => {
    const now = Date.parse('2026-01-01T00:00:00.000Z');
    expect(parseRetryAfterMs('2', now)).toBe(2_000);
    expect(parseRetryAfterMs('2026-01-01T00:00:03.000Z', now)).toBe(3_000);
    expect(parseRetryAfterMs('2025-12-31T23:59:59.000Z', now)).toBe(0);
    expect(parseRetryAfterMs('invalid', now)).toBeUndefined();
  });
});

describe('task request authentication', () => {
  it('preserves Bearer when mutation options include headers', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ id: 'r1' }), { status: 200 }));
    await tasksApi.create('live-token', { title: 'test', description: null, completed: false, latitude: null, longitude: null, locationAccuracy: null, locationTimestamp: null }, 'op-1');
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual(expect.objectContaining({ Authorization: 'Bearer live-token', 'Idempotency-Key': 'op-1' }));
    fetchMock.mockRestore();
  });
});
