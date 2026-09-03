import { getTaskStore } from './local-tasks';
import { TaskHttpError, tasksApi } from './tasks';
import type { AccessMode } from '../auth/AuthProvider';
import type { SyncOperation } from './task-repository';

export type SyncSummary = { attempted: number; confirmed: number; failed: number; conflicts: number; review: number };
export type ConflictResolution = 'server' | 'local';
export type SyncRunOptions = { force?: boolean };

const MAX_ATTEMPTS = 3;
const MAX_RETRY_DELAY_MS = 30_000;
const emptySummary = (): SyncSummary => ({ attempted: 0, confirmed: 0, failed: 0, conflicts: 0, review: 0 });

export const retryDelayMs = (attempt: number, retryAfterMs?: number): number => {
  if (retryAfterMs !== undefined && Number.isFinite(retryAfterMs)) return Math.min(MAX_RETRY_DELAY_MS, Math.max(0, retryAfterMs));
  return Math.min(MAX_RETRY_DELAY_MS, 1_000 * 2 ** Math.min(10, Math.max(0, attempt - 1)));
};

const wait = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
const operationStatus = (error: unknown) => error instanceof TaskHttpError ? error.statusCode : 0;
const isRetryable = (status: number) => status === 0 || status === 429 || status >= 500;
const isNotFound = (error: unknown) => error instanceof TaskHttpError && error.statusCode === 404;
const run = async (ownerId: string, token: string, mode: AccessMode, force = false): Promise<SyncSummary> => {
  if (mode !== 'remote') return emptySummary();
  const store = await getTaskStore();
  const operations = await store.listOperations(ownerId);
  const summary = emptySummary();
  for (const operation of operations) {
    if (operation.state === 'conflict') { summary.conflicts += 1; continue; }
    if (operation.state === 'review') { summary.review += 1; continue; }
    if (operation.state === 'failed' && !force) { summary.failed += 1; continue; }
    if (operation.attempts >= MAX_ATTEMPTS && !force) { summary.failed += 1; continue; }
    const task = await store.find(ownerId, operation.taskLocalId);
    if (!task) {
      await store.markOperation(ownerId, operation.operationId, 'review', 'La tarea local ya no está disponible; requiere revisión.');
      summary.review += 1;
      continue;
    }
    if ((operation.kind === 'update' || operation.kind === 'delete') && !task.remoteId) continue;
    if (task.remoteOutcome === 'unknown') {
      await store.markOperation(ownerId, operation.operationId, 'review', 'Resultado remoto incierto; requiere revisión manual.');
      summary.review += 1;
      continue;
    }
    let waitedForRetryAfter = false;
    if (operation.retryAfterAt) {
      const retryAt = Date.parse(operation.retryAfterAt);
      if (!Number.isNaN(retryAt) && retryAt > Date.now()) {
        await wait(retryDelayMs(0, retryAt - Date.now()));
        waitedForRetryAfter = true;
      }
    }
    if (!waitedForRetryAfter && operation.attempts > 0) await wait(retryDelayMs(operation.attempts));
    summary.attempted += 1;
    await store.markOperation(ownerId, operation.operationId, 'sending');
    try {
      if (operation.kind === 'create') {
        const remote = await tasksApi.create(token, JSON.parse(operation.payload), operation.operationId);
        await store.confirmCreate(ownerId, task.localId, remote);
      } else if (operation.kind === 'update' && task.remoteId) {
        const remote = await tasksApi.update(token, task.remoteId, JSON.parse(operation.payload), operation.operationId, task.remoteVersion);
        await store.saveRemoteIfUnchanged(ownerId, task.localId, task.localUpdatedAt, remote);
      } else if (operation.kind === 'delete' && task.remoteId) {
        await tasksApi.remove(token, task.remoteId, operation.operationId, task.remoteVersion);
        await store.deleteRemoteConfirmed(ownerId, task.localId);
      } else if (operation.kind === 'image') {
        await store.markOperation(ownerId, operation.operationId, 'review', 'La sincronización de imágenes requiere revisión.');
        summary.review += 1;
        continue;
      }
      await store.markOperation(ownerId, operation.operationId, 'confirmed');
      summary.confirmed += 1;
    } catch (error) {
      const status = operationStatus(error);
      const state = status === 409 ? 'conflict' : isRetryable(status) ? 'pending' : 'failed';
      const retryAfterMs = status === 429 && error instanceof TaskHttpError ? error.retryAfterMs : undefined;
      const retryAfterAt = state === 'pending' && retryAfterMs !== undefined ? new Date(Date.now() + retryDelayMs(operation.attempts + 1, retryAfterMs)).toISOString() : null;
      await store.markOperation(ownerId, operation.operationId, state, error instanceof Error ? error.message : 'Sync failed.', retryAfterAt);
      if (state === 'conflict') summary.conflicts += 1;
      else summary.failed += 1;
      if (status === 401) break;
    }
  }
  return summary;
};

const resolve = async (ownerId: string, token: string, operationId: string, resolution: ConflictResolution): Promise<void> => {
  const store = await getTaskStore();
  const operation: SyncOperation | undefined = (await store.listOperations(ownerId)).find((item) => item.operationId === operationId);
  if (!operation || (operation.state !== 'conflict' && operation.state !== 'review')) throw new Error('El conflicto ya no requiere resolución.');
  const task = await store.find(ownerId, operation.taskLocalId);
  if (!task?.remoteId) throw new Error('No hay una tarea remota verificable para resolver este caso.');
  let remote;
  try {
    remote = await tasksApi.get(token, task.remoteId);
  } catch (error) {
    if (!isNotFound(error) || resolution !== 'server') throw error;
    await store.resolveRemoteDeletion(ownerId, operation.operationId);
    return;
  }
  if (resolution === 'server') {
    await store.resolveWithRemote(ownerId, operation.operationId, remote);
    return;
  }
  if (operation.state !== 'conflict' || operation.kind === 'create') throw new Error('Este resultado incierto no puede reenviarse de forma segura.');
  await store.requeueOperation(ownerId, operation.operationId, remote.version);
};

let active: { ownerId: string; token: string; promise: Promise<SyncSummary> } | undefined;

export const syncService = {
  run(ownerId: string, token: string | null, mode: AccessMode, options: SyncRunOptions = {}) {
    if (!token || mode !== 'remote') return Promise.resolve(emptySummary());
    if (active) {
      if (active.ownerId !== ownerId || active.token !== token) return Promise.resolve(emptySummary());
      return active.promise;
    }
    const promise = run(ownerId, token, mode, options.force).finally(() => { active = undefined; });
    active = { ownerId, token, promise };
    return promise;
  },
  resolveConflict(ownerId: string, token: string | null, operationId: string, resolution: ConflictResolution) {
    if (!token) return Promise.reject(new Error('Se necesita una sesión remota para resolver conflictos.'));
    if (active) return Promise.reject(new Error('La sincronización está en curso. Inténtalo de nuevo al terminar.'));
    return resolve(ownerId, token, operationId, resolution);
  }
};
