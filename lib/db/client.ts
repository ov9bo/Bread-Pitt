import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as schema from "./schema";

const dbPath = resolve(process.cwd(), "data", "crustopher.db");
mkdirSync(dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("synchronous = NORMAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("temp_store = MEMORY");
sqlite.pragma("mmap_size = 268435456");

export const db = drizzle(sqlite, { schema });
export const rawDb = sqlite;
export type DB = typeof db;
