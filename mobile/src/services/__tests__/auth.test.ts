import { authApi, AuthHttpError } from '../auth';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn()
}));

const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('authApi response classification', () => {
  it('parses a valid session response', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 'u1', name: 'Ana', email: 'ana@example.com' }), { status: 200 }));

    await expect(authApi.me('token')).resolves.toEqual({ id: 'u1', name: 'Ana', email: 'ana@example.com' });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/auth/me'), expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token' }) }));
  });

  it('preserves HTTP status and code for invalid sessions', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid session.' } }), { status: 401 }));

    await expect(authApi.me('expired')).rejects.toEqual(expect.objectContaining({ statusCode: 401, code: 'UNAUTHORIZED' } satisfies Partial<AuthHttpError>));
  });

  it('rejects malformed successful responses', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 'u1', name: 'Ana' }), { status: 200 }));

    await expect(authApi.me('token')).rejects.toMatchObject({ name: 'ZodError' });
  });

  it('keeps network errors as recoverable transport failures', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));

    await expect(authApi.me('token')).rejects.toThrow('Network request failed');
  });
});
