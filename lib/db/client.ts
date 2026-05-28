import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

const DEFAULT_PATH = "./.data/typelens.db";

type Cached = { db: Db; sqlite: Database.Database; migratedAt: number };
const globalForDb = globalThis as unknown as { _typelensDb?: Cached };

function resolveDbPath(): string {
  return process.env.TYPELENS_DB_PATH ?? DEFAULT_PATH;
}

function ensureParentDir(dbPath: string): void {
  if (dbPath === ":memory:") return;
  const dir = path.dirname(path.resolve(dbPath));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function migrationsFolder(): string {
  return path.join(process.cwd(), "drizzle");
}

export function getDb(): Db {
  if (globalForDb._typelensDb) return globalForDb._typelensDb.db;

  const dbPath = resolveDbPath();
  ensureParentDir(dbPath);
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  const db = drizzle(sqlite, { schema });

  const folder = migrationsFolder();
  if (!existsSync(folder)) {
    // A missing folder means the deploy bundle didn't ship the migrations —
    // running on would leave the DB with no tables and 500 on first write.
    // Fail loudly here so the cause is obvious in logs instead of cryptic
    // "no such table" errors later.
    throw new Error(
      `Drizzle migrations folder not found at ${folder} (cwd=${process.cwd()}). ` +
        `The deploy bundle is missing drizzle/ — see next.config.ts outputFileTracingIncludes.`,
    );
  }
  migrate(db, { migrationsFolder: folder });

  globalForDb._typelensDb = { db, sqlite, migratedAt: Date.now() };
  return db;
}

/** Open an in-memory DB and migrate it. Test helper. */
export function createTestDb(): { db: Db; sqlite: Database.Database; close: () => void } {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  const folder = migrationsFolder();
  if (existsSync(folder)) {
    migrate(db, { migrationsFolder: folder });
  }
  return { db, sqlite, close: () => sqlite.close() };
}

/** Test helper: drop the cached singleton so the next getDb() call rebuilds it. */
export function _resetDbForTests(): void {
  if (globalForDb._typelensDb) {
    try {
      globalForDb._typelensDb.sqlite.close();
    } catch {
      // already closed
    }
    delete globalForDb._typelensDb;
  }
}
