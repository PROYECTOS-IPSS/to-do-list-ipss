jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn()
}), { virtual: true });

import { defaultTaskFilter, preferences } from '../../mobile/src/services/preferences';

const storage = jest.requireMock('@react-native-async-storage/async-storage') as { getItem: jest.Mock; setItem: jest.Mock };

describe('local task filter preferences', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns default when no preference exists', async () => {
    storage.getItem.mockResolvedValue(null);
    await expect(preferences.getTaskFilter()).resolves.toBe(defaultTaskFilter);
  });

  it('stores and restores a valid filter', async () => {
    storage.setItem.mockResolvedValue(undefined);
    storage.getItem.mockResolvedValue('completed');

    await preferences.setTaskFilter('completed');

    expect(storage.setItem).toHaveBeenCalledWith('task-manager-selected-task-filter', 'completed');
    await expect(preferences.getTaskFilter()).resolves.toBe('completed');
  });

  it('uses default and does not crash when storage fails', async () => {
    const readError = new Error('storage unavailable');
    const saveError = new Error('storage unavailable');
    storage.getItem.mockRejectedValue(readError);
    storage.setItem.mockRejectedValue(saveError);
    const originalWarn = console.warn;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
      const [message, error] = args;
      const expected = (message === '[preferences] unable to read task filter' && error === readError)
        || (message === '[preferences] unable to save task filter' && error === saveError);
      if (!expected) originalWarn(...args);
    });
    try {
      await expect(preferences.getTaskFilter()).resolves.toBe(defaultTaskFilter);
      await expect(preferences.setTaskFilter('active')).resolves.toBeUndefined();
      expect(warnSpy).toHaveBeenCalledTimes(2);
      expect(warnSpy).toHaveBeenNthCalledWith(1, '[preferences] unable to read task filter', readError);
      expect(warnSpy).toHaveBeenNthCalledWith(2, '[preferences] unable to save task filter', saveError);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('rejects invalid stored values to the default', async () => {
    storage.getItem.mockResolvedValue('jwt');
    await expect(preferences.getTaskFilter()).resolves.toBe(defaultTaskFilter);
  });
});
