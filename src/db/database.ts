import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

let connection: Database.Database | null = null;

const projectRoot = path.resolve(process.cwd());

export const getDatabasePath = () => {
  if (process.env.DATABASE_PATH) return process.env.DATABASE_PATH;
  if (process.env.NODE_ENV === 'test') return ':memory:';
  return path.join(projectRoot, 'data', 'dhani-finance.sqlite');
};

export const getDb = () => {
  if (connection) return connection;

  const dbPath = getDatabasePath();
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  connection = new Database(dbPath);
  connection.pragma('journal_mode = WAL');
  connection.pragma('foreign_keys = ON');
  return connection;
};

export const runMigrations = () => {
  const db = getDb();
  const migrationsDir = path.join(projectRoot, 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const hasMigration = db.prepare('SELECT 1 FROM schema_migrations WHERE version = ?');
  const insertMigration = db.prepare('INSERT INTO schema_migrations (version) VALUES (?)');

  const migrate = db.transaction(() => {
    for (const file of files) {
      if (hasMigration.get(file)) continue;
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8').trim();
      if (sql) db.exec(sql);
      insertMigration.run(file);
    }
  });

  migrate();
};

export const closeDb = () => {
  connection?.close();
  connection = null;
};
