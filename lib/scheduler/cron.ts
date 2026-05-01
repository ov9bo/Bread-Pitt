import "server-only";
import cron from "node-cron";
import { db } from "@/lib/db/client";
import { reminders, users, preferences } from "@/lib/db/schema";
import { and, eq, lte, asc } from "drizzle-orm";
import { sendMessage } from "@/lib/telegram/bot";
import { renderReminder } from "@/lib/telegram/templates";

let started = false;

export function startScheduler() {
  if (started) return;
  if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== "nodejs") return;
  started = true;

  // Boot reconciliation — coalesce missed reminders (those still pending and overdue).
  reconcileOnBoot().catch((e) => console.error("[scheduler] boot reconcile failed", e));

  cron.schedule("*/30 * * * * *", () => {
    tick().catch((e) => console.error("[scheduler] tick failed", e));
  });

  console.log("[scheduler] started — 30s tick");
}

async function reconcileOnBoot() {
  const overdue = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.status, "pending"), lte(reminders.fireAt, new Date(Date.now() - 5 * 60_000))))
    .orderBy(asc(reminders.fireAt));

  if (overdue.length === 0) return;

  // Group by user, send a coalesced digest
  const byUser = new Map<string, typeof overdue>();
  for (const r of overdue) {
    const arr = byUser.get(r.userId) ?? [];
    arr.push(r);
    byUser.set(r.userId, arr);
  }

  for (const [userId, list] of byUser) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user?.telegramChatId) continue;

    const lines = list
      .slice(0, 8)
      .map((r) => `• ${r.title}`)
      .join("\n");
    const more = list.length > 8 ? `\n…and ${list.length - 8} more` : "";

    try {
      await sendMessage(
        user.telegramChatId,
        `<b>You missed ${list.length} reminder${list.length === 1 ? "" : "s"} while I was offline</b>\n${lines}${more}`
      );
      await db
        .update(reminders)
        .set({ status: "sent", sentAt: new Date() })
        .where(
          and(
            eq(reminders.userId, userId),
            eq(reminders.status, "pending"),
            lte(reminders.fireAt, new Date(Date.now() - 5 * 60_000))
          )
        );
    } catch (e) {
      console.error("[scheduler] failed to send digest", e);
    }
  }
}

async function tick() {
  const due = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.status, "pending"), lte(reminders.fireAt, new Date())))
    .orderBy(asc(reminders.fireAt))
    .limit(50);

  for (const r of due) {
    await dispatchOne(r.id);
  }
}

async function dispatchOne(reminderId: string) {
  const [r] = await db.select().from(reminders).where(eq(reminders.id, reminderId));
  if (!r || r.status !== "pending") return;

  const [user] = await db.select().from(users).where(eq(users.id, r.userId));
  if (!user) return;

  // Quiet hours
  const [pref] = await db.select().from(preferences).where(eq(preferences.userId, r.userId));
  if (pref && pref.notificationsEnabled === false) {
    await db.update(reminders).set({ status: "cancelled" }).where(eq(reminders.id, r.id));
    return;
  }

  if (pref && isInQuietHours(new Date(), pref.quietHoursStart, pref.quietHoursEnd)) {
    const next = nextAllowedTime(new Date(), pref.quietHoursStart, pref.quietHoursEnd);
    await db.update(reminders).set({ fireAt: next }).where(eq(reminders.id, r.id));
    return;
  }

  if (!user.telegramChatId) {
    // No channel — mark sent so it doesn't loop
    await db
      .update(reminders)
      .set({ status: "failed", lastError: "No Telegram chat linked", sentAt: new Date() })
      .where(eq(reminders.id, r.id));
    return;
  }

  try {
    await sendMessage(
      user.telegramChatId,
      renderReminder(r.title, r.body, r.deepLink ?? undefined, process.env.PUBLIC_BASE_URL)
    );
    await db
      .update(reminders)
      .set({ status: "sent", sentAt: new Date(), attempts: r.attempts + 1 })
      .where(eq(reminders.id, r.id));
  } catch (e) {
    const attempts = r.attempts + 1;
    if (attempts >= 3) {
      await db
        .update(reminders)
        .set({ status: "failed", attempts, lastError: String(e) })
        .where(eq(reminders.id, r.id));
    } else {
      const backoffMs = 60_000 * Math.pow(2, attempts);
      await db
        .update(reminders)
        .set({ attempts, fireAt: new Date(Date.now() + backoffMs), lastError: String(e) })
        .where(eq(reminders.id, r.id));
    }
  }
}

function isInQuietHours(now: Date, startH: number, endH: number): boolean {
  const h = now.getHours();
  if (startH === endH) return false;
  if (startH < endH) return h >= startH && h < endH;
  // overnight (e.g. 22 → 7)
  return h >= startH || h < endH;
}

function nextAllowedTime(now: Date, startH: number, endH: number): Date {
  const out = new Date(now);
  out.setMinutes(0, 0, 0);
  while (isInQuietHours(out, startH, endH)) {
    out.setHours(out.getHours() + 1);
  }
  return out;
}
