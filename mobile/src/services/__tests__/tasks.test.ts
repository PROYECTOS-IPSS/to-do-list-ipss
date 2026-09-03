import { parseRetryAfterMs } from '../tasks';

describe('Retry-After parsing', () => {
  it('parses delta seconds and HTTP dates without negative delays', () => {
    const now = Date.parse('2026-01-01T00:00:00.000Z');
    expect(parseRetryAfterMs('2', now)).toBe(2_000);
    expect(parseRetryAfterMs('2026-01-01T00:00:03.000Z', now)).toBe(3_000);
    expect(parseRetryAfterMs('2025-12-31T23:59:59.000Z', now)).toBe(0);
    expect(parseRetryAfterMs('invalid', now)).toBeUndefined();
  });
});
