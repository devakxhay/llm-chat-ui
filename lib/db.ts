import Database from "better-sqlite3";
import path from "path";

const dbPath = path.resolve(process.cwd(), "ilsa.db");

const globalForDb = globalThis as unknown as {
  db: Database.Database | undefined;
};

export const db = globalForDb.db ?? new Database(dbPath);

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}

// Enable WAL journal mode for better performance
db.pragma("journal_mode = WAL");

// Ensure the KV table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`);
