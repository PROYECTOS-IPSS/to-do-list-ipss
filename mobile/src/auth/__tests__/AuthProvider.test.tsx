import { act, render } from '@testing-library/react-native';
import { useAuth, AuthProvider, type AuthContextValue } from '../AuthProvider';
import { AuthHttpError, authApi, type User } from '../../services/auth';

jest.mock('../../services/auth', () => {
  class MockAuthHttpError extends Error {
    readonly statusCode: number;
    readonly code: string | undefined;
    constructor(mockStatusCode: number, mockCode: string | undefined, mockMessage: string) {
      super(mockMessage);
      this.statusCode = mockStatusCode;
      this.code = mockCode;
    }
  }
  return {
    AuthHttpError: MockAuthHttpError,
    authApi: {
      getToken: jest.fn(),
      me: jest.fn(),
      clearToken: jest.fn(),
      clearLocalIdentity: jest.fn(),
      getLocalIdentity: jest.fn(),
      saveLocalIdentity: jest.fn(),
      login: jest.fn(),
      register: jest.fn(),
      saveToken: jest.fn()
    }
  };
});

const user: User = { id: 'user-1', name: 'Ana', email: 'ana@example.com' };
let context: AuthContextValue | undefined;

function Consumer() {
  context = useAuth();
  return null;
}

async function mount() {
  return render(<AuthProvider><Consumer /></AuthProvider>);
}

const unmount = async (renderer: Awaited<ReturnType<typeof mount>>) => { await renderer.unmount(); };

async function settle() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

function currentContext(): AuthContextValue {
  if (!context) throw new Error('Auth provider has not rendered.');
  return context;
}

describe('AuthProvider session restoration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    context = undefined;
    jest.mocked(authApi.getToken).mockResolvedValue(null);
    jest.mocked(authApi.getLocalIdentity).mockResolvedValue(null);
    jest.mocked(authApi.clearToken).mockResolvedValue(undefined);
    jest.mocked(authApi.clearLocalIdentity).mockResolvedValue(undefined);
    jest.mocked(authApi.saveLocalIdentity).mockResolvedValue(undefined);
  });

  it('finishes without a session when SecureStore has no token', async () => {
    const renderer = await mount()
    await settle();

    expect(currentContext().loading).toBe(false);
    expect(currentContext().user).toBeNull();
    expect(currentContext().token).toBeNull();
    expect(currentContext().restoreError).toBeNull();
    await unmount(renderer);
  });

  it('restores a valid token and user', async () => {
    jest.mocked(authApi.getToken).mockResolvedValue('stored-token');
    jest.mocked(authApi.me).mockResolvedValue(user);
    const renderer = await mount()
    await settle();

    expect(currentContext().user).toEqual(user);
    expect(currentContext().token).toBe('stored-token');
    expect(currentContext().restoreError).toBeNull();
    expect(currentContext().loading).toBe(false);
    await unmount(renderer);
  });

  it('clears an unequivocally invalid session', async () => {
    jest.mocked(authApi.getToken).mockResolvedValue('expired-token');
    jest.mocked(authApi.me).mockRejectedValue(new AuthHttpError(401, 'UNAUTHORIZED', 'Invalid session'));
    const renderer = await mount()
    await settle();

    expect(authApi.clearToken).toHaveBeenCalledTimes(1);
    expect(currentContext().token).toBeNull();
    expect(currentContext().user).toBeNull();
    expect(currentContext().restoreError).toBeNull();
    await unmount(renderer);
  });

  it.each([
    ['network failure', new Error('network down')],
    ['server failure', new AuthHttpError(503, 'TEMPORARY_FAILURE', 'Unavailable')],
    ['malformed response', new Error('Server returned malformed JSON.')]
  ])('keeps recoverable %s out of authenticated state', async (_label, error) => {
    jest.mocked(authApi.getToken).mockResolvedValue('stored-token');
    jest.mocked(authApi.me).mockRejectedValue(error);
    const renderer = await mount()
    await settle();

    expect(authApi.clearToken).not.toHaveBeenCalled();
    expect(currentContext().token).toBeNull();
    expect(currentContext().user).toBeNull();
    expect(currentContext().restoreError).toMatch(/problema temporal/);
    expect(currentContext().loading).toBe(false);
    await unmount(renderer);
  });

  it('retries a temporary failure and restores the session', async () => {
    jest.mocked(authApi.getToken).mockResolvedValue('stored-token');
    jest.mocked(authApi.me).mockRejectedValueOnce(new Error('network down')).mockResolvedValueOnce(user);
    const renderer = await mount()
    await settle();

    await act(async () => { await currentContext().retryRestore(); });
    expect(jest.mocked(authApi.me)).toHaveBeenCalledTimes(2);
    expect(currentContext().user).toEqual(user);
    expect(currentContext().token).toBe('stored-token');
    expect(currentContext().restoreError).toBeNull();
    await unmount(renderer);
  });

  it('shows a controlled error when SecureStore read fails', async () => {
    jest.mocked(authApi.getToken).mockRejectedValue(new Error('SecureStore unavailable'));
    const renderer = await mount()
    await settle();

    expect(currentContext().loading).toBe(false);
    expect(currentContext().restoreError).toMatch(/leer la sesión/);
    expect(currentContext().user).toBeNull();
    await unmount(renderer);
  });

  it('does not authenticate when clearing an invalid token fails', async () => {
    jest.mocked(authApi.getToken).mockResolvedValue('expired-token');
    jest.mocked(authApi.me).mockRejectedValue(new AuthHttpError(401, 'UNAUTHORIZED', 'Invalid session'));
    jest.mocked(authApi.clearToken).mockRejectedValue(new Error('SecureStore unavailable'));
    const renderer = await mount()
    await settle();

    expect(currentContext().user).toBeNull();
    expect(currentContext().restoreError).toMatch(/invalidar la sesión/);
    expect(currentContext().loading).toBe(false);
    await unmount(renderer);
  });

  it('ignores a pending restoration after logout', async () => {
    jest.mocked(authApi.getToken).mockResolvedValue('stored-token');
    let resolveUser: (value: User) => void = () => undefined;
    jest.mocked(authApi.me).mockReturnValueOnce(new Promise<User>((resolve) => { resolveUser = resolve; }));
    const renderer = await mount()
    await settle();

    await act(async () => { await currentContext().logout(); });
    resolveUser(user);
    await settle();

    expect(currentContext().user).toBeNull();
    expect(currentContext().token).toBeNull();
    await unmount(renderer);
  });

  it('does not update provider after unmount during restoration', async () => {
    jest.mocked(authApi.getToken).mockResolvedValue('late-token');
    let resolveUser: (value: User) => void = () => undefined;
    jest.mocked(authApi.me).mockReturnValueOnce(new Promise<User>((resolve) => { resolveUser = resolve; }));
    const renderer = await mount()
    await settle();
    expect(authApi.me).toHaveBeenCalledWith('late-token');

    await unmount(renderer);
    resolveUser(user);
    await settle();
    expect(currentContext().user).toBeNull();
    expect(currentContext().token).toBeNull();
  });
});
