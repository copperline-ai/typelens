/**
 * Standalone migration entry-point — invoke with `bun run db:migrate`.
 *
 * Runtime migrations are applied automatically on the first getDb() call
 * (see lib/db/client.ts). This script exists for ops workflows that want to
 * pre-migrate a fresh database, or to fail loudly during a deploy step before
 * the app starts serving traffic.
 */
import { getDb } from "./client";

getDb();
console.log("Migrations applied at", process.env.TYPELENS_DB_PATH ?? "./.data/typelens.db");
