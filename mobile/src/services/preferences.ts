import AsyncStorage from '@react-native-async-storage/async-storage';

export type TaskFilter = 'all' | 'active' | 'completed';

const taskFilterKey = 'task-manager-selected-task-filter';
const defaultTaskFilter: TaskFilter = 'all';

const isTaskFilter = (value: string | null): value is TaskFilter => value === 'all' || value === 'active' || value === 'completed';

export const preferences = {
  getTaskFilter: async (): Promise<TaskFilter> => {
    try {
      const value = await AsyncStorage.getItem(taskFilterKey);
      return isTaskFilter(value) ? value : defaultTaskFilter;
    } catch (error) {
      console.warn('[preferences] unable to read task filter', error);
      return defaultTaskFilter;
    }
  },
  setTaskFilter: async (value: TaskFilter): Promise<void> => {
    try {
      await AsyncStorage.setItem(taskFilterKey, value);
    } catch (error) {
      console.warn('[preferences] unable to save task filter', error);
    }
  }
};

export { defaultTaskFilter, taskFilterKey };
