import "server-only";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const PAIRING_TTL_MS = 15 * 60 * 1000; // 15 min

export async function generatePairingCode(userId: string): Promise<string> {
  // 6-digit code, padded
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await db
    .update(users)
    .set({
      telegramPairingCode: code,
      telegramPairingExpiresAt: new Date(Date.now() + PAIRING_TTL_MS),
    })
    .where(eq(users.id, userId));
  return code;
}

export async function unlinkTelegram(userId: string): Promise<void> {
  await db
    .update(users)
    .set({
      telegramChatId: null,
      telegramPairingCode: null,
      telegramPairingExpiresAt: null,
    })
    .where(eq(users.id, userId));
}
