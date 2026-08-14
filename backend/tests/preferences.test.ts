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
    storage.getItem.mockRejectedValue(new Error('storage unavailable'));
    storage.setItem.mockRejectedValue(new Error('storage unavailable'));

    await expect(preferences.getTaskFilter()).resolves.toBe(defaultTaskFilter);
    await expect(preferences.setTaskFilter('active')).resolves.toBeUndefined();
  });

  it('rejects invalid stored values to the default', async () => {
    storage.getItem.mockResolvedValue('jwt');
    await expect(preferences.getTaskFilter()).resolves.toBe(defaultTaskFilter);
  });
});
