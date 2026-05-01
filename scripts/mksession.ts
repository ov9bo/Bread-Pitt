import { readFileSync } from "node:fs";
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = /^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
import { db } from "../lib/db/client";
import { users, sessions } from "../lib/db/schema";
import { SignJWT } from "jose";
import { nanoid } from "nanoid";

async function main() {
  const [user] = db.select().from(users).all();
  if (!user) { console.error("no user"); process.exit(1); }
  const sessionId = nanoid(24);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  db.insert(sessions).values({ id: sessionId, userId: user.id, expiresAt }).run();
  const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
  const token = await new SignJWT({ sessionId, userId: user.id })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(secret);
  console.log(token);
}
main();
