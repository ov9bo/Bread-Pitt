import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, rawDb } from "../lib/db/client";

migrate(db, { migrationsFolder: "./drizzle" });

// FTS5 virtual table for guide_sections — Drizzle doesn't model virtual tables natively.
rawDb.exec(`
  CREATE VIRTUAL TABLE IF NOT EXISTS guide_search USING fts5(
    slug UNINDEXED,
    title,
    body,
    tokenize = 'porter unicode61'
  );
`);

console.log("✓ migrations applied");
