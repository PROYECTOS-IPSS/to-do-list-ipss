const mockStorage = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    clear: async () => mockStorage.clear(),
    getItem: async (key: string) => mockStorage.get(key) ?? null,
    setItem: async (key: string, value: string) => { mockStorage.set(key, value); }
  }
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultTaskFilter, preferences } from '../preferences';

describe('task filter preference', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('defaults missing and invalid values to pending', async () => {
    expect(await preferences.getTaskFilter()).toBe(defaultTaskFilter);
    await AsyncStorage.setItem('task-manager-selected-task-filter', 'invalid');
    expect(await preferences.getTaskFilter()).toBe('pending');
  });

  it('preserves valid explicit selection', async () => {
    await preferences.setTaskFilter('completed');
    expect(await preferences.getTaskFilter()).toBe('completed');
  });
});
