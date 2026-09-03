import * as SQLite from 'expo-sqlite';
import { LocalTaskRepository } from './task-repository';
import { TaskStore } from './task-store';
import type { SqliteExecutor, SqliteRunResult, SqlValue } from './sqlite';

const databaseName = 'task-manager.db';

class ExpoSqliteExecutor implements SqliteExecutor {
  constructor(private readonly db: SQLite.SQLiteDatabase) {}

  execAsync(source: string) {
    return this.db.execAsync(source);
  }

  runAsync(source: string, params: SqlValue[]): Promise<SqliteRunResult> {
    return this.db.runAsync(source, params);
  }

  getFirstAsync<T>(source: string, params: SqlValue[] = []) {
    return this.db.getFirstAsync<T>(source, params);
  }

  getAllAsync<T>(source: string, params: SqlValue[] = []) {
    return this.db.getAllAsync<T>(source, params);
  }

  async withTransactionAsync<T>(task: () => Promise<T>): Promise<T> {
    let result!: T;
    await this.db.withTransactionAsync(async () => {
      result = await task();
    });
    return result;
  }
}

let repositoryPromise: Promise<LocalTaskRepository> | undefined;
let storePromise: Promise<TaskStore> | undefined;

export function getTaskRepository(): Promise<LocalTaskRepository> {
  repositoryPromise ??= SQLite.openDatabaseAsync(databaseName).then(async (db) => {
    const repository = new LocalTaskRepository(new ExpoSqliteExecutor(db));
    await repository.initialize();
    return repository;
  });
  return repositoryPromise;
}

export function getTaskStore(): Promise<TaskStore> {
  storePromise ??= getTaskRepository().then((repository) => new TaskStore(repository));
  return storePromise;
}
