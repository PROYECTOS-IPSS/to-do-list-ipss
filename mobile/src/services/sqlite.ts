export type SqlValue = string | number | null;
export type SqliteRunResult = { changes: number; lastInsertRowId: number };

export interface SqliteExecutor {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: SqlValue[]): Promise<SqliteRunResult>;
  getFirstAsync<T>(source: string, params?: SqlValue[]): Promise<T | null>;
  getAllAsync<T>(source: string, params?: SqlValue[]): Promise<T[]>;
  withTransactionAsync<T>(task: () => Promise<T>): Promise<T>;
}

export const DATABASE_VERSION = 3;

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

const migrations: Record<number, string> = {
  1: migration,
  2: `
ALTER TABLE tasks ADD COLUMN remote_version INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS sync_operations (
  operation_id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL,
  task_local_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('create', 'update', 'delete', 'image')),
  payload TEXT NOT NULL,
  expected_version TEXT,
  state TEXT NOT NULL CHECK (state IN ('pending', 'sending', 'confirmed', 'conflict', 'failed', 'review')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sync_operations_owner_state ON sync_operations(owner_id, state, created_at);
`,
  3: `
ALTER TABLE sync_operations ADD COLUMN retry_after_at TEXT;
`
};

export async function migrateDatabase(db: SqliteExecutor): Promise<void> {
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    let currentVersion = row?.user_version ?? 0;
    for (let version = currentVersion + 1; version <= DATABASE_VERSION; version += 1) {
      await db.execAsync(migrations[version]);
      await db.execAsync(`PRAGMA user_version = ${version}`);
      currentVersion = version;
    }
  });
}
