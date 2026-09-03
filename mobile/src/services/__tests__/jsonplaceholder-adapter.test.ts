import { fetchJsonPlaceholderTodos, JsonPlaceholderCancelledError, JsonPlaceholderHttpError, JsonPlaceholderResponseTooLargeError, JsonPlaceholderTimeoutError, JsonPlaceholderValidationError, JSONPLACEHOLDER_TODOS_URL } from '../jsonplaceholder-adapter';

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const good = { userId: 1, id: 1, title: 'one', completed: false };

describe('JSONPlaceholder adapter', () => {
  it('transforms valid records with stable provenance and no description fabrication', async () => {
    const fetchFn = jest.fn().mockResolvedValue(reply([good]));
    await expect(fetchJsonPlaceholderTodos({ fetchFn })).resolves.toMatchObject({ records: [{ provider: 'jsonplaceholder', providerName: 'JSONPlaceholder', externalId: '1', title: 'one', completed: false, description: null }], rejectedCount: 0 });
    expect(fetchFn).toHaveBeenCalledWith(JSONPLACEHOLDER_TODOS_URL, expect.objectContaining({ headers: { Accept: 'application/json' } }));
    expect(fetchFn.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
  });

  it('accepts valid mixed records, rejects invalid ones, and dedupes ids', async () => {
    const result = await fetchJsonPlaceholderTodos({ fetchFn: jest.fn().mockResolvedValue(reply([good, { ...good, id: 2, title: 'two' }, { id: 'bad' }, { ...good, title: 'duplicate' }])) });
    expect(result.records.map((item) => item.externalId)).toEqual(['1', '2']);
    expect(result.rejectedCount).toBe(2);
    expect(result.duplicateCount).toBe(1);
  });

  it('fails invalid envelope and preserves valid empty response', async () => {
    await expect(fetchJsonPlaceholderTodos({ fetchFn: jest.fn().mockResolvedValue(reply({ todos: [] })) })).rejects.toBeInstanceOf(JsonPlaceholderValidationError);
    await expect(fetchJsonPlaceholderTodos({ fetchFn: jest.fn().mockResolvedValue(reply([])) })).resolves.toMatchObject({ records: [], rejectedCount: 0, truncated: false });
  });

  it('preserves 429 and 5xx status', async () => {
    for (const status of [429, 500, 503]) await expect(fetchJsonPlaceholderTodos({ fetchFn: jest.fn().mockResolvedValue(reply({}, status)) })).rejects.toMatchObject({ status, statusCode: status });
  });

  it('does not turn network errors into empty success', async () => {
    const error = new Error('offline');
    await expect(fetchJsonPlaceholderTodos({ fetchFn: jest.fn().mockRejectedValue(error) })).rejects.toBe(error);
  });

  it('enforces response and display limits', async () => {
    const result = await fetchJsonPlaceholderTodos({ maxRecords: 1, fetchFn: jest.fn().mockResolvedValue(reply([good, { ...good, id: 2 }])) });
    expect(result.records).toHaveLength(1);
    expect(result.truncated).toBe(true);
    await expect(fetchJsonPlaceholderTodos({ maxResponseBytes: 4, fetchFn: jest.fn().mockResolvedValue(reply(good)) })).rejects.toBeInstanceOf(JsonPlaceholderResponseTooLargeError);
  });

  it('maps timeout and caller cancellation', async () => {
    jest.useFakeTimers();
    try {
      const pendingFetch = jest.fn((_url: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true })));
      const timed = fetchJsonPlaceholderTodos({ fetchFn: pendingFetch, timeoutMs: 10 });
      jest.advanceTimersByTime(10);
      await expect(timed).rejects.toBeInstanceOf(JsonPlaceholderTimeoutError);
      const source = new AbortController();
      const cancelled = fetchJsonPlaceholderTodos({ fetchFn: pendingFetch, signal: source.signal });
      source.abort();
      await expect(cancelled).rejects.toBeInstanceOf(JsonPlaceholderCancelledError);
    } finally { jest.useRealTimers(); }
  });

  it('validates option limits', async () => {
    await expect(fetchJsonPlaceholderTodos({ maxRecords: -1 })).rejects.toThrow(RangeError);
    await expect(fetchJsonPlaceholderTodos({ timeoutMs: -1 })).rejects.toThrow(RangeError);
  });
});
