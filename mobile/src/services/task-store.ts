import { LocalTaskRepository, type LocalTask, type LocalTaskInput } from './task-repository';
import { TaskHttpError, tasksApi } from './tasks';
import type { AccessMode } from '../auth/AuthProvider';
export type TaskLoadResult = { tasks: LocalTask[]; source: 'remote' | 'local' };

export type TaskMutationResult = { task: LocalTask | null; source: 'remote' | 'local' | 'uncertain'; pending: boolean; requiresAuth?: boolean };

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
    const localTask = await this.repository.createOffline(ownerId, input);
    const operation = await this.repository.enqueueOperation(ownerId, localTask.localId, 'create', JSON.stringify(input));
    if (mode !== 'remote' || !token) return { task: localTask, source: 'local', pending: true };
    try {
      const remoteTask = await tasksApi.create(token, input, operation.operationId);
      const task = await this.repository.confirmCreate(ownerId, localTask.localId, remoteTask);
      await this.repository.updateOperation(ownerId, operation.operationId, 'confirmed');
      return { task, source: 'remote', pending: false };
    } catch (error) {
      if (isHttpError(error)) {
        await this.repository.updateOperation(ownerId, operation.operationId, error.statusCode === 409 ? 'conflict' : 'failed', error.message);
        if (error.statusCode === 401) return { task: await this.repository.find(ownerId, localTask.localId), source: 'local', pending: true, requiresAuth: true };
        throw error;
      }
      await this.repository.updateOffline(ownerId, localTask.localId, {}, 'unknown');
      return { task: await this.repository.find(ownerId, localTask.localId), source: 'uncertain', pending: true };
    }
  }

  async update(ownerId: string, mode: AccessMode, token: string | null, localTask: LocalTask, patch: Partial<LocalTaskInput>): Promise<TaskMutationResult> {
    const task = await this.repository.updateOffline(ownerId, localTask.localId, patch);
    const operation = await this.repository.enqueueOperation(ownerId, task.localId, 'update', JSON.stringify(patch), localTask.remoteVersion.toString());
    if (mode !== 'remote' || !token || !localTask.remoteId) return { task, source: 'local', pending: true };
    try {
      const remoteTask = await tasksApi.update(token, localTask.remoteId, patch, operation.operationId, localTask.remoteVersion);
      const saved = await this.repository.saveRemoteIfUnchanged(ownerId, task.localId, task.localUpdatedAt, remoteTask);
      await this.repository.updateOperation(ownerId, operation.operationId, 'confirmed');
      return { task: saved.task, source: saved.applied ? 'remote' : 'local', pending: !saved.applied };
    } catch (error) {
      if (isHttpError(error)) {
        await this.repository.updateOperation(ownerId, operation.operationId, error.statusCode === 409 ? 'conflict' : 'failed', error.message);
        if (error.statusCode === 401) return { task: await this.repository.find(ownerId, task.localId), source: 'local', pending: true, requiresAuth: true };
        throw error;
      }
      return { task: await this.repository.updateOffline(ownerId, task.localId, {}, 'unknown'), source: 'uncertain', pending: true };
    }
  }
  async remove(ownerId: string, mode: AccessMode, token: string | null, localTask: LocalTask): Promise<TaskMutationResult> {
    const task = await this.repository.markDelete(ownerId, localTask.localId);
    const operation = task?.remoteId ? await this.repository.enqueueOperation(ownerId, task.localId, 'delete', '{}', localTask.remoteVersion.toString()) : null;
    if (mode !== 'remote' || !token || !localTask.remoteId || !operation) return { task, source: 'local', pending: Boolean(task) };
    try {
      await tasksApi.remove(token, localTask.remoteId, operation.operationId, localTask.remoteVersion);
      await this.repository.deleteRemoteConfirmed(ownerId, localTask.localId);
      await this.repository.updateOperation(ownerId, operation.operationId, 'confirmed');
      return { task: null, source: 'remote', pending: false };
    } catch (error) {
      if (isHttpError(error)) {
        await this.repository.updateOperation(ownerId, operation.operationId, error.statusCode === 409 ? 'conflict' : 'failed', error.message);
        if (error.statusCode === 401) return { task: await this.repository.find(ownerId, localTask.localId), source: 'local', pending: true, requiresAuth: true };
        throw error;
      }
      return { task: await this.repository.markDelete(ownerId, localTask.localId, 'unknown'), source: 'uncertain', pending: true };
    }
  }
  find(ownerId: string, localId: string) {
    return this.repository.find(ownerId, localId);
  }
  saveRemoteIfUnchanged(ownerId: string, localId: string, expectedLocalUpdatedAt: string, task: Parameters<LocalTaskRepository['saveRemote']>[1]) {
    return this.repository.saveRemoteIfUnchanged(ownerId, localId, expectedLocalUpdatedAt, task);
  }
  saveRemote(ownerId: string, task: Parameters<LocalTaskRepository['saveRemote']>[1]) {
    return this.repository.saveRemote(ownerId, task);
  }
  resolveWithRemote(ownerId: string, operationId: string, task: Parameters<LocalTaskRepository['saveRemote']>[1]) {
    return this.repository.resolveWithRemote(ownerId, operationId, task);
  }
  resolveRemoteDeletion(ownerId: string, operationId: string) {
    return this.repository.resolveRemoteDeletion(ownerId, operationId);
  }
  listLocalImages(ownerId: string) {
    return this.repository.listLocalImages(ownerId);
  }

  deleteLocalFiles(ownerId: string, taskLocalId: string) {
    return this.repository.deleteLocalFiles(ownerId, taskLocalId);
  }
  saveLocalImage(ownerId: string, taskLocalId: string, uri: string, mimeType?: string, filename?: string) {
    return this.repository.saveLocalImage(ownerId, taskLocalId, uri, mimeType, filename);
  }
  confirmImageUpload(ownerId: string, operationId: string, fileId: string, image: Parameters<LocalTaskRepository['confirmImageUpload']>[3]) {
    return this.repository.confirmImageUpload(ownerId, operationId, fileId, image);
  }
  deleteLocalImage(ownerId: string, taskLocalId: string, fileId: string) {
    return this.repository.deleteLocalImage(ownerId, taskLocalId, fileId);
  }

  listLocalAudios(ownerId: string, taskLocalId: string) {
    return this.repository.listLocalAudios(ownerId, taskLocalId);
  }
  saveLocalAudio(ownerId: string, taskLocalId: string, audio: Parameters<LocalTaskRepository['saveLocalAudio']>[2]) {
    return this.repository.saveLocalAudio(ownerId, taskLocalId, audio);
  }
  deleteLocalAudio(ownerId: string, taskLocalId: string, audioId: string) {
    return this.repository.deleteLocalAudio(ownerId, taskLocalId, audioId);
  }
  listOperations(ownerId: string) {
    return this.repository.listOperations(ownerId);
  }
  markOperation(ownerId: string, operationId: string, state: Parameters<LocalTaskRepository['updateOperation']>[2], error?: string | null, retryAfterAt?: string | null) {
    return this.repository.updateOperation(ownerId, operationId, state, error, retryAfterAt);
  }
  requeueOperation(ownerId: string, operationId: string, remoteVersion: number) {
    return this.repository.requeueOperation(ownerId, operationId, remoteVersion);
  }
  confirmCreate(ownerId: string, localId: string, task: Parameters<LocalTaskRepository['confirmCreate']>[2]) {
    return this.repository.confirmCreate(ownerId, localId, task);
  }
  deleteRemoteConfirmed(ownerId: string, localId: string) {
    return this.repository.deleteRemoteConfirmed(ownerId, localId);
  }
  importTasks(ownerId: string, tasks: Parameters<LocalTaskRepository['importTasks']>[1]) {
    return this.repository.importTasks(ownerId, tasks);
  }
}
