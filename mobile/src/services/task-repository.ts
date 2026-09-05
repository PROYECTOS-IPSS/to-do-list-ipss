import type { ImageAttachment } from './attachments';
import type { Task } from './tasks';
import { migrateDatabase, type SqliteExecutor } from './sqlite';

export type SyncState = 'clean' | 'pending_create' | 'pending_update' | 'pending_delete';
export type RemoteOutcome = 'none' | 'unknown';

export type LocalTask = Omit<Task, 'id'> & {
  id: string;
  localId: string;
  ownerId: string;
  remoteId: string | null;
  sourceProvider?: string | null;
  sourceExternalId?: string | null;
  remoteVersion: number;
  syncState: SyncState;
  remoteOutcome: RemoteOutcome;
  localUpdatedAt: string;
  deletedAt: string | null;
};
export type LocalTaskInput = Pick<Task, 'title' | 'description' | 'completed' | 'latitude' | 'longitude' | 'locationAccuracy' | 'locationTimestamp'>;
export type ImportedTaskInput = { title: string; description: string | null; completed: boolean; provider: string; externalId: string };
export type LocalFile = { id: string; ownerId: string; taskLocalId: string; kind: 'image'; uri: string; remoteImageId: string | null; contentUrl: string | null; createdAt: string };

export type SyncOperationKind = 'create' | 'update' | 'delete' | 'image';
export type SyncOperationState = 'pending' | 'sending' | 'confirmed' | 'conflict' | 'failed' | 'review';
export type SyncOperation = { operationId: string; ownerId: string; taskLocalId: string; kind: SyncOperationKind; payload: string; expectedVersion: string | null; state: SyncOperationState; attempts: number; lastError: string | null; retryAfterAt: string | null; createdAt: string; updatedAt: string };

type TaskRow = {
  local_id: string;
  owner_id: string;
  remote_id: string | null;
  title: string;
  description: string | null;
  completed: number;
  latitude: number | null;
  longitude: number | null;
  location_accuracy: number | null;
  location_timestamp: string | null;
  created_at: string;
  updated_at: string;
  remote_version: number;
  local_updated_at: string;
  sync_state: SyncState;
  remote_outcome: RemoteOutcome;
  deleted_at: string | null;
  source_provider: string | null;
  source_external_id: string | null;
};

type FileRow = { id: string; owner_id: string; task_local_id: string; kind: 'image'; uri: string; remote_image_id: string | null; content_url: string | null; created_at: string };
type SyncOperationRow = { operation_id: string; owner_id: string; task_local_id: string; kind: SyncOperationKind; payload: string; expected_version: string | null; state: SyncOperationState; attempts: number; last_error: string | null; retry_after_at: string | null; created_at: string; updated_at: string };
const rowToOperation = (row: SyncOperationRow): SyncOperation => ({ operationId: row.operation_id, ownerId: row.owner_id, taskLocalId: row.task_local_id, kind: row.kind, payload: row.payload, expectedVersion: row.expected_version, state: row.state, attempts: row.attempts, lastError: row.last_error, retryAfterAt: row.retry_after_at, createdAt: row.created_at, updatedAt: row.updated_at });

const now = () => new Date().toISOString();
// ponytail: timestamp plus random suffix is enough for local IDs; replace with a UUID provider if collision rate matters.
const newLocalId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const rowToTask = (row: TaskRow): LocalTask => ({
  id: row.local_id,
  localId: row.local_id,
  ownerId: row.owner_id,
  remoteId: row.remote_id,
  sourceProvider: row.source_provider,
  sourceExternalId: row.source_external_id,
  title: row.title,
  version: row.remote_version,
  description: row.description,
  completed: row.completed === 1,
  latitude: row.latitude,
  longitude: row.longitude,
  locationAccuracy: row.location_accuracy,
  locationTimestamp: row.location_timestamp,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  remoteVersion: row.remote_version,
  localUpdatedAt: row.local_updated_at,
  syncState: row.sync_state,
  remoteOutcome: row.remote_outcome,
  deletedAt: row.deleted_at
});

const rowToFile = (row: FileRow): LocalFile => ({
  id: row.id,
  ownerId: row.owner_id,
  taskLocalId: row.task_local_id,
  kind: row.kind,
  uri: row.uri,
  remoteImageId: row.remote_image_id,
  contentUrl: row.content_url,
  createdAt: row.created_at
});

const values = (ownerId: string, task: LocalTaskInput, localId: string, remoteId: string | null, syncState: SyncState, createdAt: string, updatedAt: string, localUpdatedAt: string, remoteOutcome: RemoteOutcome, deletedAt: string | null = null) => [
  localId, ownerId, remoteId, task.title, task.description, task.completed ? 1 : 0,
  task.latitude, task.longitude, task.locationAccuracy, task.locationTimestamp,
  createdAt, updatedAt, localUpdatedAt, syncState, remoteOutcome, deletedAt
];

export class LocalTaskRepository {
  constructor(private readonly db: SqliteExecutor) {}

  async initialize(): Promise<void> {
    await migrateDatabase(this.db);
    const files = await this.db.getAllAsync<FileRow>("SELECT * FROM task_files WHERE kind = 'image'");
    const operations = await this.db.getAllAsync<SyncOperationRow>("SELECT * FROM sync_operations WHERE kind = 'image' AND state != 'confirmed'");
    const queuedFileIds = new Set(operations.flatMap((operation) => {
      try {
        const payload = JSON.parse(operation.payload) as { fileId?: unknown };
        return typeof payload.fileId === 'string' ? [payload.fileId] : [];
      } catch {
        return [];
      }
    }));
    for (const file of files) {
      if (!queuedFileIds.has(file.id)) await this.enqueueOperation(file.owner_id, file.task_local_id, 'image', JSON.stringify({ fileId: file.id, uri: file.uri, mimeType: 'image/jpeg', filename: 'task-image.jpg' }));
    }
  }

  async list(ownerId: string): Promise<LocalTask[]> {
    const rows = await this.db.getAllAsync<TaskRow>(
      `SELECT * FROM tasks WHERE owner_id = ? AND sync_state != 'pending_delete' ORDER BY updated_at DESC, local_id DESC`,
      [ownerId]
    );
    return rows.map(rowToTask);
  }

  async pending(ownerId: string): Promise<LocalTask[]> {
    const rows = await this.db.getAllAsync<TaskRow>(
      `SELECT * FROM tasks WHERE owner_id = ? AND sync_state != 'clean' ORDER BY local_updated_at ASC`,
      [ownerId]
    );
    return rows.map(rowToTask);
  }

  async find(ownerId: string, localId: string): Promise<LocalTask | null> {
    const row = await this.db.getFirstAsync<TaskRow>('SELECT * FROM tasks WHERE owner_id = ? AND local_id = ?', [ownerId, localId]);
    return row ? rowToTask(row) : null;
  }

  async createOffline(ownerId: string, task: LocalTaskInput, remoteOutcome: RemoteOutcome = 'none'): Promise<LocalTask> {
    const localId = newLocalId();
    const timestamp = now();
    await this.db.runAsync(
      `INSERT INTO tasks (local_id, owner_id, remote_id, title, description, completed, latitude, longitude, location_accuracy, location_timestamp, created_at, updated_at, local_updated_at, sync_state, remote_outcome, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      values(ownerId, task, localId, null, 'pending_create', timestamp, timestamp, timestamp, remoteOutcome)
    );
    const created = await this.find(ownerId, localId);
    if (!created) throw new Error('Local task could not be created.');
    return created;
  }
  async importTasks(ownerId: string, records: readonly ImportedTaskInput[]): Promise<{ imported: number; skipped: number; tasks: LocalTask[] }> {
    const importedLocalIds: string[] = [];
    let skipped = 0;
    await this.db.withTransactionAsync(async () => {
      for (const record of records) {
        if (!record.provider.trim() || !record.externalId.trim()) throw new Error('Imported task provenance is required.');
        const existing = await this.db.getFirstAsync<{ local_id: string }>('SELECT local_id FROM tasks WHERE owner_id = ? AND source_provider = ? AND source_external_id = ?', [ownerId, record.provider, record.externalId]);
        if (existing) { skipped += 1; continue; }
        const localId = newLocalId();
        const operationId = newLocalId();
        const timestamp = now();
        await this.db.runAsync(
          `INSERT INTO tasks (local_id, owner_id, remote_id, title, description, completed, latitude, longitude, location_accuracy, location_timestamp, created_at, updated_at, remote_version, local_updated_at, sync_state, remote_outcome, deleted_at, source_provider, source_external_id) VALUES (?, ?, NULL, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?, 0, ?, 'pending_create', 'none', NULL, ?, ?)`,
          [localId, ownerId, record.title, record.description, record.completed ? 1 : 0, timestamp, timestamp, timestamp, record.provider, record.externalId]
        );
        await this.db.runAsync(
          `INSERT INTO sync_operations (operation_id, owner_id, task_local_id, kind, payload, expected_version, state, attempts, last_error, created_at, updated_at) VALUES (?, ?, ?, 'create', ?, NULL, 'pending', 0, NULL, ?, ?)`,
          [operationId, ownerId, localId, JSON.stringify({ title: record.title, description: record.description, completed: record.completed }), timestamp, timestamp]
        );
        importedLocalIds.push(localId);
      }
    });
    const tasks = (await Promise.all(importedLocalIds.map((localId) => this.find(ownerId, localId)))).filter((task): task is LocalTask => task !== null);
    return { imported: tasks.length, skipped, tasks };
  }

  async updateOffline(ownerId: string, localId: string, patch: Partial<LocalTaskInput>, remoteOutcome: RemoteOutcome = 'none'): Promise<LocalTask> {
    return this.db.withTransactionAsync(async () => {
      const existing = await this.find(ownerId, localId);
      if (!existing || existing.syncState === 'pending_delete') throw new Error('Local task not found.');
      const updated: LocalTaskInput = {
        title: existing.title,
        description: existing.description,
        completed: existing.completed,
        latitude: existing.latitude,
        longitude: existing.longitude,
        locationAccuracy: existing.locationAccuracy,
        locationTimestamp: existing.locationTimestamp,
        ...patch
      };
      const timestamp = now();
      const state: SyncState = existing.syncState === 'pending_create' ? 'pending_create' : 'pending_update';
      const outcome: RemoteOutcome = remoteOutcome === 'unknown' ? 'unknown' : existing.remoteOutcome;
      await this.db.runAsync(
        `UPDATE tasks SET title = ?, description = ?, completed = ?, latitude = ?, longitude = ?, location_accuracy = ?, location_timestamp = ?, updated_at = ?, local_updated_at = ?, sync_state = ?, remote_outcome = ? WHERE owner_id = ? AND local_id = ?`,
        [updated.title, updated.description, updated.completed ? 1 : 0, updated.latitude, updated.longitude, updated.locationAccuracy, updated.locationTimestamp, timestamp, timestamp, state, outcome, ownerId, localId]
      );
      const updatedTask = await this.find(ownerId, localId);
      if (!updatedTask) throw new Error('Local task could not be updated.');
      return updatedTask;
    });
  }

  async markDelete(ownerId: string, localId: string, remoteOutcome: RemoteOutcome = 'none'): Promise<LocalTask | null> {
    return this.db.withTransactionAsync(async () => {
      const existing = await this.find(ownerId, localId);
      if (!existing) return null;
      if (!existing.remoteId) {
        const operations = await this.db.getAllAsync<{ kind: SyncOperationKind; state: SyncOperationState }>(
          'SELECT kind, state FROM sync_operations WHERE owner_id = ? AND task_local_id = ?',
          [ownerId, localId]
        );
        const creationWasNeverSent = operations.some((operation) => operation.kind === 'create' && operation.state === 'pending');
        if (creationWasNeverSent && existing.remoteOutcome === 'none') {
          await this.db.runAsync('DELETE FROM sync_operations WHERE owner_id = ? AND task_local_id = ?', [ownerId, localId]);
          await this.db.runAsync('DELETE FROM tasks WHERE owner_id = ? AND local_id = ?', [ownerId, localId]);
          return null;
        }
      }
      const timestamp = now();
      const outcome: RemoteOutcome = remoteOutcome === 'unknown' ? 'unknown' : existing.remoteOutcome;
      await this.db.runAsync(
        `UPDATE tasks SET deleted_at = ?, local_updated_at = ?, sync_state = 'pending_delete', remote_outcome = ? WHERE owner_id = ? AND local_id = ?`,
        [timestamp, timestamp, outcome, ownerId, localId]
      );
      return this.find(ownerId, localId);
    });
  }

  async deleteRemoteConfirmed(ownerId: string, localId: string): Promise<void> {
    await this.db.runAsync('DELETE FROM tasks WHERE owner_id = ? AND local_id = ?', [ownerId, localId]);
  }

  private async upsertRemote(ownerId: string, task: Task, preservePending: boolean): Promise<LocalTask> {
    const existing = await this.db.getFirstAsync<TaskRow>('SELECT * FROM tasks WHERE owner_id = ? AND remote_id = ?', [ownerId, task.id]);
    const timestamp = now();
    if (existing && existing.sync_state !== 'clean' && preservePending) return rowToTask(existing);
    const input: LocalTaskInput = task;
    if (existing) {
      await this.db.runAsync(
        `UPDATE tasks SET title = ?, description = ?, completed = ?, latitude = ?, longitude = ?, location_accuracy = ?, location_timestamp = ?, created_at = ?, updated_at = ?, remote_version = ?, local_updated_at = ?, sync_state = 'clean', remote_outcome = 'none', deleted_at = NULL WHERE owner_id = ? AND local_id = ?`,
        [input.title, input.description, input.completed ? 1 : 0, input.latitude, input.longitude, input.locationAccuracy, input.locationTimestamp, task.createdAt, task.updatedAt, task.version, timestamp, ownerId, existing.local_id]
      );
      const updated = await this.find(ownerId, existing.local_id);
      if (!updated) throw new Error('Remote task could not be updated locally.');
      return updated;
    }
    const localId = newLocalId();
    await this.db.runAsync(
      `INSERT INTO tasks (local_id, owner_id, remote_id, title, description, completed, latitude, longitude, location_accuracy, location_timestamp, created_at, updated_at, remote_version, local_updated_at, sync_state, remote_outcome, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [...values(ownerId, input, localId, task.id, 'clean', task.createdAt, task.updatedAt, timestamp, 'none').slice(0, 12), task.version, ...values(ownerId, input, localId, task.id, 'clean', task.createdAt, task.updatedAt, timestamp, 'none').slice(12)]
    );
    const created = await this.find(ownerId, localId);
    if (!created) throw new Error('Remote task could not be stored locally.');
    return created;
  }

  async saveRemote(ownerId: string, task: Task): Promise<LocalTask> {
    return this.db.withTransactionAsync(() => this.upsertRemote(ownerId, task, false));
  }

  async saveRemoteIfUnchanged(ownerId: string, localId: string, expectedLocalUpdatedAt: string, task: Task): Promise<{ task: LocalTask; applied: boolean }> {
    return this.db.withTransactionAsync(async () => {
      const row = await this.db.getFirstAsync<TaskRow>('SELECT * FROM tasks WHERE owner_id = ? AND local_id = ?', [ownerId, localId]);
      if (!row) throw new Error('Local task not found.');
      const current = rowToTask(row);
      if (current.localUpdatedAt !== expectedLocalUpdatedAt) {
        await this.db.runAsync('UPDATE tasks SET remote_id = ?, remote_version = ?, remote_outcome = ? WHERE owner_id = ? AND local_id = ?', [task.id, task.version, 'none', ownerId, localId]);
        const refreshed = await this.db.getFirstAsync<TaskRow>('SELECT * FROM tasks WHERE owner_id = ? AND local_id = ?', [ownerId, localId]);
        if (!refreshed) throw new Error('Local task not found.');
        return { task: rowToTask(refreshed), applied: false };
      }
      return { task: await this.upsertRemote(ownerId, task, false), applied: true };
    });
  }

  async mergeRemote(ownerId: string, tasks: Task[]): Promise<LocalTask[]> {
    return this.db.withTransactionAsync(async () => {
      for (const task of tasks) await this.upsertRemote(ownerId, task, true);
      return this.list(ownerId);
    });
  }

  async saveLocalImage(ownerId: string, taskLocalId: string, uri: string, mimeType = 'image/jpeg', filename = 'task-image.jpg'): Promise<LocalFile> {
    return this.db.withTransactionAsync(async () => {
      const task = await this.db.getFirstAsync<{ local_id: string }>('SELECT local_id FROM tasks WHERE owner_id = ? AND local_id = ?', [ownerId, taskLocalId]);
      if (!task) throw new Error('Local task not found.');
      const timestamp = now();
      const fileId = newLocalId();
      await this.db.runAsync(
        `INSERT INTO task_files (id, owner_id, task_local_id, kind, uri, created_at) VALUES (?, ?, ?, 'image', ?, ?)`,
        [fileId, ownerId, taskLocalId, uri, timestamp]
      );
      const operation = await this.enqueueOperation(ownerId, taskLocalId, 'image', JSON.stringify({ fileId, uri, mimeType, filename }));
      const row = await this.db.getFirstAsync<FileRow>('SELECT * FROM task_files WHERE owner_id = ? AND id = ?', [ownerId, fileId]);
      if (!row || operation.taskLocalId !== taskLocalId) throw new Error('Local image could not be stored.');
      return rowToFile(row);
    });
  }

  async listLocalImages(ownerId: string): Promise<LocalFile[]> {
    const rows = await this.db.getAllAsync<FileRow>("SELECT * FROM task_files WHERE owner_id = ? AND kind = 'image'", [ownerId]);
    return rows.map(rowToFile);
  }
  async confirmImageUpload(ownerId: string, operationId: string, fileId: string, image: ImageAttachment): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        'UPDATE task_files SET remote_image_id = ?, content_url = ? WHERE owner_id = ? AND id = ?',
        [image.id, image.contentUrl ?? null, ownerId, fileId]
      );
      await this.db.runAsync('UPDATE sync_operations SET state = ?, last_error = NULL, retry_after_at = NULL, updated_at = ? WHERE owner_id = ? AND operation_id = ?', ['confirmed', now(), ownerId, operationId]);
    });
  }
  async deleteLocalImage(ownerId: string, taskLocalId: string, fileId: string): Promise<string | null> {
    return this.db.withTransactionAsync(async () => {
      const file = await this.db.getFirstAsync<{ uri: string }>('SELECT uri FROM task_files WHERE owner_id = ? AND task_local_id = ? AND id = ?', [ownerId, taskLocalId, fileId]);
      if (!file) return null;
      const operations = await this.db.getAllAsync<SyncOperationRow>("SELECT * FROM sync_operations WHERE owner_id = ? AND task_local_id = ? AND kind = 'image' AND state != 'sending'", [ownerId, taskLocalId]);
      for (const operation of operations) {
        try {
          const payload = JSON.parse(operation.payload) as { fileId?: unknown };
          if (payload.fileId === fileId) await this.db.runAsync('DELETE FROM sync_operations WHERE owner_id = ? AND operation_id = ?', [ownerId, operation.operation_id]);
        } catch {
          // Invalid durable operations remain available for explicit review.
        }
      }
      await this.db.runAsync('DELETE FROM task_files WHERE owner_id = ? AND task_local_id = ? AND id = ?', [ownerId, taskLocalId, fileId]);
      return file.uri;
    });
  }
  async deleteLocalFiles(ownerId: string, taskLocalId: string): Promise<string[]> {
    return this.db.withTransactionAsync(async () => {
      const rows = await this.db.getAllAsync<{ uri: string }>('SELECT uri FROM task_files WHERE owner_id = ? AND task_local_id = ?', [ownerId, taskLocalId]);
      await this.db.runAsync("DELETE FROM sync_operations WHERE owner_id = ? AND task_local_id = ? AND kind = 'image' AND state != 'sending'", [ownerId, taskLocalId]);
      await this.db.runAsync('DELETE FROM task_files WHERE owner_id = ? AND task_local_id = ?', [ownerId, taskLocalId]);
      return rows.map((row) => row.uri);
    });
  }

  async enqueueOperation(ownerId: string, taskLocalId: string, kind: SyncOperationKind, payload: string, expectedVersion: string | null = null): Promise<SyncOperation> {
    const operationId = newLocalId();
    const timestamp = now();
    await this.db.runAsync(
      `INSERT INTO sync_operations (operation_id, owner_id, task_local_id, kind, payload, expected_version, state, attempts, last_error, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, NULL, ?, ?)`,
      [operationId, ownerId, taskLocalId, kind, payload, expectedVersion, timestamp, timestamp]
    );
    const operation = await this.db.getFirstAsync<SyncOperationRow>('SELECT * FROM sync_operations WHERE owner_id = ? AND operation_id = ?', [ownerId, operationId]);
    if (!operation) throw new Error('Sync operation could not be stored.');
    return rowToOperation(operation);
  }


  async resolveWithRemote(ownerId: string, operationId: string, task: Task): Promise<LocalTask> {
    return this.db.withTransactionAsync(async () => {
      const operation = await this.db.getFirstAsync<SyncOperationRow>('SELECT * FROM sync_operations WHERE owner_id = ? AND operation_id = ? AND state IN (\'conflict\', \'review\')', [ownerId, operationId]);
      if (!operation) throw new Error('Sync conflict is no longer available.');
      const current = await this.db.getFirstAsync<TaskRow>('SELECT * FROM tasks WHERE owner_id = ? AND local_id = ?', [ownerId, operation.task_local_id]);
      if (!current) throw new Error('Local task is no longer available.');
      const newer = await this.db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM sync_operations WHERE owner_id = ? AND task_local_id = ? AND operation_id != ? AND state IN ('pending', 'sending', 'failed', 'conflict', 'review')", [ownerId, operation.task_local_id, operationId]);
      if ((newer?.count ?? 0) > 0) {
        await this.db.runAsync('UPDATE tasks SET remote_id = ?, remote_version = ?, remote_outcome = ? WHERE owner_id = ? AND local_id = ?', [task.id, task.version, 'none', ownerId, operation.task_local_id]);
      } else {
        await this.upsertRemote(ownerId, task, false);
      }
      await this.db.runAsync('UPDATE sync_operations SET state = ?, last_error = NULL, retry_after_at = NULL, updated_at = ? WHERE owner_id = ? AND operation_id = ?', ['confirmed', now(), ownerId, operationId]);
      const result = await this.find(ownerId, operation.task_local_id);
      if (!result) throw new Error('Resolved task is no longer available.');
      return result;
    });
  }

  async resolveRemoteDeletion(ownerId: string, operationId: string): Promise<LocalTask | null> {
    return this.db.withTransactionAsync(async () => {
      const operation = await this.db.getFirstAsync<SyncOperationRow>('SELECT * FROM sync_operations WHERE owner_id = ? AND operation_id = ? AND state IN (\'conflict\', \'review\')', [ownerId, operationId]);
      if (!operation) throw new Error('Sync conflict is no longer available.');
      const newer = await this.db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM sync_operations WHERE owner_id = ? AND task_local_id = ? AND operation_id != ? AND state IN ('pending', 'sending', 'failed', 'conflict', 'review')", [ownerId, operation.task_local_id, operationId]);
      await this.db.runAsync('UPDATE sync_operations SET state = ?, last_error = NULL, retry_after_at = NULL, updated_at = ? WHERE owner_id = ? AND operation_id = ?', ['confirmed', now(), ownerId, operationId]);
      if ((newer?.count ?? 0) === 0) {
        await this.db.runAsync('DELETE FROM tasks WHERE owner_id = ? AND local_id = ?', [ownerId, operation.task_local_id]);
        return null;
      }
      await this.db.runAsync("UPDATE sync_operations SET state = 'review', last_error = ?, updated_at = ? WHERE owner_id = ? AND task_local_id = ? AND operation_id != ? AND state IN ('pending', 'sending', 'failed', 'conflict', 'review')", ['La tarea remota fue eliminada; revisa tus cambios locales.', now(), ownerId, operation.task_local_id, operationId]);
      await this.db.runAsync('UPDATE tasks SET remote_id = NULL, remote_version = 0, remote_outcome = ? WHERE owner_id = ? AND local_id = ?', ['none', ownerId, operation.task_local_id]);
      return this.find(ownerId, operation.task_local_id);
    });
  }
  listOperations(ownerId: string) {
    return this.db.getAllAsync<SyncOperationRow>("SELECT * FROM sync_operations WHERE owner_id = ? AND state IN ('pending', 'sending', 'failed', 'conflict', 'review') ORDER BY created_at ASC", [ownerId]).then((rows) => rows.map(rowToOperation));
  }

  async requeueOperation(ownerId: string, operationId: string, remoteVersion: number): Promise<SyncOperation> {
    return this.db.withTransactionAsync(async () => {
      const operation = await this.db.getFirstAsync<SyncOperationRow>('SELECT * FROM sync_operations WHERE owner_id = ? AND operation_id = ?', [ownerId, operationId]);
      if (!operation || operation.state !== 'conflict') throw new Error('Sync conflict is no longer available.');
      const task = await this.db.getFirstAsync<{ local_id: string }>('SELECT local_id FROM tasks WHERE owner_id = ? AND local_id = ?', [ownerId, operation.task_local_id]);
      if (!task) throw new Error('Local task is no longer available.');
      const timestamp = now();
      const replacementId = newLocalId();
      await this.db.runAsync('UPDATE tasks SET remote_version = ?, remote_outcome = ? WHERE owner_id = ? AND local_id = ?', [remoteVersion, 'none', ownerId, operation.task_local_id]);
      await this.db.runAsync('UPDATE sync_operations SET state = ?, last_error = NULL, updated_at = ? WHERE owner_id = ? AND operation_id = ?', ['confirmed', timestamp, ownerId, operationId]);
      await this.db.runAsync(
        `INSERT INTO sync_operations (operation_id, owner_id, task_local_id, kind, payload, expected_version, state, attempts, last_error, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, NULL, ?, ?)`,
        [replacementId, ownerId, operation.task_local_id, operation.kind, operation.payload, remoteVersion.toString(), timestamp, timestamp]
      );
      const replacement = await this.db.getFirstAsync<SyncOperationRow>('SELECT * FROM sync_operations WHERE owner_id = ? AND operation_id = ?', [ownerId, replacementId]);
      if (!replacement) throw new Error('Replacement sync operation could not be stored.');
      return rowToOperation(replacement);
    });
  }
  async confirmCreate(ownerId: string, localId: string, task: Task): Promise<LocalTask> {
    return this.db.withTransactionAsync(async () => {
      const current = await this.db.getFirstAsync<TaskRow>('SELECT * FROM tasks WHERE owner_id = ? AND local_id = ?', [ownerId, localId]);
      if (!current) throw new Error('Synced task could not be stored locally.');
      const deleted = current.deleted_at !== null;
      await this.db.runAsync(
        `UPDATE tasks SET remote_id = ?, title = ?, description = ?, completed = ?, latitude = ?, longitude = ?, location_accuracy = ?, location_timestamp = ?, created_at = ?, updated_at = ?, remote_version = ?, sync_state = ?, remote_outcome = 'none' WHERE owner_id = ? AND local_id = ?`,
        [task.id, task.title, task.description, task.completed ? 1 : 0, task.latitude, task.longitude, task.locationAccuracy, task.locationTimestamp, task.createdAt, task.updatedAt, task.version, deleted ? 'pending_delete' : 'clean', ownerId, localId]
      );
      if (deleted) {
        const operationId = newLocalId();
        const timestamp = now();
        await this.db.runAsync(
          `INSERT INTO sync_operations (operation_id, owner_id, task_local_id, kind, payload, expected_version, state, attempts, last_error, created_at, updated_at) VALUES (?, ?, ?, 'delete', '{}', ?, 'pending', 0, NULL, ?, ?)`,
          [operationId, ownerId, localId, task.version.toString(), timestamp, timestamp]
        );
      }
      const result = await this.find(ownerId, localId);
      if (!result) throw new Error('Synced task could not be stored locally.');
      return result;
    });
  }

  updateOperation(ownerId: string, operationId: string, state: SyncOperationState, error: string | null = null, retryAfterAt: string | null = null) {
    return this.db.runAsync('UPDATE sync_operations SET state = ?, last_error = ?, retry_after_at = ?, attempts = attempts + CASE WHEN ? = \'sending\' THEN 0 ELSE 1 END, updated_at = ? WHERE owner_id = ? AND operation_id = ?', [state, error, retryAfterAt, state, now(), ownerId, operationId]);
  }
}
