import { LocalTaskRepository, type LocalTask, type LocalTaskInput } from './task-repository';
import { TaskHttpError, tasksApi } from './tasks';
import type { AccessMode } from '../auth/AuthProvider';

export type TaskLoadResult = { tasks: LocalTask[]; source: 'remote' | 'local' };
export type TaskMutationResult = { task: LocalTask | null; source: 'remote' | 'local' | 'uncertain'; pending: boolean };

const isHttpError = (error: unknown): error is TaskHttpError => error instanceof TaskHttpError;

export class TaskStore {
  constructor(private readonly repository: LocalTaskRepository) {}

  async load(ownerId: string, mode: AccessMode, token: string | null): Promise<TaskLoadResult> {
    const localTasks = await this.repository.list(ownerId);
    if (mode !== 'remote' || !token) return { tasks: localTasks, source: 'local' };
    try {
      const remoteTasks = await tasksApi.list(token);
      return { tasks: await this.repository.mergeRemote(ownerId, remoteTasks), source: 'remote' };
    } catch (error) {
      if (isHttpError(error)) throw error;
      return { tasks: localTasks, source: 'local' };
    }
  }

  async create(ownerId: string, mode: AccessMode, token: string | null, input: LocalTaskInput): Promise<TaskMutationResult> {
    if (mode !== 'remote' || !token) return { task: await this.repository.createOffline(ownerId, input), source: 'local', pending: true };
    try {
      const remoteTask = await tasksApi.create(token, input);
      return { task: await this.repository.saveRemote(ownerId, remoteTask), source: 'remote', pending: false };
    } catch (error) {
      if (isHttpError(error)) throw error;
      return { task: await this.repository.createOffline(ownerId, input, 'unknown'), source: 'uncertain', pending: true };
    }
  }

  async update(ownerId: string, mode: AccessMode, token: string | null, localTask: LocalTask, patch: Partial<LocalTaskInput>): Promise<TaskMutationResult> {
    if (mode !== 'remote' || !token || !localTask.remoteId) return { task: await this.repository.updateOffline(ownerId, localTask.localId, patch), source: 'local', pending: true };
    try {
      const remoteTask = await tasksApi.update(token, localTask.remoteId, patch);
      return { task: await this.repository.saveRemote(ownerId, remoteTask), source: 'remote', pending: false };
    } catch (error) {
      if (isHttpError(error)) throw error;
      return { task: await this.repository.updateOffline(ownerId, localTask.localId, patch, 'unknown'), source: 'uncertain', pending: true };
    }
  }

  async remove(ownerId: string, mode: AccessMode, token: string | null, localTask: LocalTask): Promise<TaskMutationResult> {
    if (mode !== 'remote' || !token || !localTask.remoteId) {
      const task = await this.repository.markDelete(ownerId, localTask.localId);
      return { task, source: 'local', pending: Boolean(task) };
    }
    try {
      await tasksApi.remove(token, localTask.remoteId);
      await this.repository.deleteRemoteConfirmed(ownerId, localTask.localId);
      return { task: null, source: 'remote', pending: false };
    } catch (error) {
      if (isHttpError(error)) throw error;
      const task = await this.repository.markDelete(ownerId, localTask.localId, 'unknown');
      return { task, source: 'uncertain', pending: Boolean(task) };
    }
  }
  find(ownerId: string, localId: string) {
    return this.repository.find(ownerId, localId);
  }
  saveRemote(ownerId: string, task: Parameters<LocalTaskRepository['saveRemote']>[1]) {
    return this.repository.saveRemote(ownerId, task);
  }
  listLocalImages(ownerId: string) {
    return this.repository.listLocalImages(ownerId);
  }

  deleteLocalFiles(ownerId: string, taskLocalId: string) {
    return this.repository.deleteLocalFiles(ownerId, taskLocalId);
  }
  saveLocalImage(ownerId: string, taskLocalId: string, uri: string) {
    return this.repository.saveLocalImage(ownerId, taskLocalId, uri);
  }
}
