import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { LocalTaskRepository, type LocalTaskInput } from '../task-repository';
import type { SqliteExecutor, SqliteRunResult, SqlValue } from '../sqlite';
import type { Task } from '../tasks';

class NodeSqliteExecutor implements SqliteExecutor {
  constructor(readonly database: DatabaseSync) {}

  async execAsync(source: string): Promise<void> {
    this.database.exec(source);
  }

  async runAsync(source: string, params: SqlValue[]): Promise<SqliteRunResult> {
    const result = this.database.prepare(source).run(...params);
    return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
  }

  async getFirstAsync<T>(source: string, params: SqlValue[] = []): Promise<T | null> {
    const row = this.database.prepare(source).get(...params) as T | undefined;
    return row ?? null;
  }

  async getAllAsync<T>(source: string, params: SqlValue[] = []): Promise<T[]> {
    return this.database.prepare(source).all(...params) as T[];
  }

  async withTransactionAsync<T>(task: () => Promise<T>): Promise<T> {
    this.database.exec('BEGIN');
    try {
      const result = await task();
      this.database.exec('COMMIT');
      return result;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }
}

class FailOnRunNumber implements SqliteExecutor {
  private runs = 0;

  constructor(private readonly delegate: SqliteExecutor, private readonly failingRun: number) {}

  execAsync(source: string) {
    return this.delegate.execAsync(source);
  }

  runAsync(source: string, params: SqlValue[]) {
    this.runs += 1;
    if (this.runs === this.failingRun) return Promise.reject(new Error('Injected SQLite failure.'));
    return this.delegate.runAsync(source, params);
  }

  getFirstAsync<T>(source: string, params?: SqlValue[]) {
    return this.delegate.getFirstAsync<T>(source, params);
  }

  getAllAsync<T>(source: string, params?: SqlValue[]) {
    return this.delegate.getAllAsync<T>(source, params);
  }

  withTransactionAsync<T>(task: () => Promise<T>) {
    return this.delegate.withTransactionAsync(task);
  }
}

const task = (id: string, title: string): Task => ({
  id, title, description: null, completed: false,
  latitude: null, longitude: null, locationAccuracy: null, locationTimestamp: null,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', version: 0
});
const input: LocalTaskInput = {
  title: 'Tarea local', description: 'Sin conexión', completed: false,
  latitude: null, longitude: null, locationAccuracy: null, locationTimestamp: null
};

let directory: string;
let database: DatabaseSync;
let repository: LocalTaskRepository;

beforeEach(async () => {
  directory = mkdtempSync(join(process.cwd(), 'tmp-task-db-'));
  database = new DatabaseSync(join(directory, 'tasks.sqlite'));
  repository = new LocalTaskRepository(new NodeSqliteExecutor(database));
  await repository.initialize();
});

afterEach(() => {
  database.close();
  rmSync(directory, { recursive: true, force: true });
});

describe('LocalTaskRepository on real SQLite', () => {
  it('runs idempotent migrations and persists CRUD across connections', async () => {
    await repository.initialize();
    const created = await repository.createOffline('user-a', input);
    expect(created.syncState).toBe('pending_create');
    expect(await repository.list('user-a')).toHaveLength(1);

    const file = join(directory, 'tasks.sqlite');
    database.close();
    database = new DatabaseSync(file);
    repository = new LocalTaskRepository(new NodeSqliteExecutor(database));
    await repository.initialize();
    const reopened = await repository.list('user-a');
    expect(reopened[0]).toMatchObject({ id: created.id, title: input.title, syncState: 'pending_create' });

    const updated = await repository.updateOffline('user-a', created.id, { completed: true, title: 'Completada' });
    expect(updated.completed).toBe(true);
    expect(updated.title).toBe('Completada');
  });

  it('isolates reads, updates, and deletes by owner', async () => {
    const alice = await repository.createOffline('alice', input);
    const bob = await repository.createOffline('bob', { ...input, title: 'Bob' });

    expect(await repository.find('bob', alice.id)).toBeNull();
    await expect(repository.updateOffline('bob', alice.id, { title: 'No permitido' })).rejects.toThrow('not found');
    expect(await repository.markDelete('bob', alice.id)).toBeNull();
    expect(await repository.find('alice', alice.id)).not.toBeNull();
    expect(await repository.find('bob', bob.id)).not.toBeNull();
  });

  it('deduplicates remote records and preserves pending local mutations', async () => {
    const remote = task('remote-1', 'Servidor');
    const stored = await repository.saveRemote('user-a', remote);
    await repository.saveRemote('user-a', { ...remote, title: 'Servidor actualizado' });
    expect(await repository.list('user-a')).toHaveLength(1);

    await repository.updateOffline('user-a', stored.id, { title: 'Edición sin conexión' });
    const merged = await repository.mergeRemote('user-a', [{ ...remote, title: 'Respuesta antigua' }]);
    expect(merged[0]).toMatchObject({ title: 'Edición sin conexión', syncState: 'pending_update' });
    const guarded = await repository.saveRemoteIfUnchanged('user-a', stored.localId, stored.localUpdatedAt, { ...remote, version: 1, title: 'Servidor nuevo' });
    expect(guarded).toMatchObject({ applied: false, task: { title: 'Edición sin conexión', remoteVersion: 1, syncState: 'pending_update' } });

    await repository.markDelete('user-a', stored.id);
    expect(await repository.list('user-a')).toHaveLength(0);
    expect(await repository.pending('user-a')).toEqual([expect.objectContaining({ syncState: 'pending_delete', remoteId: 'remote-1' })]);
    await repository.mergeRemote('user-a', [remote]);
    expect(await repository.pending('user-a')).toHaveLength(1);
  });

  it('rolls back a multi-record merge when a SQLite write fails', async () => {
    const first = task('remote-1', 'Primera');
    const second = task('remote-2', 'Segunda');
    const delegate = new NodeSqliteExecutor(database);
    const failingRepository = new LocalTaskRepository(new FailOnRunNumber(delegate, 2));
    await failingRepository.initialize();

    await expect(failingRepository.mergeRemote('user-a', [first, second])).rejects.toThrow('Injected SQLite failure');
    expect(await repository.list('user-a')).toHaveLength(0);
  });
  it('persists completion, reopening, and file metadata after reopening SQLite', async () => {
    const stored = await repository.saveRemote('user-a', task('remote-3', 'Persistente'));
    const reopened = await repository.updateOffline('user-a', stored.id, { completed: true });
    expect(reopened.completed).toBe(true);
    const reopenedAgain = await repository.updateOffline('user-a', stored.id, { completed: false });
    expect(reopenedAgain.completed).toBe(false);
    const file = await repository.saveLocalImage('user-a', stored.localId, 'file:///persistent.jpg');
    expect(file.uri).toBe('file:///persistent.jpg');
    database.close();
    database = new DatabaseSync(join(directory, 'tasks.sqlite'));
    repository = new LocalTaskRepository(new NodeSqliteExecutor(database));
    await repository.initialize();
    expect(await repository.find('user-a', stored.localId)).toMatchObject({ completed: false });
    expect(await repository.listLocalImages('user-a')).toEqual([expect.objectContaining({ taskLocalId: stored.localId, uri: file.uri })]);
  });

  it('rejects file metadata for another owner task', async () => {
    const alice = await repository.createOffline('alice', input);
    await expect(repository.saveLocalImage('bob', alice.localId, 'file:///leak.jpg')).rejects.toThrow('not found');
    expect(await repository.listLocalImages('alice')).toHaveLength(0);
  });
  it('persists stable operation metadata across reopening', async () => {
    const stored = await repository.createOffline('user-a', input);
    const operation = await repository.enqueueOperation('user-a', stored.localId, 'create', JSON.stringify(input));
    expect(operation.state).toBe('pending');
    const retryAt = '2026-01-01T00:00:05.000Z';
    await repository.updateOperation('user-a', operation.operationId, 'pending', 'Network unavailable.', retryAt);
    database.close();
    database = new DatabaseSync(join(directory, 'tasks.sqlite'));
    repository = new LocalTaskRepository(new NodeSqliteExecutor(database));
    await repository.initialize();
    expect(await repository.listOperations('user-a')).toEqual([expect.objectContaining({ operationId: operation.operationId, payload: JSON.stringify(input), state: 'pending', retryAfterAt: retryAt })]);
  });

  it('rebases a conflict into a new operation without replacing local changes', async () => {
    const stored = await repository.saveRemote('user-a', { ...task('remote-4', 'Servidor'), version: 3 });
    const edited = await repository.updateOffline('user-a', stored.localId, { title: 'Mi cambio' });
    const operation = await repository.enqueueOperation('user-a', edited.localId, 'update', JSON.stringify({ title: 'Mi cambio' }), '3');
    await repository.updateOperation('user-a', operation.operationId, 'conflict', 'Version conflict.');

    const replacement = await repository.requeueOperation('user-a', operation.operationId, 4);
    expect(replacement).toMatchObject({ taskLocalId: edited.localId, kind: 'update', expectedVersion: '4', state: 'pending' });
    expect(await repository.find('user-a', edited.localId)).toMatchObject({ title: 'Mi cambio', remoteVersion: 4, syncState: 'pending_update', remoteOutcome: 'none' });
    expect(await repository.listOperations('user-a')).toEqual([expect.objectContaining({ operationId: replacement.operationId, state: 'pending' })]);
  });

  it('resolves server version atomically while preserving newer local operations', async () => {
    const stored = await repository.saveRemote('user-a', { ...task('remote-5', 'Servidor'), version: 5 });
    const edited = await repository.updateOffline('user-a', stored.localId, { title: 'Cambio local' });
    const conflict = await repository.enqueueOperation('user-a', edited.localId, 'update', JSON.stringify({ title: 'Cambio local' }), '5');
    await repository.updateOperation('user-a', conflict.operationId, 'conflict', 'Version conflict.');
    const newerTask = await repository.updateOffline('user-a', edited.localId, { description: 'Edición posterior' });
    await repository.enqueueOperation('user-a', newerTask.localId, 'update', JSON.stringify({ description: 'Edición posterior' }), '5');

    const resolved = await repository.resolveWithRemote('user-a', conflict.operationId, { ...task('remote-5', 'Servidor actualizado'), version: 6 });
    expect(resolved).toMatchObject({ title: 'Cambio local', description: 'Edición posterior', remoteVersion: 6, syncState: 'pending_update' });
    expect(await repository.listOperations('user-a')).toEqual([expect.objectContaining({ kind: 'update', state: 'pending' })]);
  });

  it('imports a batch atomically with owner-scoped provenance deduplication', async () => {
    const record = { provider: 'jsonplaceholder', externalId: '1', title: 'Importada', completed: false, description: null };
    const result = await repository.importTasks('alice', [record, record, { ...record, externalId: '2' }]);
    expect(result).toMatchObject({ imported: 2, skipped: 1 });
    expect(result.tasks).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceProvider: 'jsonplaceholder', sourceExternalId: '1', syncState: 'pending_create' }),
      expect.objectContaining({ sourceProvider: 'jsonplaceholder', sourceExternalId: '2', syncState: 'pending_create' })
    ]));
    await expect(repository.importTasks('alice', [record])).resolves.toMatchObject({ imported: 0, skipped: 1 });
    await expect(repository.importTasks('bob', [record])).resolves.toMatchObject({ imported: 1, skipped: 0 });
    expect(await repository.listOperations('alice')).toHaveLength(2);
  });
});
