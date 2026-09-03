export type SqlValue = string | number | null;
export type SqliteRunResult = { changes: number; lastInsertRowId: number };

export interface SqliteExecutor {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: SqlValue[]): Promise<SqliteRunResult>;
  getFirstAsync<T>(source: string, params?: SqlValue[]): Promise<T | null>;
  getAllAsync<T>(source: string, params?: SqlValue[]): Promise<T[]>;
  withTransactionAsync<T>(task: () => Promise<T>): Promise<T>;
}

export const DATABASE_VERSION = 1;

const migration = `
CREATE TABLE IF NOT EXISTS tasks (
  local_id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL,
  remote_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  latitude REAL,
  longitude REAL,
  location_accuracy REAL,
  location_timestamp TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  local_updated_at TEXT NOT NULL,
  sync_state TEXT NOT NULL CHECK (sync_state IN ('clean', 'pending_create', 'pending_update', 'pending_delete')),
  remote_outcome TEXT NOT NULL DEFAULT 'none' CHECK (remote_outcome IN ('none', 'unknown')),
  deleted_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS tasks_owner_remote_id ON tasks(owner_id, remote_id);
CREATE INDEX IF NOT EXISTS tasks_owner_updated_at ON tasks(owner_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS task_files (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL,
  task_local_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('image')),
  uri TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(owner_id, task_local_id, kind)
);
CREATE INDEX IF NOT EXISTS task_files_owner_task ON task_files(owner_id, task_local_id);
`;

export async function migrateDatabase(db: SqliteExecutor): Promise<void> {
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    const currentVersion = row?.user_version ?? 0;
    if (currentVersion < 1) {
      await db.execAsync(migration);
      await db.execAsync('PRAGMA user_version = 1');
    }
  });
}
