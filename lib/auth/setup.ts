import "server-only";
import { db } from "@/lib/db/client";
import { setupTokens, users } from "@/lib/db/schema";
import { and, eq, gt } from "drizzle-orm";
import { nanoid } from "nanoid";

const SETUP_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export async function adminExists(): Promise<boolean> {
  const rows = await db.select({ id: users.id }).from(users).limit(1);
  return rows.length > 0;
}

export async function getOrCreateSetupToken(): Promise<string> {
  const now = new Date();
  const valid = await db
    .select()
    .from(setupTokens)
    .where(and(eq(setupTokens.consumed, false), gt(setupTokens.expiresAt, now)))
    .limit(1);
  if (valid[0]) return valid[0].token;

  const token = nanoid(40);
  await db.insert(setupTokens).values({
    token,
    expiresAt: new Date(Date.now() + SETUP_TOKEN_TTL_MS),
  });
  return token;
}

export async function consumeSetupToken(token: string): Promise<boolean> {
  const [row] = await db.select().from(setupTokens).where(eq(setupTokens.token, token));
  if (!row || row.consumed || row.expiresAt.getTime() < Date.now()) return false;
  await db.update(setupTokens).set({ consumed: true }).where(eq(setupTokens.token, token));
  return true;
}
