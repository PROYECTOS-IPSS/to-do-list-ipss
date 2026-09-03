import type { Task } from './tasks';
import { migrateDatabase, type SqliteExecutor } from './sqlite';

export type SyncState = 'clean' | 'pending_create' | 'pending_update' | 'pending_delete';
export type RemoteOutcome = 'none' | 'unknown';

export type LocalTask = Omit<Task, 'id'> & {
  id: string;
  localId: string;
  ownerId: string;
  remoteId: string | null;
  syncState: SyncState;
  remoteOutcome: RemoteOutcome;
  localUpdatedAt: string;
  deletedAt: string | null;
};

export type LocalTaskInput = Pick<Task, 'title' | 'description' | 'completed' | 'latitude' | 'longitude' | 'locationAccuracy' | 'locationTimestamp'>;
export type LocalFile = { id: string; ownerId: string; taskLocalId: string; kind: 'image'; uri: string; createdAt: string };

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
  local_updated_at: string;
  sync_state: SyncState;
  remote_outcome: RemoteOutcome;
  deleted_at: string | null;
};

type FileRow = { id: string; owner_id: string; task_local_id: string; kind: 'image'; uri: string; created_at: string };

const now = () => new Date().toISOString();
// ponytail: timestamp plus random suffix is enough for local IDs; replace with a UUID provider if collision rate matters.
const newLocalId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const rowToTask = (row: TaskRow): LocalTask => ({
  id: row.local_id,
  localId: row.local_id,
  ownerId: row.owner_id,
  remoteId: row.remote_id,
  title: row.title,
  description: row.description,
  completed: row.completed === 1,
  latitude: row.latitude,
  longitude: row.longitude,
  locationAccuracy: row.location_accuracy,
  locationTimestamp: row.location_timestamp,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
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
        await this.db.runAsync('DELETE FROM tasks WHERE owner_id = ? AND local_id = ?', [ownerId, localId]);
        return null;
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
    if (existing && existing.sync_state !== 'clean' && preservePending) return rowToTask(existing);
    const timestamp = now();
    const input: LocalTaskInput = task;
    if (existing) {
      await this.db.runAsync(
        `UPDATE tasks SET title = ?, description = ?, completed = ?, latitude = ?, longitude = ?, location_accuracy = ?, location_timestamp = ?, created_at = ?, updated_at = ?, local_updated_at = ?, sync_state = 'clean', remote_outcome = 'none', deleted_at = NULL WHERE owner_id = ? AND local_id = ?`,
        [input.title, input.description, input.completed ? 1 : 0, input.latitude, input.longitude, input.locationAccuracy, input.locationTimestamp, task.createdAt, task.updatedAt, timestamp, ownerId, existing.local_id]
      );
      const updated = await this.find(ownerId, existing.local_id);
      if (!updated) throw new Error('Remote task could not be updated locally.');
      return updated;
    }
    const localId = newLocalId();
    await this.db.runAsync(
      `INSERT INTO tasks (local_id, owner_id, remote_id, title, description, completed, latitude, longitude, location_accuracy, location_timestamp, created_at, updated_at, local_updated_at, sync_state, remote_outcome, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      values(ownerId, input, localId, task.id, 'clean', task.createdAt, task.updatedAt, timestamp, 'none')
    );
    const created = await this.find(ownerId, localId);
    if (!created) throw new Error('Remote task could not be stored locally.');
    return created;
  }

  async saveRemote(ownerId: string, task: Task): Promise<LocalTask> {
    return this.db.withTransactionAsync(() => this.upsertRemote(ownerId, task, false));
  }

  async mergeRemote(ownerId: string, tasks: Task[]): Promise<LocalTask[]> {
    return this.db.withTransactionAsync(async () => {
      for (const task of tasks) await this.upsertRemote(ownerId, task, true);
      return this.list(ownerId);
    });
  }

  async saveLocalImage(ownerId: string, taskLocalId: string, uri: string): Promise<LocalFile> {
    return this.db.withTransactionAsync(async () => {
      const task = await this.db.getFirstAsync<{ local_id: string }>('SELECT local_id FROM tasks WHERE owner_id = ? AND local_id = ?', [ownerId, taskLocalId]);
      if (!task) throw new Error('Local task not found.');
      const timestamp = now();
      await this.db.runAsync(
        `INSERT INTO task_files (id, owner_id, task_local_id, kind, uri, created_at) VALUES (?, ?, ?, 'image', ?, ?) ON CONFLICT(owner_id, task_local_id, kind) DO UPDATE SET uri = excluded.uri, created_at = excluded.created_at`,
        [newLocalId(), ownerId, taskLocalId, uri, timestamp]
      );
      const row = await this.db.getFirstAsync<FileRow>("SELECT * FROM task_files WHERE owner_id = ? AND task_local_id = ? AND kind = 'image'", [ownerId, taskLocalId]);
      if (!row) throw new Error('Local image could not be stored.');
      return rowToFile(row);
    });
  }

  async listLocalImages(ownerId: string): Promise<LocalFile[]> {
    const rows = await this.db.getAllAsync<FileRow>("SELECT * FROM task_files WHERE owner_id = ? AND kind = 'image'", [ownerId]);
    return rows.map(rowToFile);
  }

  async deleteLocalFiles(ownerId: string, taskLocalId: string): Promise<string[]> {
    return this.db.withTransactionAsync(async () => {
      const rows = await this.db.getAllAsync<{ uri: string }>('SELECT uri FROM task_files WHERE owner_id = ? AND task_local_id = ?', [ownerId, taskLocalId]);
      await this.db.runAsync('DELETE FROM task_files WHERE owner_id = ? AND task_local_id = ?', [ownerId, taskLocalId]);
      return rows.map((row) => row.uri);
    });
  }
}
