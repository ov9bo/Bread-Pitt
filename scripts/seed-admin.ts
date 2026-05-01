import { db } from "../lib/db/client";
import { users, preferences } from "../lib/db/schema";
import bcrypt from "bcryptjs";

const password = process.argv[2];
const displayName = process.argv[3] ?? "Baker";
if (!password) {
  console.error("usage: pnpm seed:admin <password> [display-name]");
  process.exit(1);
}

const existing = db.select().from(users).all();
if (existing.length > 0) {
  console.error("✗ admin already exists");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
const [user] = db
  .insert(users)
  .values({ passwordHash: hash, displayName })
  .returning()
  .all();
db.insert(preferences).values({ userId: user.id }).run();

console.log("✓ admin user created", { id: user.id, displayName });
