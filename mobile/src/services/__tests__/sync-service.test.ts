jest.mock('../local-tasks', () => ({ getTaskStore: jest.fn() }));
import { retryDelayMs, syncService } from '../sync-service';

describe('sync retry policy', () => {
  it('uses bounded exponential delays and caps Retry-After', () => {
    expect(retryDelayMs(1)).toBe(1_000);
    expect(retryDelayMs(3)).toBe(4_000);
    expect(retryDelayMs(3, 5_000)).toBe(5_000);
    expect(retryDelayMs(3, 60_000)).toBe(30_000);
  });

  it('never starts network sync in local access mode', async () => {
    await expect(syncService.run('owner-a', null, 'local')).resolves.toEqual({ attempted: 0, confirmed: 0, failed: 0, conflicts: 0, review: 0 });
  });
});
